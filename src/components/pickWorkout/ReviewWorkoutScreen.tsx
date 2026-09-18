import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    Animated as RNAnimated,
    Easing as RNEasing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Reanimated, {
    Easing,
    FadeInDown,
    FadeOutLeft,
    FadeOutRight,
    Keyframe,
    LinearTransition,
} from 'react-native-reanimated';
import { fonts } from '../../constants/fonts';
import { PICK_WORKOUT_LAYOUT, WORKOUT_COLORS } from '../../workout/constants';
import { MUSCLE_GROUP_LABELS, MuscleGroup, mapBodyPartToMuscleGroup } from '../../workout/muscleGroups';
import { WorkoutExercise, WorkoutSet } from '../../workout/types';
import { getLastExercisePreviousSets } from '../../services/workoutHistoryService';
import { searchExercises, Exercise } from '../../services/exerciseService';
import { createUniqueId } from '../../workout/workoutSelectors';
import { useAuth } from '../../context/AuthContext';
import { PendingReviewWorkout } from './PickWorkoutScreen';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const MUSCLE_VISUALS: Record<MuscleGroup, { icon: IoniconName; tint: string; bg: string }> = {
    chest: { icon: 'body-outline', tint: '#526EFF', bg: '#EAEEFF' },
    shoulders: { icon: 'barbell-outline', tint: '#F4511E', bg: '#FBE9E7' },
    arms: { icon: 'barbell-outline', tint: '#8E24AA', bg: '#F3E5F5' },
    back: { icon: 'body-outline', tint: '#00897B', bg: '#E0F2F1' },
    core: { icon: 'flame-outline', tint: '#FB8C00', bg: '#FFF3E0' },
    legs: { icon: 'walk-outline', tint: '#3949AB', bg: '#E8EAF6' },
};

const SWAP_DURATION = 250;

/** Cards physically slide from old slot → new slot on the UI thread. */
const cardLayout = LinearTransition.duration(SWAP_DURATION).easing(
    Easing.inOut(Easing.cubic)
);

const cardEnter = FadeInDown.duration(280).easing(Easing.out(Easing.cubic));
const cardExit = FadeOutRight.duration(220).easing(Easing.in(Easing.cubic));
const recExit = FadeOutLeft.duration(200).easing(Easing.in(Easing.cubic));

/** Recommended rows land one at a time after the screen arrives. */
const recEnter = new Keyframe({
    0: {
        opacity: 0,
        transform: [{ translateY: 18 }, { scale: 0.97 }],
    },
    100: {
        opacity: 1,
        transform: [{ translateY: 0 }, { scale: 1 }],
        easing: Easing.out(Easing.cubic),
    },
}).duration(320);

const REVEAL_START_MS = 220;
const REVEAL_STAGGER_MS = 150;

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;
const DEFAULT_REST = 60;
const MAX_SETS = 10;
const MAX_REPS = 30;
const MAX_REST = 600;
const REST_STEP = 15;

function makeSet(
    reps: number,
    previousWeight = 0,
    filledReps = ''
): WorkoutSet {
    return {
        id: createUniqueId('set-'),
        type: 'normal',
        weight: '',
        reps: filledReps,
        completed: false,
        previous: { weight: previousWeight, reps },
    };
}

/** Every exercise defaults to 3 sets, using the user's last weights when available. */
function withDefaults(
    exercise: Pick<WorkoutExercise, 'exerciseId' | 'name'> &
        Partial<Pick<WorkoutExercise, 'sets' | 'restSeconds'>>,
    previousSets?: Array<{ weight: number; reps: number }>
): WorkoutExercise {
    const fromExisting = (exercise.sets ?? [])
        .map((set) => set.previous)
        .filter((snapshot): snapshot is NonNullable<typeof snapshot> => !!snapshot);
    const history = previousSets?.length ? previousSets : fromExisting;
    const fallback = history[history.length - 1];

    return {
        id: createUniqueId('wx-'),
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        note: '',
        restSeconds: DEFAULT_REST,
        sets: Array.from({ length: DEFAULT_SETS }, (_, index) => {
            const previous = history[index] ?? fallback;
            return {
                id: createUniqueId('set-'),
                type: 'normal' as const,
                weight: '',
                reps: '',
                completed: false,
                previous: previous ?? { weight: 0, reps: DEFAULT_REPS },
            };
        }),
    };
}

