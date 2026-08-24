import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
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
    restActive: boolean;
    onExpand: () => void;
    onSkipRest: () => void;
    onCelebrate?: (origin: { x: number; y: number }) => void;
}

export const ActiveWorkoutMiniBar: React.FC<ActiveWorkoutMiniBarProps> = ({
    elapsedSeconds,
    exerciseName,
    completedSets,
    totalSets,
    restRemainingSeconds,
    restActive,
    onExpand,
    onSkipRest,
    onCelebrate,
}) => {
    const pulse = useRef(new Animated.Value(0)).current;
    const doneRef = useRef<View>(null);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(pulse, {
                toValue: 1,
                duration: 1800,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            })
        );
        loop.start();
        return () => loop.stop();
    }, [pulse]);

    const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
    const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });
    const iconPulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] });
    const iconPulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });

    const handleDone = () => {
        const node = doneRef.current;
        if (node && onCelebrate) {
            node.measureInWindow((x, y, width, height) => {
                onCelebrate({ x: x + width / 2, y: y + height / 2 });
            });
        }
        onSkipRest();
    };

    if (restActive) {
        return (
            <TouchableOpacity style={styles.container} activeOpacity={0.92} onPress={onExpand}>
                <View style={styles.row}>
                    <Ionicons name="expand-outline" size={20} color={WORKOUT_COLORS.text} />
                    <View style={styles.center}>
                        <Text style={styles.duration}>
                            {formatRestDuration(restRemainingSeconds)}
                        </Text>
                        <Text style={styles.meta} numberOfLines={1}>
                            resting
                        </Text>
                    </View>
                    <View style={styles.iconButtonWrap}>
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.iconPulse,
                                { transform: [{ scale: iconPulseScale }], opacity: iconPulseOpacity },
                            ]}
                        />
                        <TouchableOpacity
                            ref={doneRef}
                            style={styles.iconButton}
                            onPress={(event) => {
                                event.stopPropagation?.();
                                handleDone();
                            }}
                            accessibilityRole="button"
                            accessibilityLabel="Finish rest"
                        >
                            <Ionicons name="checkmark" size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
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
                <View style={styles.dotWrap}>
                    <Animated.View
                        pointerEvents="none"
                        style={[
                            styles.dotPulse,
                            { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
                        ]}
                    />
                    <View style={styles.dot} />
                </View>
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
    dotWrap: {
        width: 8,
        height: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: WORKOUT_COLORS.accent,
    },
    dotPulse: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: WORKOUT_COLORS.accent,
    },
    iconButtonWrap: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconPulse: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: WORKOUT_COLORS.accent,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: WORKOUT_COLORS.accent,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
