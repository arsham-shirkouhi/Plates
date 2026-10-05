import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import Reanimated, {
    Easing,
    Extrapolation,
    interpolate,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { fonts } from '../../constants/fonts';
import { EXERCISE_EXPAND_MS, SUPERSET_COLORS, WORKOUT_COLORS } from '../../workout/constants';
import { WorkoutExercise } from '../../workout/types';
import { SetTableHeader } from './SetTableHeader';
import { SetRow } from './SetRow';
import { COMPLETE_BG, COMPLETE_BORDER, COMPLETE_INK, FlatDots, FlatMinus, FlatPlus, FlatTick } from './FlatMark';
import { Confetti, ConfettiParticle } from '../Confetti';
import { getBodyPartStamp, PlatesIcon } from '../icons/PlatesIcon';
import { mapBodyPartToMuscleGroup } from '../../workout/muscleGroups';

const DUST_COLORS = ['#8A8A8A', '#B0B0B0', '#6E6E6E', '#C8C8C8', '#9A9A9A', '#D4D4D4'];

const COMPLETE_FADE_MS = 280;
const REMOVE_MS = 200;
const REMOVE_EASING = Easing.bezier(0.7, 0.0, 0.9, 0.15);

// The card animates its own height over this duration; the cards below reflow
// natively in real time, so they move in lockstep with no competing animation.
const COLLAPSE_MS = EXERCISE_EXPAND_MS;
const SIZE_MS = 140;
const collapseEasing = Easing.inOut(Easing.cubic);

interface ExerciseCardProps {
    exercise: WorkoutExercise;
    supersetColorIndex?: number;
    showRpe?: boolean;
    onUpdateNote: (note: string) => void;
    onAddSet: () => void;
    onUpdateSet: (
        setId: string,
        patch: Partial<{ weight: string; reps: string; rpe: string }>
    ) => void;
    onToggleSetComplete: (setId: string) => void;
    onApplyPreviousSet: (setId: string) => void;
    onChangeSetType: (setId: string, type: WorkoutExercise['sets'][number]['type']) => void;
    onRemoveSet: (setId: string) => void;
    onRemoveExercise: () => void;
    onAddWarmupSets: () => void;
    onAddToSuperset: () => void;
    startCollapsed?: boolean;
    expandNonce?: number;
    onCompletedAllSets?: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
    exercise,
    supersetColorIndex = 0,
    showRpe = false,
    onUpdateNote,
    onAddSet,
    onUpdateSet,
    onToggleSetComplete,
    onApplyPreviousSet,
    onChangeSetType,
    onRemoveSet,
    onRemoveExercise,
    onAddWarmupSets,
    onAddToSuperset,
    startCollapsed = false,
    expandNonce = 0,
    onCompletedAllSets,
}) => {
    const [noteVisible, setNoteVisible] = useState(!!exercise.note);
    const [collapsed, setCollapsed] = useState(startCollapsed);
    const stamp = getBodyPartStamp(exercise.bodyPart ?? mapBodyPartToMuscleGroup(undefined, exercise.name) ?? undefined);
    const railColor = exercise.supersetId
        ? SUPERSET_COLORS[supersetColorIndex % SUPERSET_COLORS.length]
        : undefined;

    const exitingRef = useRef(false);
    const exitProgress = useSharedValue(0);
    const shellHeight = useSharedValue(0);
    const cardSizeRef = useRef({ width: 0, height: 0 });
    const [dust, setDust] = useState<ConfettiParticle[]>([]);
    const dustIdRef = useRef(0);
    const removeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
        };
    }, []);

    const burstDust = () => {
        const { width, height } = cardSizeRef.current;
        const originX = width > 0 ? width / 2 : 160;
        const originY = height > 0 ? height / 2 : 60;
        const particles: ConfettiParticle[] = Array.from({ length: 26 }, () => {
            dustIdRef.current += 1;
            return {
                id: dustIdRef.current,
                originX: originX + (Math.random() - 0.5) * Math.max(width * 0.45, 80),
                originY: originY + (Math.random() - 0.5) * Math.max(height * 0.5, 40),
                angle: Math.random() * 360,
                color: DUST_COLORS[Math.floor(Math.random() * DUST_COLORS.length)],
                travel: 22 + Math.random() * 38,
                sizeScale: 0.55 + Math.random() * 0.85,
            };
        });
        setDust(particles);
    };

    const finishRemove = () => {
        if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
        removeTimerRef.current = setTimeout(() => {
            onRemoveExercise();
        }, 180);
    };

    const startExitAnimation = () => {
        burstDust();
        exitProgress.value = withTiming(
            1,
            { duration: REMOVE_MS, easing: REMOVE_EASING },
            (finished) => {
                if (finished) runOnJS(finishRemove)();
            }
        );
    };

    const requestRemove = () => {
        if (exitingRef.current) return;
        exitingRef.current = true;
        if (!collapsed) {
            setCollapsed(true);
            if (removeTimerRef.current) clearTimeout(removeTimerRef.current);
            removeTimerRef.current = setTimeout(startExitAnimation, COLLAPSE_MS + 50);
            return;
        }
        startExitAnimation();
    };

    const openMenu = () => {
        if (exitingRef.current) return;
        Alert.alert(exercise.name, undefined, [
            {
                text: 'Add Note',
                onPress: () => setNoteVisible(true),
            },
            { text: 'Add Warm-up Sets', onPress: onAddWarmupSets },
            { text: 'Add to Superset', onPress: onAddToSuperset },
            { text: 'Remove Exercise', style: 'destructive', onPress: requestRemove },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const handleAddSet = () => {
        onAddSet();
    };

    const handleRemoveLastSet = () => {
        const lastSet = exercise.sets[exercise.sets.length - 1];
        if (!lastSet) return;
        onRemoveSet(lastSet.id);
    };

    const canRemoveSet = exercise.sets.length > 0;

    const [measuredReady, setMeasuredReady] = useState(false);
    const measuredHeight = useSharedValue(0);
    const collapseProgress = useSharedValue(startCollapsed ? 0 : 1);

    useEffect(() => {
        collapseProgress.value = withTiming(collapsed ? 0 : 1, {
            duration: COLLAPSE_MS,
            easing: collapseEasing,
        });
    }, [collapsed, collapseProgress]);

    const toggleCollapsed = () => {
        if (exitingRef.current) return;
        setCollapsed((current) => !current);
    };

    useEffect(() => {
        if (expandNonce > 0) setCollapsed(false);
    }, [expandNonce]);

    const bodyStyle = useAnimatedStyle(() => {
        const measured = measuredHeight.value;
        const progress = collapseProgress.value;
        if (measured <= 0) {
            if (progress < 0.5) {
                return { height: 0, opacity: 0 };
            }
            return { opacity: progress };
        }
        return {
            height: measured * progress,
            opacity: progress,
        };
    });

    const innerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: (1 - collapseProgress.value) * -16 }],
    }));

    const totalSets = exercise.sets.length;
    const completedSets = exercise.sets.filter((set) => set.completed).length;
    const allSetsComplete = totalSets > 0 && completedSets === totalSets;
    const wasAllComplete = useRef(false);
    const completeProgress = useSharedValue(allSetsComplete ? 1 : 0);

    useEffect(() => {
        completeProgress.value = withTiming(allSetsComplete ? 1 : 0, {
            duration: COMPLETE_FADE_MS,
            easing: Easing.out(Easing.cubic),
        });
    }, [allSetsComplete, completeProgress]);

    useEffect(() => {
        if (!allSetsComplete) {
            wasAllComplete.current = false;
            return;
        }
        if (wasAllComplete.current) return;
        wasAllComplete.current = true;
        setCollapsed(true);
        onCompletedAllSets?.();
    }, [allSetsComplete, onCompletedAllSets]);

    const cardCompleteStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(
            completeProgress.value,
            [0, 1],
            ['#FFFFFF', COMPLETE_BG]
        ),
        borderColor: interpolateColor(
            completeProgress.value,
            [0, 1],
            [WORKOUT_COLORS.border, COMPLETE_BORDER]
        ),
    }));

    const titleCompleteStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            completeProgress.value,
            [0, 1],
            [stamp.fill, COMPLETE_INK]
        ),
    }));

    const summaryCompleteStyle = useAnimatedStyle(() => ({
        color: interpolateColor(
            completeProgress.value,
            [0, 1],
            [WORKOUT_COLORS.placeholder, COMPLETE_INK]
        ),
    }));

    const doneLabelStyle = useAnimatedStyle(() => ({
        opacity: completeProgress.value,
        transform: [{ translateX: (1 - completeProgress.value) * 8 }],
    }));

    const iconLiveStyle = useAnimatedStyle(() => ({
        opacity: 1 - completeProgress.value,
    }));

    const iconDoneStyle = useAnimatedStyle(() => ({
        opacity: completeProgress.value,
    }));

    const exitSlotStyle = useAnimatedStyle(() => {
        const progress = exitProgress.value;
        const height = shellHeight.value;
        const closed = 14 - (height + 14);
        return {
            marginBottom: interpolate(
                progress,
                [0, 0.28, 1],
                [14, 14, closed],
                Extrapolation.CLAMP
            ),
        };
    });

    const exitSpinStyle = useAnimatedStyle(() => {
        const progress = exitProgress.value;
        const scale = interpolate(
            progress,
            [0, 0.14, 1],
            [1, 1.08, 0.02],
            Extrapolation.CLAMP
        );
        const rotate = interpolate(
            progress,
            [0, 0.14, 1],
            [0, -5, 38],
            Extrapolation.CLAMP
        );
        const opacity = interpolate(
            progress,
            [0, 0.55, 1],
            [1, 1, 0],
            Extrapolation.CLAMP
        );
        return {
            opacity,
            transform: [{ rotate: `${rotate}deg` }, { scale }],
        };
    });

    const collapsedSummary = totalSets > 0
        ? `${completedSets}/${totalSets} sets`
        : 'no sets';

    return (
        <Reanimated.View style={[styles.exitSlot, exitSlotStyle]}>
        <Reanimated.View
            style={[
                styles.card,
                cardCompleteStyle,
                exitSpinStyle,
                railColor ? { borderLeftColor: railColor, borderLeftWidth: 4 } : null,
            ]}
            onLayout={(event) => {
                if (exitProgress.value > 0) return;
                const { width, height } = event.nativeEvent.layout;
                shellHeight.value = height;
                cardSizeRef.current = { width, height };
            }}
        >
            <View style={[styles.headerRow, collapsed && styles.headerRowCollapsed]}>
                <TouchableOpacity
                    style={styles.titleWrap}
                    onPress={toggleCollapsed}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={collapsed ? `Expand ${exercise.name}` : `Collapse ${exercise.name}`}
                >
                    <View style={styles.iconSlot}>
                        <Reanimated.View style={[styles.iconLayer, iconLiveStyle]}>
                            <PlatesIcon
                                name={stamp.icon}
                                size={24}
                                color={stamp.fill}
                                fill={stamp.fill}
                                strokeWidth={1.2}
                            />
                        </Reanimated.View>
                        <Reanimated.View style={[styles.iconLayer, iconDoneStyle]}>
                            <PlatesIcon
                                name={stamp.icon}
                                size={24}
                                color={COMPLETE_INK}
                                fill={COMPLETE_INK}
                                strokeWidth={1.2}
                            />
                        </Reanimated.View>
                    </View>
                    <View style={styles.titleTextWrap}>
                        <Reanimated.Text style={[styles.title, titleCompleteStyle]}>
                            {exercise.name.toLowerCase()}
                        </Reanimated.Text>
                        {collapsed ? (
                            <Reanimated.Text style={[styles.collapsedSummary, summaryCompleteStyle]}>
                                {collapsedSummary}
                            </Reanimated.Text>
                        ) : null}
                    </View>
                </TouchableOpacity>
                {allSetsComplete ? (
                    <Reanimated.View style={[styles.doneTick, doneLabelStyle]} pointerEvents="none">
                        <FlatTick color={COMPLETE_INK} size={18} />
                    </Reanimated.View>
                ) : null}
                <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
                    <FlatDots color={WORKOUT_COLORS.text} size={20} />
                </TouchableOpacity>
            </View>

            <Reanimated.View
                style={[styles.collapsibleOuter, bodyStyle]}
                pointerEvents={collapsed ? 'none' : 'auto'}
            >
            <Reanimated.View
                style={[
                    styles.collapsibleInner,
                    (measuredReady || startCollapsed) && styles.collapsibleInnerLocked,
                    innerStyle,
                ]}
                onLayout={(event) => {
                    const measured = event.nativeEvent.layout.height;
                    if (measured <= 0) return;
                    if (measuredHeight.value <= 0) {
                        measuredHeight.value = measured;
                        setMeasuredReady(true);
                        return;
                    }
                    if (Math.abs(measuredHeight.value - measured) > 1) {
                        measuredHeight.value = withTiming(measured, {
                            duration: SIZE_MS,
                            easing: Easing.out(Easing.cubic),
                        });
                    }
                }}
            >
            {noteVisible ? (
                <TextInput
                    style={styles.noteInput}
                    value={exercise.note}
                    onChangeText={onUpdateNote}
                    placeholder="add a note"
                    placeholderTextColor={WORKOUT_COLORS.placeholder}
                    multiline
                />
            ) : null}

            <SetTableHeader showRpe={showRpe} />
            {exercise.sets.map((set, index) => (
                <SetRow
                    key={set.id}
                    set={set}
                    index={index}
                    showRpe={showRpe}
                    exerciseComplete={allSetsComplete}
                    onChange={(patch) => onUpdateSet(set.id, patch)}
                    onToggleComplete={() => onToggleSetComplete(set.id)}
                    onApplyPrevious={() => onApplyPreviousSet(set.id)}
                    onChangeType={(type) => onChangeSetType(set.id, type)}
                    onRemove={() => onRemoveSet(set.id)}
                />
            ))}

            <View style={styles.setActionsRow}>
                <TouchableOpacity
                    style={styles.setActionButton}
                    onPress={handleRemoveLastSet}
                    disabled={!canRemoveSet}
                >
                    <FlatMinus
                        size={14}
                        color={
                            !canRemoveSet
                                ? WORKOUT_COLORS.placeholder
                                : allSetsComplete
                                  ? COMPLETE_INK
                                  : WORKOUT_COLORS.muted
                        }
                    />
                    <Text
                        style={[
                            styles.setActionText,
                            allSetsComplete && styles.setActionTextComplete,
                            !canRemoveSet && styles.setActionTextDisabled,
                        ]}
                    >
                        remove
                    </Text>
                </TouchableOpacity>

                <View style={styles.setActionDivider} />

                <TouchableOpacity style={styles.setActionButton} onPress={handleAddSet}>
                    <FlatPlus
                        size={14}
                        color={allSetsComplete ? COMPLETE_INK : WORKOUT_COLORS.accent}
                    />
                    <Text
                        style={[
                            styles.setActionText,
                            styles.addSetText,
                            allSetsComplete && styles.setActionTextComplete,
                        ]}
                    >
                        add
                    </Text>
                </TouchableOpacity>
            </View>
            </Reanimated.View>
            </Reanimated.View>
        </Reanimated.View>
        {dust.length > 0 ? (
            <View style={styles.dustLayer} pointerEvents="none">
                <Confetti particles={dust} />
            </View>
        ) : null}
        </Reanimated.View>
    );
};

