import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '../../workout/muscleGroups';

const SELECTION_PANEL_WIDTH = 136;

interface PickWorkoutSelectedListProps {
    selectedMuscles: MuscleGroup[];
    exerciseCount: number;
    onRemoveMuscle: (muscle: MuscleGroup) => void;
}

export const PickWorkoutSelectedList: React.FC<PickWorkoutSelectedListProps> = ({
    selectedMuscles,
    exerciseCount,
    onRemoveMuscle,
}) => {
    return (
        <View style={styles.panel}>
            <Text style={styles.heading}>selected</Text>

            <View style={styles.list}>
                {selectedMuscles.map((muscle, index) => (
                    <TouchableOpacity
                        key={muscle}
                        style={[styles.row, index < selectedMuscles.length - 1 && styles.rowBorder]}
                        onPress={() => onRemoveMuscle(muscle)}
                        accessibilityRole="button"
                        accessibilityLabel={`Remove ${MUSCLE_GROUP_LABELS[muscle]}`}
                        activeOpacity={0.6}
                    >
                        <Text style={styles.muscleName}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <Text style={styles.meta}>{exerciseCount} exercises</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    panel: {
        width: SELECTION_PANEL_WIDTH,
        justifyContent: 'center',
    },
    heading: {
        fontFamily: fonts.bold,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 16,
    },
    list: {
        backgroundColor: 'transparent',
    },
    row: {
        justifyContent: 'center',
        minHeight: 44,
        paddingVertical: 8,
    },
    rowBorder: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: WORKOUT_COLORS.divider,
    },
    muscleName: {
        fontFamily: fonts.regular,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    meta: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        marginTop: 16,
    },
});
