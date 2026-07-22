import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { fonts } from '../../constants/fonts';
import { WORKOUT_COLORS } from '../../workout/constants';
import { formatRestDuration } from '../../workout/workoutSelectors';

interface RestTimerBarProps {
    remainingSeconds: number;
    progress: number;
    onAdjust: (deltaSeconds: number) => void;
    onSkip: () => void;
}

export const RestTimerBar: React.FC<RestTimerBarProps> = ({
    remainingSeconds,
    progress,
    onAdjust,
    onSkip,
}) => {
    return (
        <View style={styles.container}>
            <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            <View style={styles.row}>
                <Text style={styles.label}>rest</Text>
                <Text style={styles.countdown}>{formatRestDuration(remainingSeconds)}</Text>
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.adjustButton} onPress={() => onAdjust(-15)}>
                        <Text style={styles.adjustText}>-15s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.adjustButton} onPress={() => onAdjust(15)}>
                        <Text style={styles.adjustText}>+15s</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.skipButton} onPress={onSkip}>
                        <Text style={styles.skipText}>skip</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderTopWidth: 1,
        borderTopColor: '#ECECEC',
        backgroundColor: '#F7F8FF',
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: 12,
    },
    progressTrack: {
        height: 4,
        borderRadius: 999,
        backgroundColor: '#DDE2FF',
        overflow: 'hidden',
        marginBottom: 10,
    },
    progressFill: {
        height: '100%',
        backgroundColor: WORKOUT_COLORS.accent,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    label: {
        fontFamily: fonts.regular,
        fontSize: 13,
        color: WORKOUT_COLORS.muted,
        width: 36,
    },
    countdown: {
        flex: 1,
        fontFamily: fonts.bold,
        fontSize: 22,
        color: WORKOUT_COLORS.accent,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    adjustButton: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: '#ECEEFC',
    },
    adjustText: {
        fontFamily: fonts.bold,
        fontSize: 12,
        color: WORKOUT_COLORS.text,
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
