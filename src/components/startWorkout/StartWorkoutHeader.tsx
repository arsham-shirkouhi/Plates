import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../../constants/fonts';
import { textStyles } from '../../constants/theme';
import { WORKOUT_COLORS } from '../../workout/constants';

interface StartWorkoutHeaderProps {
    streak: number;
}

export const StartWorkoutHeader: React.FC<StartWorkoutHeaderProps> = ({ streak }) => {
    const dayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long' }).toLowerCase();

    return (
        <View style={styles.row}>
            <Text style={styles.title}>train today</Text>
            <Text style={styles.meta}>
                {dayLabel} · {streak} day streak
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
    },
    title: {
        ...textStyles.h3,
        color: WORKOUT_COLORS.text,
        textTransform: 'lowercase',
        flexShrink: 1,
    },
    meta: {
        ...textStyles.caption,
        color: WORKOUT_COLORS.placeholder,
        textTransform: 'lowercase',
        flexShrink: 0,
    },
});
