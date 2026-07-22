import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { PICK_WORKOUT_LAYOUT, WORKOUT_COLORS } from '../../workout/constants';
import { MUSCLE_GROUP_LABELS, MuscleGroup } from '../../workout/muscleGroups';

const SELECTED_ACCENT = '#FF5151';
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
                        activeOpacity={0.7}
                    >
                        <View style={styles.accentBar} />
                        <Text style={styles.muscleName}>{MUSCLE_GROUP_LABELS[muscle]}</Text>
                        <Ionicons name="close" size={18} color={WORKOUT_COLORS.placeholder} />
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
        fontSize: 13,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
        marginBottom: 10,
    },
    list: {
        borderWidth: PICK_WORKOUT_LAYOUT.borderWidth,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: PICK_WORKOUT_LAYOUT.buttonRadius,
        backgroundColor: WORKOUT_COLORS.background,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
        paddingHorizontal: 12,
        paddingVertical: 10,
        gap: 10,
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: WORKOUT_COLORS.divider,
    },
    accentBar: {
        width: 3,
        height: 22,
        borderRadius: 2,
        backgroundColor: SELECTED_ACCENT,
    },
    muscleName: {
        flex: 1,
        fontFamily: fonts.bold,
        fontSize: 17,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
    },
    meta: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        marginTop: 10,
    },
});
