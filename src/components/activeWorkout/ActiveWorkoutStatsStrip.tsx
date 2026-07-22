import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { formatWorkoutClock } from '../../workout/workoutSelectors';

interface ActiveWorkoutStatsStripProps {
    elapsedSeconds: number;
    volume: number;
    sets: number;
}

export const ActiveWorkoutStatsStrip: React.FC<ActiveWorkoutStatsStripProps> = ({
    elapsedSeconds,
    volume,
    sets,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.stat}>
                <Text style={styles.label}>duration</Text>
                <Text style={[styles.value, styles.durationValue]}>{formatWorkoutClock(elapsedSeconds)}</Text>
            </View>
            <Text style={styles.separator}>|</Text>
            <View style={styles.stat}>
                <Text style={styles.label}>volume</Text>
                <Text style={styles.value}>{Math.round(volume).toLocaleString()}kg</Text>
            </View>
            <Text style={styles.separator}>|</Text>
            <View style={styles.stat}>
                <Text style={styles.label}>sets</Text>
                <Text style={styles.value}>{sets}</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: WORKOUT_COLORS.background,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
    },
    label: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.muted,
        textTransform: 'lowercase',
        marginBottom: 2,
    },
    value: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: WORKOUT_COLORS.text,
    },
    durationValue: {
        color: WORKOUT_COLORS.accent,
    },
    separator: {
        color: '#D0D0D0',
        fontSize: 16,
        paddingHorizontal: 4,
    },
});
