import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Animated as RNAnimated,
    Easing as RNEasing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '../icons/Icon';
import * as Haptics from 'expo-haptics';
import Reanimated, {
    Easing,
    FadeIn,
    FadeOut,
    interpolate,
    Keyframe,
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
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
import { HardSearchBar } from '../ui/HardSearchBar';
import { HardStamp } from '../ui/HardListCard';
import { BodyPartChip } from '../ui/BodyPartChip';
import { AddTickToggle } from '../ui/AddTickToggle';
import { getBodyPartStamp, PlatesIcon } from '../icons/PlatesIcon';
import { FlatTune } from '../activeWorkout/FlatMark';

const EDIT_MS = 280;
const TITLE_SLIDE = 8;
const expandEase = Easing.inOut(Easing.cubic);

const cardLayout = LinearTransition.duration(EDIT_MS).easing(expandEase);
const editFadeIn = FadeIn.duration(EDIT_MS).easing(expandEase);
const editFadeOut = FadeOut.duration(EDIT_MS).easing(expandEase);

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
    return bodyPartForExercise(exercise);
}

function bodyPartForExercise(exercise: WorkoutExercise): string {
    const muscle =
        mapBodyPartToMuscleGroup(undefined, exercise.name) ??
        ('chest' as MuscleGroup);
    return MUSCLE_GROUP_LABELS[muscle];
}

