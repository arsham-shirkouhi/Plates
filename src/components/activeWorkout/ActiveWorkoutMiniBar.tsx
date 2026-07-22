import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { formatRestDuration, formatWorkoutDurationShort } from '../../workout/workoutSelectors';

interface ActiveWorkoutMiniBarProps {
    elapsedSeconds: number;
    exerciseName: string;
    completedSets: number;
    totalSets: number;
    restRemainingSeconds: number;
    restProgress: number;
    restActive: boolean;
    onExpand: () => void;
    onSkipRest: () => void;
}

export const ActiveWorkoutMiniBar: React.FC<ActiveWorkoutMiniBarProps> = ({
    elapsedSeconds,
    exerciseName,
    completedSets,
    totalSets,
    restRemainingSeconds,
    restProgress,
    restActive,
    onExpand,
    onSkipRest,
}) => {
    if (restActive) {
        return (
            <TouchableOpacity style={styles.container} activeOpacity={0.92} onPress={onExpand}>
                <View style={styles.restTrack}>
                    <View style={[styles.restFill, { width: `${Math.round(restProgress * 100)}%` }]} />
                </View>
                <View style={styles.restRow}>
                    <Text style={styles.restLabel}>rest</Text>
                    <Text style={styles.restCountdown}>{formatRestDuration(restRemainingSeconds)}</Text>
                    <TouchableOpacity
                        style={styles.skipButton}
                        onPress={(event) => {
                            event.stopPropagation?.();
                            onSkipRest();
                        }}
                    >
                        <Text style={styles.skipText}>skip</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity style={styles.container} activeOpacity={0.92} onPress={onExpand}>
            <View style={styles.row}>
                <Ionicons name="expand-outline" size={20} color={WORKOUT_COLORS.text} />
                <View style={styles.center}>
                    <Text style={styles.duration}>{formatWorkoutDurationShort(elapsedSeconds)}</Text>
                    <Text style={styles.meta} numberOfLines={1}>
                        {exerciseName.toLowerCase()} · {completedSets}/{totalSets} sets
                    </Text>
                </View>
                <View style={styles.dot} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 14,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    center: {
        flex: 1,
    },
    duration: {
        fontFamily: fonts.bold,
        fontSize: 15,
        color: WORKOUT_COLORS.text,
    },
    meta: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.muted,
        marginTop: 2,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: WORKOUT_COLORS.accent,
    },
    restTrack: {
        height: 4,
        borderRadius: 999,
        backgroundColor: '#DDE2FF',
        overflow: 'hidden',
        marginBottom: 8,
    },
    restFill: {
        height: '100%',
        backgroundColor: WORKOUT_COLORS.accent,
    },
    restRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    restLabel: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: WORKOUT_COLORS.muted,
        width: 34,
    },
    restCountdown: {
        flex: 1,
        fontFamily: fonts.bold,
        fontSize: 18,
        color: WORKOUT_COLORS.accent,
    },
    skipButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: WORKOUT_COLORS.text,
    },
    skipText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: '#fff',
    },
});