function repsOf(exercise: WorkoutExercise): number {
    const filled = Number(exercise.sets[0]?.reps);
    if (Number.isFinite(filled) && filled > 0) return filled;
    return exercise.sets[0]?.previous?.reps ?? DEFAULT_REPS;
}

interface ReviewWorkoutScreenProps {
    pending: PendingReviewWorkout;
    onBack: () => void;
    onStartWorkout: (payload: { title: string; exercises: WorkoutExercise[] }) => void;
}

function formatExerciseMeta(exercise: WorkoutExercise): string {
    const muscle =
        mapBodyPartToMuscleGroup(undefined, exercise.name) ??
        ('chest' as MuscleGroup);
    const setCount = exercise.sets.length;
    const reps = exercise.sets[0]?.targetReps ?? exercise.sets[0]?.previous?.reps ?? 8;
    return `${setCount} sets · ${reps} reps · ${MUSCLE_GROUP_LABELS[muscle]}`;
}

export const ReviewWorkoutScreen: React.FC<ReviewWorkoutScreenProps> = ({
    pending,
    onBack,
    onStartWorkout,
}) => {
    const { user } = useAuth();
    // The workout starts empty — the user quick-adds from the recommendations.
    const [added, setAdded] = useState<WorkoutExercise[]>([]);
    const [recommended, setRecommended] = useState<WorkoutExercise[]>(() =>
        pending.exercises.map((exercise) => withDefaults(exercise))
    );
    const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Exercise[]>([]);
    const [searching, setSearching] = useState(false);
    const [editingIds, setEditingIds] = useState<Set<string>>(new Set());
    const [swapping, setSwapping] = useState(false);
    const swapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const ids = recommended.map((item) => item.id);
        const timers = ids.map((id, index) =>
            setTimeout(() => {
                setRevealedIds((current) => {
                    if (current.has(id)) return current;
                    const next = new Set(current);
                    next.add(id);
                    return next;
                });
            }, REVEAL_START_MS + index * REVEAL_STAGGER_MS)
        );

        return () => {
            if (swapTimer.current) clearTimeout(swapTimer.current);
            timers.forEach(clearTimeout);
        };
        // Intro cascade only on first mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleEditing = useCallback((id: string) => {
        Haptics.selectionAsync();
        setEditingIds((current) => {
            const next = new Set(current);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const trimmedQuery = query.trim();
    const isSearching = trimmedQuery.length > 0;

    useEffect(() => {
        if (!isSearching) {
            setResults([]);
            setSearching(false);
            return;
        }

        let cancelled = false;
        setSearching(true);
        const handle = setTimeout(() => {
            searchExercises(trimmedQuery)
                .then((found) => {
                    if (!cancelled) setResults(found);
                })
                .finally(() => {
                    if (!cancelled) setSearching(false);
                });
        }, 250);

        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [trimmedQuery, isSearching]);

    const addExercise = useCallback((exercise: WorkoutExercise) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAdded((current) => [...current, exercise]);
        setRecommended((current) => current.filter((item) => item !== exercise));
    }, []);

    const addFromSearch = useCallback(
        async (exercise: Exercise) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const previousSets = await getLastExercisePreviousSets(
                exercise.id,
                exercise.name,
                user?.id
            );
            const built = withDefaults(
                { exerciseId: exercise.id, name: exercise.name },
                previousSets
            );
            setAdded((current) => [...current, built]);
        },
        [user?.id]
    );

    const updateAdded = useCallback(
        (target: WorkoutExercise, updater: (exercise: WorkoutExercise) => WorkoutExercise) => {
            setAdded((current) =>
                current.map((exercise) => (exercise === target ? updater(exercise) : exercise))
            );
        },
        []
    );

    const changeSets = useCallback(
        (target: WorkoutExercise, delta: number) => {
            Haptics.selectionAsync();
            updateAdded(target, (exercise) => {
                const count = Math.min(MAX_SETS, Math.max(1, exercise.sets.length + delta));
                if (count === exercise.sets.length) return exercise;
                if (count < exercise.sets.length) {
                    return { ...exercise, sets: exercise.sets.slice(0, count) };
                }
                const reps = repsOf(exercise);
                const lastWeight = exercise.sets[exercise.sets.length - 1]?.previous?.weight ?? 0;
                const filledReps = exercise.sets[0]?.reps ?? '';
                const extra = Array.from({ length: count - exercise.sets.length }, () =>
                    makeSet(reps, lastWeight, filledReps)
                );
                return { ...exercise, sets: [...exercise.sets, ...extra] };
            });
        },
        [updateAdded]
    );

    const changeReps = useCallback(
        (target: WorkoutExercise, delta: number) => {
            Haptics.selectionAsync();
            updateAdded(target, (exercise) => {
                const reps = Math.min(MAX_REPS, Math.max(1, repsOf(exercise) + delta));
                return {
                    ...exercise,
                    sets: exercise.sets.map((set) => ({
                        ...set,
                        reps: String(reps),
                        previous: { weight: set.previous?.weight ?? 0, reps },
                    })),
                };
            });
        },
        [updateAdded]
    );

    const changeRest = useCallback(
        (target: WorkoutExercise, delta: number) => {
            Haptics.selectionAsync();
            updateAdded(target, (exercise) => {
                const restSeconds = Math.min(
                    MAX_REST,
                    Math.max(0, (exercise.restSeconds ?? DEFAULT_REST) + delta)
                );
                return { ...exercise, restSeconds };
            });
        },
        [updateAdded]
    );

    const removeExercise = useCallback((exercise: WorkoutExercise) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAdded((current) => current.filter((item) => item !== exercise));
        setRecommended((current) => [exercise, ...current]);
    }, []);

    const moveExercise = useCallback(
        (index: number, direction: -1 | 1) => {
            if (swapping) return;
            const target = index + direction;
            if (target < 0 || target >= added.length) return;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSwapping(true);
            setAdded((current) => {
                const next = [...current];
                [next[index], next[target]] = [next[target], next[index]];
                return next;
            });

            if (swapTimer.current) clearTimeout(swapTimer.current);
            swapTimer.current = setTimeout(() => setSwapping(false), SWAP_DURATION + 40);
        },
        [added.length, swapping]
    );

    const handleStart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onStartWorkout({ title: pending.title, exercises: added });
    };

    const startLabel = added.length > 0 ? 'start workout' : 'start empty workout';
    const visibleRecommended = recommended.filter((item) => revealedIds.has(item.id));

    return (
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
            <ReviewHeader onBack={onBack} />

            <View style={styles.chipRow}>
                {pending.selectedMuscles.map((muscle) => {
                    const visual = MUSCLE_VISUALS[muscle];
                    return (
                        <View
                            key={muscle}
                            style={[styles.chip, { backgroundColor: visual.bg, borderColor: visual.tint }]}
                        >
                            <Ionicons
                                name={visual.icon}
                                size={15}
                                color={visual.tint}
                                style={styles.chipIcon}
                            />
                            <Text style={[styles.chipText, { color: visual.tint }]}>
                                {MUSCLE_GROUP_LABELS[muscle]}
                            </Text>
                        </View>
                    );
                })}
            </View>

            <View style={styles.searchArea}>
                <View style={styles.searchWrap}>
                    <Ionicons
                        name="search"
                        size={20}
                        color={WORKOUT_COLORS.placeholder}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={styles.searchInput}
                        value={query}
                        onChangeText={setQuery}
                        placeholder="search exercises"
                        placeholderTextColor={WORKOUT_COLORS.placeholder}
                        autoCapitalize="none"
                        autoCorrect={false}
                        returnKeyType="search"
                    />
                    {query.length > 0 ? (
                        <TouchableOpacity
                            onPress={() => setQuery('')}
                            style={styles.clearButton}
                            accessibilityRole="button"
                            accessibilityLabel="Clear search"
                            activeOpacity={0.7}
                        >
                            <Ionicons name="close-circle" size={20} color={WORKOUT_COLORS.placeholder} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            <View style={styles.body}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View>
                        {added.length > 0 ? (
                            <Text style={styles.sectionHeading}>your workout</Text>
                        ) : null}
                        {added.map((item, index) => (
                            <AddedCard
                                key={item.id}
                                item={item}
                                isEditing={editingIds.has(item.id)}
                                canMoveUp={index > 0 && !swapping}
                                canMoveDown={index < added.length - 1 && !swapping}
                                onMoveUp={() => moveExercise(index, -1)}
                                onMoveDown={() => moveExercise(index, 1)}
                                onToggleEdit={() => toggleEditing(item.id)}
                                onRemove={() => removeExercise(item)}
                                onChangeSets={(delta) => changeSets(item, delta)}
                                onChangeReps={(delta) => changeReps(item, delta)}
                                onChangeRest={(delta) => changeRest(item, delta)}
                            />
                        ))}
                    </View>

                    <View>
                        {visibleRecommended.length > 0 ? (
                            <Text style={styles.sectionHeading}>recommended</Text>
                        ) : null}
                        {visibleRecommended.map((item) => (
                            <Reanimated.View
                                key={item.id}
                                layout={cardLayout}
                                entering={recEnter}
                                exiting={recExit}
                            >
                                <TouchableOpacity
                                    style={styles.row}
                                    onPress={() => addExercise(item)}
                                    accessibilityRole="button"
                                    accessibilityLabel={`Add ${item.name}`}
                                    activeOpacity={0.6}
                                >
                                    <View style={styles.rowCopy}>
                                        <Text style={styles.rowTitle}>{item.name.toLowerCase()}</Text>
                                        <Text style={styles.rowMeta}>{formatExerciseMeta(item)}</Text>
                                    </View>
                                    <View style={styles.addButton}>
                                        <Ionicons name="add" size={28} color={WORKOUT_COLORS.accent} />
                                    </View>
                                </TouchableOpacity>
                            </Reanimated.View>
                        ))}
                    </View>
                </ScrollView>

                {isSearching ? (
                    <View style={styles.searchOverlay} pointerEvents="box-none">
                        <View style={styles.searchDropdown}>
                            <ScrollView
                                keyboardShouldPersistTaps="handled"
                                nestedScrollEnabled
                                showsVerticalScrollIndicator={false}
                            >
                                {searching ? (
                                    <Text style={styles.emptyText}>searching…</Text>
                                ) : results.length > 0 ? (
                                    results.map((item, index) => (
                                        <TouchableOpacity
                                            key={`res-${item.id}-${index}`}
                                            style={styles.dropdownRow}
                                            onPress={() => addFromSearch(item)}
                                            accessibilityRole="button"
                                            accessibilityLabel={`Add ${item.name}`}
                                            activeOpacity={0.6}
                                        >
                                            <View style={styles.rowCopy}>
                                                <Text style={styles.rowTitle}>{item.name.toLowerCase()}</Text>
                                                {item.bodyPart ? (
                                                    <Text style={styles.rowMeta}>
                                                        {item.bodyPart.toLowerCase()}
                                                    </Text>
                                                ) : null}
                                            </View>
                                            <View style={styles.addButton}>
                                                <Ionicons
                                                    name="add"
                                                    size={28}
                                                    color={WORKOUT_COLORS.accent}
                                                />
                                            </View>
                                        </TouchableOpacity>
                                    ))
                                ) : (
                                    <Text style={styles.emptyText}>
                                        no exercises match “{trimmedQuery}”.
                                    </Text>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                ) : null}
            </View>

            <View style={styles.footer}>
                <ShadowButton label={startLabel} onPress={handleStart} />
            </View>
        </SafeAreaView>
    );
};

function AddedCard({
    item,
    isEditing,
    canMoveUp,
    canMoveDown,
    onMoveUp,
    onMoveDown,
    onToggleEdit,
    onRemove,
    onChangeSets,
    onChangeReps,
    onChangeRest,
}: {
    item: WorkoutExercise;
    isEditing: boolean;
    canMoveUp: boolean;
    canMoveDown: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onToggleEdit: () => void;
    onRemove: () => void;
    onChangeSets: (delta: number) => void;
    onChangeReps: (delta: number) => void;
    onChangeRest: (delta: number) => void;
}) {
    return (
        <Reanimated.View
            layout={cardLayout}
            entering={cardEnter}
            exiting={cardExit}
            style={styles.addedCard}
        >
            <View style={styles.addedAccent} />
            <View style={styles.addedTop}>
                <View style={styles.rowCopy}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                        {item.name.toLowerCase()}
                    </Text>
                    <Text style={styles.rowMeta}>
                        {`${item.sets.length} sets · ${repsOf(item)} reps · ${
                            item.restSeconds ?? DEFAULT_REST
                        }s rest`}
                    </Text>
                </View>
                <TouchableOpacity
                    onPress={onToggleEdit}
                    accessibilityRole="button"
                    accessibilityLabel={
                        isEditing ? `Done editing ${item.name}` : `Edit ${item.name}`
                    }
                    style={styles.iconButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons
                        name={isEditing ? 'checkmark' : 'create-outline'}
                        size={20}
                        color={isEditing ? WORKOUT_COLORS.accent : WORKOUT_COLORS.text}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    onPress={onRemove}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove ${item.name}`}
                    style={styles.iconButton}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <Ionicons name="close" size={20} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
            </View>
            {isEditing ? (
                <View style={styles.editPanel}>
                    <View style={styles.stepperRow}>
                        <Stepper
                            label="sets"
                            value={`${item.sets.length}`}
                            onDecrement={() => onChangeSets(-1)}
                            onIncrement={() => onChangeSets(1)}
                        />
                        <Stepper
                            label="reps"
                            value={`${repsOf(item)}`}
                            onDecrement={() => onChangeReps(-1)}
                            onIncrement={() => onChangeReps(1)}
                        />
                        <Stepper
                            label="rest"
                            value={`${item.restSeconds ?? DEFAULT_REST}s`}
                            onDecrement={() => onChangeRest(-REST_STEP)}
                            onIncrement={() => onChangeRest(REST_STEP)}
                        />
                    </View>
                    <View style={styles.reorderRow}>
                        <TouchableOpacity
                            onPress={onMoveUp}
                            disabled={!canMoveUp}
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${item.name} up`}
                            style={[styles.reorderButton, !canMoveUp && styles.reorderButtonDisabled]}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="chevron-up"
                                size={16}
                                color={canMoveUp ? WORKOUT_COLORS.text : WORKOUT_COLORS.placeholder}
                            />
                            <Text
                                style={[
                                    styles.reorderLabel,
                                    !canMoveUp && styles.reorderLabelDisabled,
                                ]}
                            >
                                up
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={onMoveDown}
                            disabled={!canMoveDown}
                            accessibilityRole="button"
                            accessibilityLabel={`Move ${item.name} down`}
                            style={[
                                styles.reorderButton,
                                !canMoveDown && styles.reorderButtonDisabled,
                            ]}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="chevron-down"
                                size={16}
                                color={canMoveDown ? WORKOUT_COLORS.text : WORKOUT_COLORS.placeholder}
                            />
                            <Text
                                style={[
                                    styles.reorderLabel,
                                    !canMoveDown && styles.reorderLabelDisabled,
                                ]}
                            >
                                down
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : null}
        </Reanimated.View>
    );
}

function ShadowButton({ label, onPress }: { label: string; onPress: () => void }) {
    const pressAnim = useRef(new RNAnimated.Value(0)).current;
    const animatePress = (toValue: number) => {
        RNAnimated.timing(pressAnim, {
            toValue,
            duration: 120,
            easing: RNEasing.out(RNEasing.ease),
            useNativeDriver: true,
        }).start();
    };
    const translateY = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
    const shadowOpacity = pressAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });

    return (
        <View style={styles.primaryWrap}>
            <RNAnimated.View
                style={[styles.primaryShadow, { opacity: shadowOpacity }]}
                pointerEvents="none"
            />
            <TouchableOpacity
                activeOpacity={1}
                onPress={onPress}
                onPressIn={() => animatePress(1)}
                onPressOut={() => animatePress(0)}
                accessibilityRole="button"
                accessibilityLabel={label}
            >
                <RNAnimated.View style={[styles.primaryButton, { transform: [{ translateY }] }]}>
                    <Text style={styles.primaryButtonText}>{label}</Text>
                </RNAnimated.View>
            </TouchableOpacity>
        </View>
    );
}

