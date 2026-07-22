import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { SuggestedWorkout } from '../../workout/startWorkoutTypes';
import { formatSuggestedDetailLine } from '../../workout/startWorkoutSelectors';
import { MuscleRecencyMap } from '../../workout/muscleGroups';

interface SuggestedWorkoutCardProps {
    suggestion: SuggestedWorkout | null;
    recency: MuscleRecencyMap;
    hasHistory: boolean;
    onStart: () => void;
}

export const SuggestedWorkoutCard: React.FC<SuggestedWorkoutCardProps> = ({
    suggestion,
    recency,
    hasHistory,
    onStart,
}) => {
    if (!suggestion) return null;

    const { routine } = suggestion;
    const detailLine = formatSuggestedDetailLine(suggestion, recency, hasHistory);

    return (
        <View style={styles.card}>
            <View style={styles.copy}>
                <Text style={styles.label}>SUGGESTED</Text>
                <Text style={styles.name}>{routine.name}</Text>
                <Text style={styles.detail} numberOfLines={2}>
                    {detailLine}
                </Text>
            </View>
            <TouchableOpacity
                style={styles.startPill}
                onPress={onStart}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`Start ${routine.name}`}
            >
                <Text style={styles.startText}>start</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 12,
        padding: 14,
        backgroundColor: WORKOUT_COLORS.background,
        marginBottom: 18,
        gap: 12,
    },
    copy: {
        flex: 1,
        minWidth: 0,
    },
    label: {
        fontFamily: fonts.bold,
        fontSize: 11,
        color: WORKOUT_COLORS.placeholder,
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    name: {
        fontFamily: fonts.bold,
        fontSize: 18,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    detail: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
    },
    startPill: {
        backgroundColor: WORKOUT_COLORS.accent,
        borderWidth: 2,
        borderColor: WORKOUT_COLORS.border,
        borderRadius: 999,
        paddingHorizontal: 18,
        paddingVertical: 10,
        flexShrink: 0,
    },
    startText: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: WORKOUT_COLORS.background,
        textTransform: 'lowercase',
    },
});