function namesMatch(a: string, b: string) {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function isSameExercise(workout: WorkoutExercise, search: Exercise) {
    return (
        (!!search.id && workout.exerciseId === search.id) ||
        namesMatch(workout.name, search.name)
    );
}

function SelectExerciseRow({
    name,
    meta,
    bodyPart,
    added,
    isEditing,
    onToggle,
    onToggleEdit,
    children,
}: {
    name: string;
    meta?: string;
    bodyPart?: string;
    added?: boolean;
    isEditing?: boolean;
    onToggle: () => void;
    onToggleEdit?: () => void;
    children?: React.ReactNode;
}) {
    const stamp = getBodyPartStamp(bodyPart);
    const canEdit = !!added && !!onToggleEdit;
    const editProgress = useSharedValue(isEditing ? 1 : 0);

    useEffect(() => {
        editProgress.value = withTiming(isEditing ? 1 : 0, {
            duration: EDIT_MS,
            easing: expandEase,
        });
    }, [editProgress, isEditing]);

    const titleStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: interpolate(editProgress.value, [0, 1], [0, TITLE_SLIDE]) },
        ],
    }));

    const metaStyle = useAnimatedStyle(() => ({
        opacity: interpolate(editProgress.value, [0, 1], [1, 0]),
    }));

    return (
        <Reanimated.View style={styles.rowShell} layout={cardLayout}>
            <View style={styles.pickRow}>
                <View style={styles.pickRowMain}>
                    <HardStamp icon={stamp.icon} fill={stamp.fill} size={40} style={styles.pickStamp} />
                    <TouchableOpacity
                        style={styles.rowCopy}
                        onPress={canEdit ? onToggleEdit : undefined}
                        activeOpacity={canEdit ? 0.7 : 1}
                        disabled={!canEdit}
                    >
                        <Reanimated.View style={titleStyle}>
                            <Text style={styles.rowTitle} numberOfLines={2}>
                                {name.toLowerCase()}
                            </Text>
                        </Reanimated.View>
                        {meta ? (
                            <Reanimated.View style={metaStyle} pointerEvents="none">
                                <Text style={styles.rowMeta} numberOfLines={1}>
                                    {meta}
                                </Text>
                            </Reanimated.View>
                        ) : null}
                    </TouchableOpacity>
                </View>
                {canEdit ? (
                    <TouchableOpacity
                        onPress={onToggleEdit}
                        accessibilityRole="button"
                        accessibilityLabel={
                            isEditing ? `Done editing ${name}` : `Edit ${name}`
                        }
                        style={styles.editButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                        <FlatTune
                            size={20}
                            color={isEditing ? WORKOUT_COLORS.accent : '#ADADAD'}
                        />
                    </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                    style={styles.addButton}
                    onPress={onToggle}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={added ? `Remove ${name}` : `Add ${name}`}
                >
                    <AddTickToggle added={!!added} />
                </TouchableOpacity>
            </View>
            <Reanimated.View layout={cardLayout} style={styles.editClip}>
                {canEdit && isEditing ? (
                    <Reanimated.View
                        style={styles.editRow}
                        entering={editFadeIn}
                        exiting={editFadeOut}
                    >
                        {children}
                    </Reanimated.View>
                ) : null}
            </Reanimated.View>
        </Reanimated.View>
    );
}

export const ReviewWorkoutScreen: React.FC<ReviewWorkoutScreenProps> = ({
    pending,
    onBack,
    onStartWorkout,
}) => {
    const { user } = useAuth();
    const [catalog, setCatalog] = useState<WorkoutExercise[]>(() =>
        pending.exercises.map((exercise) => withDefaults(exercise))
    );
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
    const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
    const [introDone, setIntroDone] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Exercise[]>([]);
    const [searching, setSearching] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    useEffect(() => {
        const ids = catalog.map((item) => item.id);
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

        const introTimer = setTimeout(
            () => setIntroDone(true),
            REVEAL_START_MS + ids.length * REVEAL_STAGGER_MS + 320
        );

        return () => {
            timers.forEach(clearTimeout);
            clearTimeout(introTimer);
        };
        // Intro cascade only on first mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleEditing = useCallback((id: string) => {
        Haptics.selectionAsync();
        setEditingId((current) => (current === id ? null : id));
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

    const added = useMemo(
        () => catalog.filter((exercise) => selectedIds.has(exercise.id)),
        [catalog, selectedIds]
    );

    const toggleSelect = useCallback((exercise: WorkoutExercise) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedIds((current) => {
            const next = new Set(current);
            if (next.has(exercise.id)) next.delete(exercise.id);
            else next.add(exercise.id);
            return next;
        });
        setEditingId((current) => (current === exercise.id ? null : current));
    }, []);

    const addFromSearch = useCallback(
        async (exercise: Exercise) => {
            const existing = catalog.find((item) => isSameExercise(item, exercise));
            if (existing) {
                toggleSelect(existing);
                return;
            }

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
            setCatalog((current) => [...current, built]);
            setSelectedIds((current) => {
                const next = new Set(current);
                next.add(built.id);
                return next;
            });
            setRevealedIds((current) => {
                const next = new Set(current);
                next.add(built.id);
                return next;
            });
        },
        [catalog, toggleSelect, user?.id]
    );

    const updateCatalog = useCallback(
        (id: string, updater: (exercise: WorkoutExercise) => WorkoutExercise) => {
            setCatalog((current) =>
                current.map((exercise) => (exercise.id === id ? updater(exercise) : exercise))
            );
        },
        []
    );

    const changeSets = useCallback(
        (target: WorkoutExercise, delta: number) => {
            Haptics.selectionAsync();
            updateCatalog(target.id, (exercise) => {
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
        [updateCatalog]
    );

    const changeReps = useCallback(
        (target: WorkoutExercise, delta: number) => {
            Haptics.selectionAsync();
            updateCatalog(target.id, (exercise) => {
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
        [updateCatalog]
    );

    const changeRest = useCallback(
        (target: WorkoutExercise, delta: number) => {
            Haptics.selectionAsync();
            updateCatalog(target.id, (exercise) => {
                const restSeconds = Math.min(
                    MAX_REST,
                    Math.max(0, (exercise.restSeconds ?? DEFAULT_REST) + delta)
                );
                return { ...exercise, restSeconds };
            });
        },
        [updateCatalog]
    );

    const visibleRows = useMemo(() => {
        const source =
            isSearching || introDone
                ? catalog
                : catalog.filter((item) => revealedIds.has(item.id));

        if (!isSearching) return source;

        const needle = trimmedQuery.toLowerCase();
        const matches = source.filter((item) => item.name.toLowerCase().includes(needle));
        const selected = matches.filter((item) => selectedIds.has(item.id));
        const rest = matches.filter((item) => !selectedIds.has(item.id));
        return [...selected, ...rest];
    }, [catalog, introDone, isSearching, revealedIds, selectedIds, trimmedQuery]);

    const extraSearchResults = useMemo(() => {
        if (!isSearching) return [];
        return results.filter(
            (item) => !catalog.some((exercise) => isSameExercise(exercise, item))
        );
    }, [catalog, isSearching, results]);

    const handleStart = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onStartWorkout({ title: pending.title, exercises: added });
    };

    const startLabel = added.length > 0 ? 'start workout' : 'start empty workout';
    const showSearchEmpty =
        isSearching &&
        !searching &&
        visibleRows.length === 0 &&
        extraSearchResults.length === 0;

    return (
        <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
            <ReviewHeader onBack={onBack} />

            <HardSearchBar
                value={query}
                onChangeText={setQuery}
                placeholder="search exercises"
                containerStyle={styles.searchBar}
            />

            <View style={styles.filterRow}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {pending.selectedMuscles.map((muscle) => {
                        const stamp = getBodyPartStamp(MUSCLE_GROUP_LABELS[muscle]);
                        return (
                            <BodyPartChip
                                key={muscle}
                                label={MUSCLE_GROUP_LABELS[muscle]}
                                icon={stamp.icon}
                                fill={stamp.fill}
                                wash={stamp.wash}
                                isActive
                            />
                        );
                    })}
                </ScrollView>
            </View>

            <View style={styles.body}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {showSearchEmpty ? (
                        <Text style={styles.emptyText}>
                            no exercises match “{trimmedQuery}”.
                        </Text>
                    ) : null}
                    {isSearching && searching && visibleRows.length === 0 ? (
                        <Text style={styles.emptyText}>searching…</Text>
                    ) : null}
                    {visibleRows.map((item) => {
                        const selected = selectedIds.has(item.id);
                        const isEditing = editingId === item.id;
                        return (
                            <Reanimated.View
                                key={item.id}
                                layout={cardLayout}
                                entering={introDone || isSearching ? undefined : recEnter}
                                style={styles.itemWrapper}
                            >
                                <SelectExerciseRow
                                    name={item.name}
                                    meta={formatExerciseMeta(item)}
                                    bodyPart={bodyPartForExercise(item)}
                                    added={selected}
                                    isEditing={isEditing}
                                    onToggle={() => toggleSelect(item)}
                                    onToggleEdit={() => toggleEditing(item.id)}
                                >
                                    <View style={styles.editLine}>
                                        <CompactStep
                                            label="sets"
                                            value={`${item.sets.length}`}
                                            onDecrement={() => changeSets(item, -1)}
                                            onIncrement={() => changeSets(item, 1)}
                                        />
                                        <CompactStep
                                            label="reps"
                                            value={`${repsOf(item)}`}
                                            onDecrement={() => changeReps(item, -1)}
                                            onIncrement={() => changeReps(item, 1)}
                                        />
                                        <CompactStep
                                            label="rest"
                                            value={`${item.restSeconds ?? DEFAULT_REST}s`}
                                            onDecrement={() => changeRest(item, -REST_STEP)}
                                            onIncrement={() => changeRest(item, REST_STEP)}
                                        />
                                    </View>
                                </SelectExerciseRow>
                            </Reanimated.View>
                        );
                    })}
                    {extraSearchResults.map((item, index) => (
                        <View key={`res-${item.id}-${index}`} style={styles.itemWrapper}>
                            <SelectExerciseRow
                                name={item.name}
                                meta={item.bodyPart?.toLowerCase()}
                                bodyPart={item.bodyPart}
                                onToggle={() => {
                                    void addFromSearch(item);
                                }}
                            />
                        </View>
                    ))}
                </ScrollView>
            </View>

            <View style={styles.footer}>
                <ShadowButton label={startLabel} onPress={handleStart} />
            </View>
        </SafeAreaView>
    );
};

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

function CompactStep({
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
                    <Icon name="remove" size={16} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.stepperValue}>{value}</Text>
                <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={onIncrement}
                    accessibilityRole="button"
                    accessibilityLabel={`Increase ${label}`}
                >
                    <Icon name="add" size={16} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

function ReviewHeader({ onBack }: { onBack: () => void }) {
    return (
        <View style={styles.header}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={onBack}
                accessibilityRole="button"
                accessibilityLabel="Back to pick workout"
                activeOpacity={0.7}
            >
                <PlatesIcon name="chevronLeft" size={22} color={WORKOUT_COLORS.text} />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
                <Text style={styles.headerTitle}>pick exercises</Text>
            </View>
            <View style={styles.headerRight} />
        </View>
    );
}

const { borderWidth, buttonRadius } = PICK_WORKOUT_LAYOUT;

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: WORKOUT_COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 6,
    },
    backButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerRight: {
        width: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    searchBar: {
        marginTop: 16,
        marginBottom: 8,
        marginHorizontal: 20,
    },
    filterRow: {
        marginTop: 2,
        marginBottom: 2,
    },
    filterContent: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        gap: 8,
    },
    body: {
        flex: 1,
        minHeight: 0,
        position: 'relative',
    },
    pickRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    rowShell: {
        paddingTop: 8,
        paddingBottom: 14,
        paddingHorizontal: 7,
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
    },
    pickRowMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 12,
        minWidth: 0,
    },
    pickStamp: {
        borderWidth: 0,
    },
    addButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    editButton: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 2,
    },
    rowCopy: {
        flex: 1,
        minWidth: 0,
        minHeight: 40,
        justifyContent: 'flex-start',
    },
    rowTitle: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    rowMeta: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#999',
        textTransform: 'lowercase',
        marginTop: 2,
    },
    editClip: {
        overflow: 'hidden',
    },
    editRow: {
        paddingTop: 12,
        paddingBottom: 4,
    },
    editLine: {
        flexDirection: 'row',
        gap: 6,
    },
    stepper: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    stepperLabel: {
        fontFamily: fonts.regular,
        fontSize: 11,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        letterSpacing: 0.4,
    },
    stepperControls: {
        flexDirection: 'row',
        alignItems: 'center',
        height: 28,
        alignSelf: 'stretch',
        borderWidth: 1.5,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 10,
        backgroundColor: WORKOUT_COLORS.background,
        paddingHorizontal: 2,
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
        fontSize: 13,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 0,
        paddingBottom: 28,
    },
    itemWrapper: {},
    footer: {
        paddingHorizontal: 20,
        paddingVertical: 20,
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