function Stepper({
    label,
    value,
    onDecrement,
    onIncrement,
}: {
    label: string;
    value: string;
    onDecrement: () => void;
    onIncrement: () => void;
}) {
    return (
        <View style={styles.stepper}>
            <Text style={styles.stepperLabel}>{label}</Text>
            <View style={styles.stepperControls}>
                <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={onDecrement}
                    accessibilityRole="button"
                    accessibilityLabel={`Decrease ${label}`}
                >
                    <Ionicons name="remove" size={16} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{value}</Text>
                <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={onIncrement}
                    accessibilityRole="button"
                    accessibilityLabel={`Increase ${label}`}
                >
                    <Ionicons name="add" size={16} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function ReviewHeader({ onBack }: { onBack: () => void }) {
    return (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.headerSide}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Back to pick workout"
            >
                <Ionicons name="arrow-back" size={22} color={WORKOUT_COLORS.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>pick exercises</Text>
            <View style={styles.headerSide} />
        </View>
    );
}

const { padding, borderWidth, buttonRadius, touchTarget } = PICK_WORKOUT_LAYOUT;

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: WORKOUT_COLORS.background,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: padding,
    },
    headerSide: {
        width: touchTarget + 40,
        height: touchTarget,
        justifyContent: 'center',
    },
    headerTitle: {
        flex: 1,
        textAlign: 'center',
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingHorizontal: padding,
        paddingBottom: padding,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    chipIcon: {
        marginRight: 6,
    },
    chipText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        textTransform: 'lowercase',
    },
    searchArea: {
        marginHorizontal: padding,
        marginBottom: 8,
    },
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 2,
        borderColor: '#CCCCCC',
        borderRadius: 12,
        backgroundColor: WORKOUT_COLORS.background,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 18,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
        padding: 0,
    },
    clearButton: {
        marginLeft: 8,
    },
    body: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
    },
    searchOverlay: {
        ...StyleSheet.absoluteFill,
        zIndex: 30,
        elevation: 30,
        paddingHorizontal: padding,
        paddingTop: 0,
    },
    searchDropdown: {
        maxHeight: '70%',
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 12,
        backgroundColor: WORKOUT_COLORS.background,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
    },
    dropdownRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: WORKOUT_COLORS.divider,
    },
    scrollContent: {
        paddingHorizontal: padding,
        paddingBottom: padding,
    },
    section: {
        marginBottom: 8,
    },
    sectionHeading: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        letterSpacing: 0.5,
        marginTop: 8,
        marginBottom: 4,
    },
    addButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: WORKOUT_COLORS.divider,
    },
    addedCard: {
        paddingVertical: 12,
        paddingLeft: 16,
        paddingRight: 12,
        marginBottom: 10,
        borderRadius: buttonRadius,
        backgroundColor: WORKOUT_COLORS.surfaceSecondary,
        borderWidth,
        borderColor: WORKOUT_COLORS.border,
        overflow: 'hidden',
    },
    addedAccent: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        backgroundColor: WORKOUT_COLORS.accent,
    },
    addedTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    editPanel: {
        marginTop: 12,
        gap: 10,
    },
    stepperRow: {
        flexDirection: 'row',
        gap: 8,
    },
    stepper: {
        flex: 1,
        alignItems: 'center',
        gap: 6,
    },
    stepperLabel: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        letterSpacing: 0.5,
    },
    stepperControls: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
        borderWidth,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: buttonRadius,
        backgroundColor: WORKOUT_COLORS.background,
        paddingHorizontal: 4,
        height: 34,
        alignSelf: 'stretch',
    },
    stepperBtn: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperValue: {
        flex: 1,
        textAlign: 'center',
        fontFamily: fonts.bold,
        fontSize: 15,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    reorderRow: {
        flexDirection: 'row',
        gap: 8,
    },
    reorderButton: {
        flex: 1,
        height: 36,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        borderRadius: buttonRadius,
        backgroundColor: WORKOUT_COLORS.background,
        borderWidth,
        borderColor: WORKOUT_COLORS.border,
    },
    reorderButtonDisabled: {
        opacity: 0.4,
    },
    reorderLabel: {
        fontFamily: fonts.bold,
        fontSize: 13,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    reorderLabelDisabled: {
        color: WORKOUT_COLORS.placeholder,
    },
    rowCopy: {
        flex: 1,
        minWidth: 0,
        marginRight: 8,
    },
    rowTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    rowMeta: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
        marginTop: 2,
    },
    footer: {
        padding: padding,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: WORKOUT_COLORS.divider,
    },
    primaryWrap: {
        height: 44,
        position: 'relative',
    },
    primaryShadow: {
        position: 'absolute',
        top: 4,
        left: 0,
        right: 0,
        height: 44,
        borderRadius: buttonRadius,
        backgroundColor: WORKOUT_COLORS.border,
    },
    primaryButton: {
        height: 44,
        backgroundColor: WORKOUT_COLORS.accent,
        borderWidth,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: buttonRadius,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButtonText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.background,
        textTransform: 'lowercase',
    },
    emptyText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
});