const styles = StyleSheet.create({
    exitSlot: {
        marginHorizontal: 16,
        overflow: 'visible',
        zIndex: 2,
    },
    dustLayer: {
        ...StyleSheet.absoluteFill,
        zIndex: 8,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        overflow: 'hidden',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 8,
    },
    headerRowCollapsed: {
        paddingTop: 12,
        paddingBottom: 12,
    },
    collapsibleOuter: {
        overflow: 'hidden',
    },
    collapsibleInner: {},
    collapsibleInnerLocked: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
    },
    titleWrap: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconSlot: {
        width: 24,
        height: 24,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconLayer: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleTextWrap: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.accent,
    },
    collapsedSummary: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.placeholder,
        marginTop: 2,
    },
    doneTick: {
        marginRight: 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    noteInput: {
        marginHorizontal: 14,
        marginBottom: 8,
        padding: 10,
        borderRadius: 12,
        backgroundColor: '#F7F7F7',
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.text,
        minHeight: 44,
    },
    setActionsRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    setActionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 14,
    },
    setActionDivider: {
        width: 1,
        backgroundColor: '#F0F0F0',
    },
    setActionText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
    },
    setActionTextDisabled: {
        color: WORKOUT_COLORS.placeholder,
    },
    addSetText: {
        color: WORKOUT_COLORS.accent,
    },
    setActionTextComplete: {
        color: COMPLETE_INK,
    },
});
