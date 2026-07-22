import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fonts } from '../../constants/fonts';
import { PICK_WORKOUT_LAYOUT, WORKOUT_COLORS } from '../../workout/constants';
import { MuscleGroup } from '../../workout/muscleGroups';
import { StartWorkoutRoutine } from '../../workout/startWorkoutTypes';

const HINT_LINE =
    'Tap muscles to build a workout, or pick up where you left off.';

interface PickWorkoutBottomBarProps {
    selectedMuscles: MuscleGroup[];
    hasUserRoutines: boolean;
    suggestedRoutine: StartWorkoutRoutine | null;
    onPrimaryPress: () => void;
    onPresets: () => void;
    onNewWorkout: () => void;
}

export const PickWorkoutBottomBar: React.FC<PickWorkoutBottomBarProps> = ({
    selectedMuscles,
    hasUserRoutines,
    suggestedRoutine,
    onPrimaryPress,
    onPresets,
    onNewWorkout,
}) => {
    const hasSelection = selectedMuscles.length > 0;

    const primaryLabel = hasSelection
        ? 'review workout'
        : hasUserRoutines && suggestedRoutine
          ? `start ${suggestedRoutine.name.toLowerCase()}`
          : 'browse presets';

    return (
        <View style={styles.bar}>
            <View style={styles.row1}>
                {hasSelection ? (
                    <Text style={styles.selectionHint}>
                        tap a muscle on the left to remove
                    </Text>
                ) : (
                    <Text style={styles.hintText}>{HINT_LINE}</Text>
                )}
            </View>

            <TouchableOpacity
                style={styles.primaryButton}
                onPress={onPrimaryPress}
                accessibilityRole="button"
                accessibilityLabel={primaryLabel}
            >
                <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
            </TouchableOpacity>

            <View style={styles.row3}>
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onPresets}
                    accessibilityRole="button"
                    accessibilityLabel="Presets"
                >
                    <Text style={styles.secondaryButtonText}>presets</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={onNewWorkout}
                    accessibilityRole="button"
                    accessibilityLabel="New workout"
                >
                    <Text style={styles.secondaryButtonText}>new workout</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const {
    bottomAreaHeight,
    bottomRow1Height,
    bottomRow2Height,
    bottomRow3Height,
    padding,
    rowGap,
    itemGap,
    borderWidth,
    buttonRadius,
} = PICK_WORKOUT_LAYOUT;

const styles = StyleSheet.create({
    bar: {
        height: bottomAreaHeight,
        backgroundColor: WORKOUT_COLORS.surfaceSecondary,
        paddingHorizontal: padding,
        paddingVertical: padding,
        gap: rowGap,
    },
    row1: {
        height: bottomRow1Height,
        flexDirection: 'row',
        alignItems: 'center',
    },
    hintText: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
    },
    selectionHint: {
        flex: 1,
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
    },
    primaryButton: {
        height: bottomRow2Height,
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
    row3: {
        height: bottomRow3Height,
        flexDirection: 'row',
        gap: itemGap,
    },
    secondaryButton: {
        flex: 1,
        height: bottomRow3Height,
        borderWidth,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: buttonRadius,
        backgroundColor: WORKOUT_COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    secondaryButtonText: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
});
