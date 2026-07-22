import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '../../workout/muscleGroups';
import { StartWorkoutRoutine } from '../../workout/startWorkoutTypes';

export const BOTTOM_BAR_CONTENT_HEIGHT = 132;

interface MuscleSelectBottomBarProps {
    selectedMuscles: MuscleGroup[];
    exerciseCount: number | null;
    isCountLoading: boolean;
    overdueLine: string;
    suggestedRoutine: StartWorkoutRoutine | null;
    onStartWorkout: () => void;
    onStartSuggested: () => void;
    onPresets: () => void;
    onEmptyWorkout: () => void;
    onRemoveMuscle: (muscle: MuscleGroup) => void;
    isStarting: boolean;
}

export const MuscleSelectBottomBar: React.FC<MuscleSelectBottomBarProps> = ({
    selectedMuscles,
    exerciseCount,
    isCountLoading,
    overdueLine,
    suggestedRoutine,
    onStartWorkout,
    onStartSuggested,
    onPresets,
    onEmptyWorkout,
    onRemoveMuscle,
    isStarting,
}) => {
    const insets = useSafeAreaInsets();
    const hasSelection = selectedMuscles.length > 0;

    return (
        <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
            <View style={styles.content}>
                {hasSelection ? (
                    <>
                        <View style={styles.selectedRow}>
                            <View style={styles.chipWrap}>
                                {selectedMuscles.map((muscle) => (
                                    <TouchableOpacity
                                        key={muscle}
                                        style={styles.chip}
                                        onPress={() => onRemoveMuscle(muscle)}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Remove ${MUSCLE_GROUP_LABELS[muscle]}`}
                                    >
                                        <Text style={styles.chipText}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
                                        <Ionicons name="close" size={12} color={WORKOUT_COLORS.text} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <Text style={styles.countText}>
                                {isCountLoading
                                    ? '...'
                                    : `${exerciseCount ?? 0} exercises`}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[styles.startButton, isStarting && styles.startButtonDisabled]}
                            onPress={onStartWorkout}
                            disabled={isStarting}
                            accessibilityRole="button"
                            accessibilityLabel="Start workout"
                        >
                            {isStarting ? (
                                <ActivityIndicator color={WORKOUT_COLORS.background} size="small" />
                            ) : (
                                <Text style={styles.startButtonText}>start workout</Text>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.emptyPrompt}>
                        <Text style={styles.emptyPromptText}>
                            {overdueLine}
                            {suggestedRoutine ? (
                                <>
                                    {' '}
                                    try{' '}
                                    <Text
                                        style={styles.routineLink}
                                        onPress={onStartSuggested}
                                        accessibilityRole="link"
                                    >
                                        {suggestedRoutine.name}
                                    </Text>
                                    .
                                </>
                            ) : null}
                        </Text>
                    </View>
                )}

                <View style={styles.linksRow}>
                    <Text style={styles.link} onPress={onPresets} accessibilityRole="link">
                        presets
                    </Text>
                    <Text style={styles.linkDot}> · </Text>
                    <Text style={styles.link} onPress={onEmptyWorkout} accessibilityRole="link">
                        empty workout
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    bar: {
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E0E0E0',
        backgroundColor: WORKOUT_COLORS.background,
    },
    content: {
        minHeight: BOTTOM_BAR_CONTENT_HEIGHT,
        paddingHorizontal: 20,
        paddingTop: 12,
        justifyContent: 'space-between',
    },
    selectedRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        minHeight: 34,
    },
    chipWrap: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: WORKOUT_COLORS.background,
    },
    chipText: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    countText: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
        flexShrink: 0,
        paddingTop: 4,
    },
    startButton: {
        backgroundColor: WORKOUT_COLORS.accent,
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 999,
        minHeight: 46,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    startButtonDisabled: {
        opacity: 0.7,
    },
    startButtonText: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.background,
        textTransform: 'lowercase',
    },
    emptyPrompt: {
        minHeight: 46,
        justifyContent: 'center',
    },
    emptyPromptText: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        lineHeight: 20,
    },
    routineLink: {
        fontFamily: fonts.bold,
        color: WORKOUT_COLORS.accent,
        textTransform: 'lowercase',
    },
    linksRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 10,
    },
    link: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
    },
    linkDot: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.placeholder,
    },
});
