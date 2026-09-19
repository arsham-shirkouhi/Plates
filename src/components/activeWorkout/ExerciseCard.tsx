import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Reanimated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { fonts } from '../../constants/fonts';
import { EXERCISE_EXPAND_MS, SUPERSET_COLORS, WORKOUT_COLORS } from '../../workout/constants';
import { WorkoutExercise } from '../../workout/types';
import { formatRestDuration } from '../../workout/workoutSelectors';
import { SetTableHeader } from './SetTableHeader';
import { SetRow } from './SetRow';
import { Confetti, ConfettiParticle } from '../Confetti';

const COMPLETION_CONFETTI_COLORS = ['#526EFF', '#34C759', '#FFB020', '#FF5A7A', '#8E7BFF'];

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
    onUpdateRestSeconds: (restSeconds: number) => void;
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
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
    exercise,
    supersetColorIndex = 0,
    showRpe = false,
    onUpdateNote,
    onUpdateRestSeconds,
    onAddSet,
    onUpdateSet,
    onToggleSetComplete,
    onApplyPreviousSet,
    onChangeSetType,
    onRemoveSet,
    onRemoveExercise,
    onAddWarmupSets,
    onAddToSuperset,
}) => {
    const [noteVisible, setNoteVisible] = useState(!!exercise.note);
    const [collapsed, setCollapsed] = useState(false);
    const railColor = exercise.supersetId
        ? SUPERSET_COLORS[supersetColorIndex % SUPERSET_COLORS.length]
        : undefined;

    const openMenu = () => {
        Alert.alert(exercise.name, undefined, [
            {
                text: 'Add Note',
                onPress: () => setNoteVisible(true),
            },
            { text: 'Add Warm-up Sets', onPress: onAddWarmupSets },
            { text: 'Add to Superset', onPress: onAddToSuperset },
            { text: 'Remove Exercise', style: 'destructive', onPress: onRemoveExercise },
            { text: 'Cancel', style: 'cancel' },
        ]);
    };

    const openRestPicker = () => {
        Alert.alert('Rest timer', 'Choose rest duration', [
            { text: 'Off', onPress: () => onUpdateRestSeconds(0) },
            { text: '1:00', onPress: () => onUpdateRestSeconds(60) },
            { text: '1:30', onPress: () => onUpdateRestSeconds(90) },
            { text: '2:00', onPress: () => onUpdateRestSeconds(120) },
            { text: '2:30', onPress: () => onUpdateRestSeconds(150) },
            { text: '3:00', onPress: () => onUpdateRestSeconds(180) },
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
    const collapseProgress = useSharedValue(1); // 1 = expanded, 0 = collapsed

    const [confetti, setConfetti] = useState<ConfettiParticle[]>([]);
    const confettiIdRef = useRef(0);
    const confettiTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const cardSizeRef = useRef({ width: 0, height: 0 });

    useEffect(() => {
        return () => {
            if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
        };
    }, []);

    const burstCompletionConfetti = () => {
        const { width, height } = cardSizeRef.current;
        const originX = width > 0 ? width / 2 : 160;
        const originY = height > 0 ? Math.min(height / 2, 90) : 60;
        const particles: ConfettiParticle[] = Array.from({ length: 20 }, () => {
            confettiIdRef.current += 1;
            return {
                id: confettiIdRef.current,
                originX,
                originY,
                angle: Math.random() * 360,
                color: COMPLETION_CONFETTI_COLORS[
                    Math.floor(Math.random() * COMPLETION_CONFETTI_COLORS.length)
                ],
                travel: 90 + Math.random() * 60,
                sizeScale: 1.15,
            };
        });
        setConfetti(particles);
        if (confettiTimerRef.current) clearTimeout(confettiTimerRef.current);
        confettiTimerRef.current = setTimeout(() => setConfetti([]), 850);
    };

    useEffect(() => {
        collapseProgress.value = withTiming(collapsed ? 0 : 1, {
            duration: COLLAPSE_MS,
            easing: collapseEasing,
        });
    }, [collapsed, collapseProgress]);

    const toggleCollapsed = () => {
        setCollapsed((current) => !current);
    };

    const bodyStyle = useAnimatedStyle(() => {
        const measured = measuredHeight.value;
        if (measured <= 0) {
            return { opacity: collapseProgress.value };
        }
        return {
            height: measured * collapseProgress.value,
            opacity: collapseProgress.value,
        };
    });

    const innerStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: (1 - collapseProgress.value) * -16 }],
    }));

    const totalSets = exercise.sets.length;
    const completedSets = exercise.sets.filter((set) => set.completed).length;
    const allSetsComplete = totalSets > 0 && completedSets === totalSets;
    const wasAllComplete = useRef(false);

    useEffect(() => {
        if (!allSetsComplete) {
            wasAllComplete.current = false;
            return;
        }
        if (wasAllComplete.current) return;
        wasAllComplete.current = true;
        setCollapsed(true);
        burstCompletionConfetti();
    }, [allSetsComplete]);

    const collapsedSummary = totalSets > 0
        ? `${completedSets}/${totalSets} sets done`
        : 'no sets';

    return (
        <View
            style={styles.cardOuter}
            onLayout={(event) => {
                const { width, height } = event.nativeEvent.layout;
                cardSizeRef.current = { width, height };
            }}
        >
        <View
            style={[
                styles.card,
                allSetsComplete && styles.cardComplete,
                railColor ? { borderLeftColor: railColor, borderLeftWidth: 4 } : null,
            ]}
        >
            <View style={[styles.headerRow, collapsed && styles.headerRowCollapsed]}>
                <TouchableOpacity
                    style={styles.titleWrap}
                    onPress={toggleCollapsed}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={collapsed ? `Expand ${exercise.name}` : `Collapse ${exercise.name}`}
                >
                    <View style={styles.thumbnail}>
                        <Ionicons name="barbell-outline" size={18} color={WORKOUT_COLORS.accent} />
                    </View>
                    <View style={styles.titleTextWrap}>
                        <Text style={styles.title}>{exercise.name.toLowerCase()}</Text>
                        {collapsed ? (
                            <Text style={[styles.collapsedSummary, allSetsComplete && styles.collapsedSummaryComplete]}>
                                {allSetsComplete ? `✓ ${collapsedSummary}` : collapsedSummary}
                            </Text>
                        ) : null}
                    </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={openMenu} style={styles.menuButton}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={WORKOUT_COLORS.text} />
                </TouchableOpacity>
            </View>

            <Reanimated.View
                style={[styles.collapsibleOuter, bodyStyle]}
                pointerEvents={collapsed ? 'none' : 'auto'}
            >
            <Reanimated.View
                style={[
                    styles.collapsibleInner,
                    measuredReady && styles.collapsibleInnerLocked,
                    innerStyle,
                ]}
                onLayout={(event) => {
                    const measured = event.nativeEvent.layout.height;
                    if (measured <= 0 || collapsed) return;
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

            <TouchableOpacity style={styles.restChip} onPress={openRestPicker}>
                <Text style={styles.restChipText}>⏱ {formatRestDuration(exercise.restSeconds)}</Text>
            </TouchableOpacity>

            <SetTableHeader showRpe={showRpe} />
            {exercise.sets.map((set, index) => (
                <SetRow
                    key={set.id}
                    set={set}
                    index={index}
                    showRpe={showRpe}
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
                    <MaterialCommunityIcons
                        name="minus-thick"
                        size={16}
                        color={canRemoveSet ? WORKOUT_COLORS.muted : WORKOUT_COLORS.placeholder}
                    />
                    <Text style={[styles.setActionText, !canRemoveSet && styles.setActionTextDisabled]}>
                        remove
                    </Text>
                </TouchableOpacity>

                <View style={styles.setActionDivider} />

                <TouchableOpacity style={styles.setActionButton} onPress={handleAddSet}>
                    <MaterialCommunityIcons name="plus-thick" size={16} color={WORKOUT_COLORS.accent} />
                    <Text style={[styles.setActionText, styles.addSetText]}>add</Text>
                </TouchableOpacity>
            </View>
            </Reanimated.View>
            </Reanimated.View>
        </View>
        {confetti.length > 0 ? (
            <View style={styles.confettiLayer} pointerEvents="none">
                <Confetti particles={confetti} />
            </View>
        ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    cardOuter: {
        position: 'relative',
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        marginHorizontal: 16,
        marginBottom: 14,
        overflow: 'hidden',
    },
    cardComplete: {
        backgroundColor: '#EAF7EE',
        borderColor: '#34C759',
    },
    confettiLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 1000,
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    titleTextWrap: {
        flex: 1,
    },
    thumbnail: {
        width: 34,
        height: 34,
        borderRadius: 10,
        backgroundColor: '#EEF1FF',
        alignItems: 'center',
        justifyContent: 'center',
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
    collapsedSummaryComplete: {
        color: '#2E9E4F',
        fontFamily: fonts.bold,
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
    restChip: {
        alignSelf: 'flex-start',
        marginHorizontal: 14,
        marginBottom: 10,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#F3F4F6',
    },
    restChipText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: WORKOUT_COLORS.text,
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
});
