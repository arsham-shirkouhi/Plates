import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import * as Haptics from 'expo-haptics';
import { Easing } from 'react-native';

interface WorkoutHeaderSectionProps {
    exerciseCount: number;
    setCount: number;
    duration: number; // in minutes
    topInset?: number;
    isEmpty?: boolean; // Show empty state text when true
    isActive?: boolean; // Show active workout stats (sets/reps) when true
    completedSets?: number;
    completedReps?: number;
    totalSets?: number; // Total sets across all exercises
    totalReps?: number; // Total reps across all sets
    workoutDuration?: number; // in seconds for timer
    hasNeverLoggedWorkout?: boolean; // True if user has never logged a workout
    onClosePress?: () => void;
}

export const WorkoutHeaderSection: React.FC<WorkoutHeaderSectionProps> = ({
    exerciseCount,
    setCount,
    duration,
    topInset = 0,
    isEmpty = false,
    isActive = false,
    completedSets = 0,
    completedReps = 0,
    totalSets = 0,
    totalReps = 0,
    workoutDuration = 0,
    hasNeverLoggedWorkout = false,
    onClosePress,
}) => {
    // Animation values for count-up
    const exerciseAnim = useRef(new Animated.Value(0)).current;
    const setAnim = useRef(new Animated.Value(0)).current;
    const durationAnim = useRef(new Animated.Value(0)).current;

    // Track previous values
    const prevExercise = useRef(0);
    const prevSet = useRef(0);
    const prevDuration = useRef(0);

    // Display values from animations
    const [displayExercise, setDisplayExercise] = useState(0);
    const [displaySet, setDisplaySet] = useState(0);
    const [displayDuration, setDisplayDuration] = useState(0);

    // Animation values for completed sets/reps (when active)
    const completedSetsAnim = useRef(new Animated.Value(0)).current;
    const completedRepsAnim = useRef(new Animated.Value(0)).current;
    const [displayCompletedSets, setDisplayCompletedSets] = useState(0);
    const [displayCompletedReps, setDisplayCompletedReps] = useState(0);
    const [displayTotalSets, setDisplayTotalSets] = useState(0);
    const [displayTotalReps, setDisplayTotalReps] = useState(0);

    // Animate completed sets/reps and exercise count when in active mode
    useEffect(() => {
        if (isActive) {
            const duration_ms = 300;

            exerciseAnim.setValue(displayExercise);
            completedSetsAnim.setValue(displayCompletedSets);
            completedRepsAnim.setValue(displayCompletedReps);

            // Update total sets/reps immediately (no animation needed)
            setDisplayTotalSets(totalSets || 0);
            setDisplayTotalReps(totalReps || 0);

            const exerciseListener = exerciseAnim.addListener(({ value }) => {
                setDisplayExercise(Math.round(value));
            });
            const setsListener = completedSetsAnim.addListener(({ value }) => {
                setDisplayCompletedSets(Math.round(value));
            });

            const repsListener = completedRepsAnim.addListener(({ value }) => {
                setDisplayCompletedReps(Math.round(value));
            });

            Animated.parallel([
                Animated.timing(exerciseAnim, {
                    toValue: exerciseCount || 0,
                    duration: duration_ms,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(completedSetsAnim, {
                    toValue: completedSets || 0,
                    duration: duration_ms,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
                Animated.timing(completedRepsAnim, {
                    toValue: completedReps || 0,
                    duration: duration_ms,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                }),
            ]).start();

            return () => {
                exerciseAnim.removeListener(exerciseListener);
                completedSetsAnim.removeListener(setsListener);
                completedRepsAnim.removeListener(repsListener);
            };
        }
    }, [exerciseCount, completedSets, completedReps, totalSets, totalReps, isActive]);

    // Animate values (only when not in active mode)
    useEffect(() => {
        if (isActive) {
            return;
        }

        const duration_ms = 800;

        const startExercise = displayExercise;
        const startSet = displaySet;
        const startDuration = displayDuration;

        exerciseAnim.setValue(startExercise);
        setAnim.setValue(startSet);
        durationAnim.setValue(startDuration);

        const exerciseListener = exerciseAnim.addListener(({ value }) => {
            setDisplayExercise(Math.round(value));
        });

        const setListener = setAnim.addListener(({ value }) => {
            setDisplaySet(Math.round(value));
        });

        const durationListener = durationAnim.addListener(({ value }) => {
            setDisplayDuration(Math.round(value));
        });

        Animated.parallel([
            Animated.timing(exerciseAnim, {
                toValue: exerciseCount,
                duration: duration_ms,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
            Animated.timing(setAnim, {
                toValue: setCount,
                duration: duration_ms,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
            Animated.timing(durationAnim, {
                toValue: duration,
                duration: duration_ms,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }),
        ]).start();

        prevExercise.current = exerciseCount;
        prevSet.current = setCount;
        prevDuration.current = duration;

        return () => {
            exerciseAnim.removeListener(exerciseListener);
            setAnim.removeListener(setListener);
            durationAnim.removeListener(durationListener);
        };
    }, [exerciseCount, setCount, duration, isActive]);

    const formatTime = (minutes: number): string => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const formatTimer = (seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    };

    return (
        <View style={[styles.container, { paddingTop: 25 }]}>
            {/* Stats row or Empty state text */}
            <View style={styles.topRow}>
                <View style={styles.statsSection}>
                    {isEmpty ? (
                        <View style={styles.emptyStateTextContainer}>
                            {hasNeverLoggedWorkout ? (
                                <>
                                    <Text style={styles.emptyStateTextSmall}>ready to workout?</Text>
                                    <Text style={styles.emptyStateTextLarge}>let's begin!</Text>
                                </>
                            ) : (
                                <>
                                    <Text style={styles.emptyStateTextSmall}>no workout yet</Text>
                                    <Text style={styles.emptyStateTextLarge}>today!</Text>
                                </>
                            )}
                        </View>
                    ) : isActive ? (
                        <>
                            <View style={styles.statsRowWithClose}>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>sets</Text>
                                    <Text style={styles.statValue}>{displayCompletedSets}</Text>
                                </View>
                                <Text style={styles.separator}>|</Text>
                                <View style={styles.statItem}>
                                    <Text style={styles.statLabel}>reps</Text>
                                    <Text style={styles.statValue}>{displayCompletedReps}</Text>
                                </View>
                            </View>
                            <View style={styles.timerRow}>
                                <Text style={styles.timerText}>{formatTimer(workoutDuration)}</Text>
                            </View>
                        </>
                    ) : (
                        <View style={styles.statsRowWithClose}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>exercises</Text>
                                <Text style={styles.statValue}>{displayExercise}</Text>
                            </View>
                            <Text style={styles.separator}>|</Text>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>sets</Text>
                                <Text style={styles.statValue}>{displaySet}</Text>
                            </View>
                            <Text style={styles.separator}>|</Text>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>time</Text>
                                <Text style={styles.statValue}>{formatTime(displayDuration)}</Text>
                            </View>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    onPress={onClosePress}
                    style={styles.closeInlineButton}
                    activeOpacity={0.7}
                    disabled={!onClosePress}
                >
                    <Ionicons name="close" size={26} color="#252525" />
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        paddingTop: 0,
        paddingBottom: 20,
        zIndex: 1,
        elevation: 1,
        marginTop: 50,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        position: 'relative',
    },
    statsSection: {
        flex: 1,
    },
    statsRowWithClose: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: -4,
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statLabel: {
        fontSize: 22,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        marginRight: 6,
    },
    statValue: {
        fontSize: 22,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    separator: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: 'rgba(37, 37, 37, 0.5)',
        marginHorizontal: 12,
    },
    emptyStateTextContainer: {
        flexDirection: 'column',
        alignItems: 'flex-start',
    },
    emptyStateTextSmall: {
        fontSize: 22,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: -3,
    },
    emptyStateTextLarge: {
        fontSize: 32,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    timerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    timerText: {
        fontSize: 32,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    closeInlineButton: {
        position: 'absolute',
        top: -2,
        right: 0,
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

