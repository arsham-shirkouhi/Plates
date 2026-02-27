import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Animated,
    Dimensions,
    Easing,
    // Image,
    TextInput,
    Modal,
    Alert,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { WorkoutHeaderSection } from '../components/WorkoutHeaderSection';
import { Button } from '../components/Button';
import { Confetti, ConfettiParticle } from '../components/Confetti';
import { LinearGradient } from 'expo-linear-gradient';
import { StartWorkoutBottomSheet } from '../components/StartWorkoutBottomSheet';
import { AddExerciseOverlay } from '../components/AddExerciseOverlay';
import { useOverlay } from '../contexts/OverlayContext';

type WorkoutScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Workout'>;

interface Exercise {
    id: string;
    name: string;
    sets: Set[];
}

interface Set {
    id: string;
    reps: string;
    weight: string;
    completed?: boolean;
}

interface ActiveWorkout {
    id: string;
    startedAt: Date;
    exercises: Exercise[];
    workoutName?: string;
}

interface WorkoutSummaryItem {
    id: string;
    name: string;
    topWeight: number;
    topReps: number;
    plateColor: string;
}

interface WorkoutSummary {
    dateLabel: string;
    durationLabel: string;
    totalWeight: number;
    totalSets: number;
    totalReps: number;
    exercises: WorkoutSummaryItem[];
}


const SCREEN_WIDTH = Dimensions.get('window').width;
const PLATE_WEIGHTS = [25, 20, 15, 10, 5, 2.5, 1.25];
const PLATE_COLORS: Record<number, string> = {
    25: '#D32F2F',
    20: '#1976D2',
    15: '#FFD600',
    10: '#2E7D32',
    5: '#F57C00',
    2.5: '#6D4C41',
    1.25: '#455A64',
};

export const WorkoutScreen: React.FC = () => {
    const navigation = useNavigation<WorkoutScreenNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, 'Workout'>>();
    const insets = useSafeAreaInsets();
    const { registerOverlay } = useOverlay();
    const [hasCompletedWorkout, setHasCompletedWorkout] = useState(false);
    const screenHeight = Dimensions.get('window').height;
    const headerHeight = 200; // Header section height (gradient + header)
    const finishButtonHeight = 60; // Finish workout button height + margin
    const navigationBarHeight = 0; // Nav bar hidden
    const workoutBoxHeight = screenHeight - insets.top - headerHeight - finishButtonHeight - 50; // Minimal padding

    // Calculate available height for dashed box (accounting for navbar - browse button is commented out)
    const browseButtonHeight = 0; // Browse workouts button is commented out, so no height needed
    const headerActualHeight = 120; // Actual header section height (gradient overlaps, so smaller)
    const bottomSpacing = 30; // Minimal spacing to prevent going behind navbar
    const availableHeight = screenHeight - insets.top - headerActualHeight - navigationBarHeight - browseButtonHeight - bottomSpacing;
    const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
    const [showStartWorkoutSheet, setShowStartWorkoutSheet] = useState(false);
    const [showCountdown, setShowCountdown] = useState(false);
    const [showAddExerciseOverlay, setShowAddExerciseOverlay] = useState(false);
    const [showWorkoutReceipt, setShowWorkoutReceipt] = useState(false);
    const [workoutSummary, setWorkoutSummary] = useState<WorkoutSummary | null>(null);
    const [countdownValue, setCountdownValue] = useState(3);
    const countdownScale = useRef(new Animated.Value(0)).current;
    const countdownOpacity = useRef(new Animated.Value(0)).current;
    const ring1Scale = useRef(new Animated.Value(0)).current;
    const ring1Opacity = useRef(new Animated.Value(0)).current;
    const ring2Scale = useRef(new Animated.Value(0)).current;
    const ring2Opacity = useRef(new Animated.Value(0)).current;
    const particlesOpacity = useRef(new Animated.Value(0)).current;
    const dashedBoxScale = useRef(new Animated.Value(1)).current;
    const dashedBoxOpacity = useRef(new Animated.Value(1)).current;
    const workoutFadeIn = useRef(new Animated.Value(0)).current;
    const receiptOpacity = useRef(new Animated.Value(0)).current;
    const receiptTranslateY = useRef(new Animated.Value(40)).current;
    const scrollViewRef = useRef<ScrollView>(null);
    const lastTapRef = useRef<{ time: number }>({ time: 0 });
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);
    const exerciseItemRefs = useRef<Map<string, { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void; getTextWidth: () => number }>>(new Map());

    // Mock function to load saved workout - in real app, this would fetch from database
    const loadSavedWorkout = (workoutId: string): { exercises: Exercise[]; name: string } => {
        // Mock saved workout data - replace with actual database call
        const mockWorkouts: Record<string, { exercises: Exercise[]; name: string }> = {
            '1': {
                name: 'Push Day',
                exercises: [
                    { id: '1', name: 'Bench Press', sets: [{ id: '1', reps: '10', weight: '135', completed: false }, { id: '2', reps: '8', weight: '155', completed: false }] },
                    { id: '2', name: 'Shoulder Press', sets: [{ id: '3', reps: '12', weight: '45', completed: false }] },
                    { id: '3', name: 'Tricep Dips', sets: [{ id: '4', reps: '15', weight: '0', completed: false }] },
                ],
            },
            '2': {
                name: 'Pull Day',
                exercises: [
                    { id: '4', name: 'Pull Ups', sets: [{ id: '5', reps: '10', weight: '0', completed: false }] },
                    { id: '5', name: 'Barbell Rows', sets: [{ id: '6', reps: '8', weight: '135', completed: false }] },
                ],
            },
            '3': {
                name: 'Leg Day',
                exercises: [
                    { id: '6', name: 'Squats', sets: [{ id: '7', reps: '12', weight: '225', completed: false }] },
                    { id: '7', name: 'Leg Press', sets: [{ id: '8', reps: '15', weight: '315', completed: false }] },
                ],
            },
        };
        return mockWorkouts[workoutId] || { exercises: [], name: '' };
    };

    // Handle workout start from StartWorkout screen
    useEffect(() => {
        const params = route.params;
        if (params?.startWorkoutType) {
            const { startWorkoutType, workoutId } = params;

            if (startWorkoutType === 'schedule') {
                // Schedule workout - don't start, just return
                return;
            }

            // Start a new workout
            if (workoutId) {
                const savedWorkout = loadSavedWorkout(workoutId);
                const newWorkout: ActiveWorkout = {
                    id: Date.now().toString(),
                    startedAt: new Date(),
                    exercises: savedWorkout.exercises,
                    workoutName: savedWorkout.name,
                };
                setActiveWorkout(newWorkout);
            } else {
                const newWorkout: ActiveWorkout = {
                    id: Date.now().toString(),
                    startedAt: new Date(),
                    exercises: [],
                };
                setActiveWorkout(newWorkout);
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            // Clear params after handling to prevent re-triggering
            navigation.setParams({ startWorkoutType: undefined, workoutId: undefined });
        }
    }, [route.params, navigation]);

    useEffect(() => {
        if (route.params?.startWorkoutPrompt) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCountdown(true);
            setTimeout(() => {
                startCountdown();
            }, 50);
            navigation.setParams({ startWorkoutPrompt: undefined });
        }
    }, [route.params, navigation]);

    // Calculate workout stats
    const exerciseCount = activeWorkout?.exercises.length || 0;
    const setCount = activeWorkout?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) || 0;
    const completedSets = activeWorkout?.exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(set => set.completed).length, 0) || 0;
    // Only count completed sets/reps toward totals shown in header.
    const totalSets = completedSets;
    const completedReps = activeWorkout?.exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(set => set.completed).reduce((repSum, set) => repSum + (parseInt(set.reps) || 0), 0), 0) || 0;
    const totalReps = completedReps;
    const [workoutDuration, setWorkoutDuration] = useState(0); // in minutes
    const [workoutTimer, setWorkoutTimer] = useState(0); // in seconds

    // Update workout duration and timer in real-time
    useEffect(() => {
        if (activeWorkout) {
            const updateDuration = () => {
                const elapsedMs = Date.now() - activeWorkout.startedAt.getTime();
                const minutes = Math.floor(elapsedMs / 1000 / 60);
                const seconds = Math.floor(elapsedMs / 1000);
                setWorkoutDuration(minutes);
                setWorkoutTimer(seconds);
            };

            updateDuration(); // Initial update
            durationIntervalRef.current = setInterval(updateDuration, 1000); // Update every second

            return () => {
                if (durationIntervalRef.current) {
                    clearInterval(durationIntervalRef.current);
                }
            };
        } else {
            setWorkoutDuration(0);
            setWorkoutTimer(0);
            if (durationIntervalRef.current) {
                clearInterval(durationIntervalRef.current);
            }
        }
    }, [activeWorkout]);


    const handleAddExercise = () => {
        if (!activeWorkout) return;
        // Open the add exercise overlay instead of directly adding
        setShowAddExerciseOverlay(true);
    };

    const handleSelectExercise = (exercise: { id: string; name: string }) => {
        if (!activeWorkout) return;

        const newExercise: Exercise = {
            id: Date.now().toString(),
            name: exercise.name,
            sets: [
                {
                    id: Date.now().toString(),
                    reps: '10',
                    weight: '0',
                },
            ],
        };

        setActiveWorkout({
            ...activeWorkout,
            exercises: [...activeWorkout.exercises, newExercise],
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSelectExerciseAndNavigate = (exercise: { id: string; name: string }, createdExercise: Exercise, allExercises: Exercise[], exerciseIndex: number) => {
        if (!activeWorkout) return;

        // Add the exercise to the workout
        const updatedExercises = [...activeWorkout.exercises, createdExercise];
        const updatedWorkout = {
            ...activeWorkout,
            exercises: updatedExercises,
        };
        setActiveWorkout(updatedWorkout);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // Navigate to ExerciseDetail screen with all exercises
        navigation.navigate('ExerciseDetail', {
            exercise: createdExercise,
            exerciseId: createdExercise.id,
            allExercises: updatedExercises,
            currentExerciseIndex: updatedExercises.length - 1, // Index of the newly added exercise
        });
    };


    const handleExercisePress = (exercise: Exercise) => {
        if (!activeWorkout) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const exerciseIndex = activeWorkout.exercises.findIndex(ex => ex.id === exercise.id);
        navigation.navigate('ExerciseDetail', {
            exercise: exercise,
            exerciseId: exercise.id,
            allExercises: activeWorkout.exercises,
            currentExerciseIndex: exerciseIndex,
        });
    };

    const handleDeleteExercise = (exercise: Exercise) => {
        if (!activeWorkout) return;

        Alert.alert(
            'Delete Exercise',
            `Are you sure you want to delete "${exercise.name}"?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setActiveWorkout({
                            ...activeWorkout,
                            exercises: activeWorkout.exercises.filter(ex => ex.id !== exercise.id),
                        });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    },
                },
            ]
        );
    };

    const handleRemoveExerciseFromOverlay = (exercise: { name: string }) => {
        if (!activeWorkout) return;
        const targetName = exercise.name.trim().toLowerCase();

        Alert.alert(
            'Delete Exercise',
            `Are you sure you want to delete "${exercise.name}"?`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        setActiveWorkout({
                            ...activeWorkout,
                            exercises: activeWorkout.exercises.filter(
                                (ex) => ex.name.trim().toLowerCase() !== targetName
                            ),
                        });
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    },
                },
            ]
        );
    };

    const handleUpdateExerciseSets = (exerciseId: string, updatedSets: Set[]) => {
        if (!activeWorkout) return;

        const exercise = activeWorkout.exercises.find((ex) => ex.id === exerciseId);
        if (!exercise) return;

        const wasComplete = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
        const isNowComplete = updatedSets.length > 0 && updatedSets.every((set) => set.completed);

        // Trigger confetti if exercise just became complete
        if (!wasComplete && isNowComplete) {
            const itemRef = exerciseItemRefs.current.get(exerciseId);
            if (itemRef) {
                itemRef.measureInWindow((x: number, y: number, width: number, height: number) => {
                    // Position confetti on the text itself
                    const textStartX = x + 15; // Left padding of exercise item
                    const actualTextWidth = itemRef.getTextWidth ? itemRef.getTextWidth() : exercise.name.length * 10; // Get actual measured text width or fallback
                    const centerY = y + height / 2;

                    // Distribute particles across the text width
                    const particleCount = 10;
                    const particles = Array.from({ length: particleCount }, (_, i) => {
                        const xOffset = actualTextWidth > 0 ? (i / (particleCount - 1)) * actualTextWidth : (i / particleCount) * width;
                        return {
                            id: Date.now() + i,
                            originX: textStartX + xOffset,
                            originY: centerY,
                            angle: (i / particleCount) * 360 + (Math.random() * 30 - 15), // Add some randomness
                            color: '#252525', // Black confetti
                        };
                    });
                    setConfettiParticles(particles);
                    setTimeout(() => setConfettiParticles([]), 500);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                });
            }
        }

        setActiveWorkout({
            ...activeWorkout,
            exercises: activeWorkout.exercises.map((ex) =>
                ex.id === exerciseId ? { ...ex, sets: updatedSets } : ex
            ),
        });
    };

    // Register countdown modal overlay state
    useEffect(() => {
        registerOverlay('WorkoutCountdown', showCountdown);
        return () => {
            registerOverlay('WorkoutCountdown', false);
        };
    }, [showCountdown, registerOverlay]);

    // Listen for navigation focus to handle exercise updates
    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            const params = route.params as any;

            // Handle multiple updated exercises (from ExerciseDetailScreen)
            if (params?.updatedExercises && Array.isArray(params.updatedExercises)) {
                if (!activeWorkout) return;

                // Store previous completion states
                const previousCompletionStates = new Map<string, boolean>();
                activeWorkout.exercises.forEach(ex => {
                    const wasComplete = ex.sets.length > 0 && ex.sets.every(set => set.completed);
                    previousCompletionStates.set(ex.id, wasComplete);
                });

                // Replace with the updated list (supports deletions)
                const updatedExercises = params.updatedExercises;

                setActiveWorkout({
                    ...activeWorkout,
                    exercises: updatedExercises,
                });

                // Trigger confetti for newly completed exercises
                const newlyCompletedIds = params.newlyCompletedExerciseIds || [];
                newlyCompletedIds.forEach((exerciseId: string) => {
                    const exercise = updatedExercises.find((ex: Exercise) => ex.id === exerciseId);
                    if (exercise) {
                        const itemRef = exerciseItemRefs.current.get(exerciseId);
                        if (itemRef) {
                            // Delay slightly to ensure layout is updated
                            setTimeout(() => {
                                itemRef.measureInWindow((x: number, y: number, width: number, height: number) => {
                                    const textStartX = x + 15;
                                    const actualTextWidth = itemRef.getTextWidth ? itemRef.getTextWidth() : exercise.name.length * 10;
                                    const centerY = y + height / 2;

                                    const particleCount = 10;
                                    const particles = Array.from({ length: particleCount }, (_, i) => {
                                        const xOffset = actualTextWidth > 0 ? (i / (particleCount - 1)) * actualTextWidth : (i / particleCount) * width;
                                        return {
                                            id: Date.now() + i + Math.random(),
                                            originX: textStartX + xOffset,
                                            originY: centerY,
                                            angle: (i / particleCount) * 360 + (Math.random() * 30 - 15),
                                            color: '#252525',
                                        };
                                    });
                                    setConfettiParticles(prev => [...prev, ...particles]);
                                    setTimeout(() => {
                                        setConfettiParticles(prev => {
                                            const particleIds = new Set(particles.map(p => p.id));
                                            return prev.filter(p => !particleIds.has(p.id));
                                        });
                                    }, 500);
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                });
                            }, 100);
                        }
                    }
                });

                // Clear params after handling
                navigation.setParams({
                    startWorkoutType: undefined,
                    workoutId: undefined,
                    updatedExerciseId: undefined,
                    updatedSets: undefined,
                    updatedExercises: undefined,
                    newlyCompletedExerciseIds: undefined,
                } as any);
            } else if (params?.updatedExerciseId && params?.updatedSets) {
                // Handle single exercise update (legacy)
                handleUpdateExerciseSets(params.updatedExerciseId, params.updatedSets);
                // Clear params after handling
                navigation.setParams({
                    startWorkoutType: undefined,
                    workoutId: undefined,
                    updatedExerciseId: undefined,
                    updatedSets: undefined
                } as any);
            }
        });

        return unsubscribe;
    }, [navigation, route.params, activeWorkout]);

    // Recalculate completed sets/reps when workout changes
    useEffect(() => {
        // This will trigger a re-render with updated completedSets and completedReps
    }, [activeWorkout]);


    const handleReceiptContinue = () => {
        Animated.parallel([
            Animated.timing(receiptOpacity, {
                toValue: 0,
                duration: 200,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.timing(receiptTranslateY, {
                toValue: 40,
                duration: 200,
                easing: Easing.in(Easing.ease),
                useNativeDriver: true,
            }),
        ]).start(() => {
            setShowWorkoutReceipt(false);
            setWorkoutSummary(null);
            setActiveWorkout(null);
            setHasCompletedWorkout(true);
        });
    };

    const handleFinishWorkout = () => {
        if (!activeWorkout) return;

        // Show native iOS-style alert
        Alert.alert(
            'Finish Workout',
            'Are you sure you want to finish this workout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Finish',
                    style: 'default',
                    onPress: () => {
                        // TODO: Save workout to database
                        const summary = buildWorkoutSummary(activeWorkout);
                        setWorkoutSummary(summary);
                        setShowWorkoutReceipt(true);
                        setActiveWorkout(null);
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                },
            ]
        );
    };

    const handleBrowseWorkouts = () => {
        navigation.navigate('BrowseWorkouts');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const formatTime = (minutes: number): string => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const formatReceiptDate = (date: Date): string => {
        const dayPart = date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
        const timePart = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
        });
        return `${dayPart} · ${timePart}`.toLowerCase();
    };

    const formatDurationLabel = (durationSeconds: number): string => {
        const totalSeconds = Math.max(0, Math.floor(durationSeconds));
        if (totalSeconds < 60) {
            return `${totalSeconds}s`;
        }
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
    };

    const formatWeightLabel = (value: number): string => {
        if (!Number.isFinite(value)) return '0';
        const rounded = Math.round(value * 10) / 10;
        return rounded % 1 === 0
            ? rounded.toLocaleString('en-US', { maximumFractionDigits: 0 })
            : rounded.toFixed(1);
    };

    const getClosestPlateColor = (weight: number): string => {
        if (!Number.isFinite(weight) || weight <= 0) return '#252525';
        let closest = PLATE_WEIGHTS[0];
        PLATE_WEIGHTS.forEach((plate) => {
            if (Math.abs(plate - weight) < Math.abs(closest - weight)) {
                closest = plate;
            }
        });
        return PLATE_COLORS[closest];
    };

    const buildWorkoutSummary = (workout: ActiveWorkout): WorkoutSummary => {
        const allSets = workout.exercises.flatMap((exercise) => exercise.sets);
        const completedOnly = allSets.filter((set) => set.completed);
        const summarySets = completedOnly.length > 0 ? completedOnly : allSets;
        const durationSeconds = Math.floor((Date.now() - workout.startedAt.getTime()) / 1000);
        const totalWeight = summarySets.reduce((sum, set) => {
            const weight = parseFloat(set.weight) || 0;
            const reps = parseInt(set.reps, 10) || 0;
            return sum + weight * reps;
        }, 0);
        const totalSets = summarySets.length;
        const totalReps = summarySets.reduce((sum, set) => sum + (parseInt(set.reps, 10) || 0), 0);
        const exercises = workout.exercises.map((exercise) => {
            const completedSetsForExercise = exercise.sets.filter((set) => set.completed);
            const setsForTop = completedSetsForExercise.length > 0 ? completedSetsForExercise : exercise.sets;
            let topSet = setsForTop[0];
            setsForTop.forEach((set) => {
                if (!topSet) {
                    topSet = set;
                    return;
                }
                const weight = parseFloat(set.weight) || 0;
                const topWeight = parseFloat(topSet.weight) || 0;
                if (weight > topWeight) {
                    topSet = set;
                }
            });
            const topWeight = topSet ? (parseFloat(topSet.weight) || 0) : 0;
            const topReps = topSet ? (parseInt(topSet.reps, 10) || 0) : 0;
            return {
                id: exercise.id,
                name: exercise.name,
                topWeight,
                topReps,
                plateColor: getClosestPlateColor(topWeight),
            };
        });

        return {
            dateLabel: formatReceiptDate(new Date()),
            durationLabel: formatDurationLabel(durationSeconds),
            totalWeight,
            totalSets,
            totalReps,
            exercises,
        };
    };



    // Determine if user has never logged a workout
    const hasNeverLoggedWorkout = !hasCompletedWorkout && !activeWorkout;
    useEffect(() => {
        if (!showWorkoutReceipt) return;
        receiptOpacity.setValue(0);
        receiptTranslateY.setValue(40);
        Animated.parallel([
            Animated.timing(receiptOpacity, {
                toValue: 1,
                duration: 250,
                easing: Easing.out(Easing.ease),
                useNativeDriver: true,
            }),
            Animated.spring(receiptTranslateY, {
                toValue: 0,
                tension: 120,
                friction: 10,
                useNativeDriver: true,
            }),
        ]).start();
    }, [showWorkoutReceipt]);

    // Ensure countdown is visible when Modal opens
    useEffect(() => {
        if (showCountdown) {
            // Reset and ensure countdown is visible
            countdownOpacity.setValue(1);
            countdownScale.setValue(0);
        }
    }, [showCountdown]);

    const handleStartWorkoutPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Alert.alert(
            'Start Workout',
            'Do you want to start a workout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
                },
                {
                    text: 'Start',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setShowCountdown(true);
                        // Small delay to ensure Modal is rendered before starting animation
                        setTimeout(() => {
                            startCountdown();
                        }, 50);
                    },
                },
            ],
            { cancelable: true }
        );
    };

    // Countdown function
    const startCountdown = () => {
        setCountdownValue(3);
        countdownScale.setValue(0);
        countdownOpacity.setValue(1);
        ring1Scale.setValue(0);
        ring1Opacity.setValue(0);
        ring2Scale.setValue(0);
        ring2Opacity.setValue(0);
        particlesOpacity.setValue(0);

        // Animate rings and particles
        const animateRings = () => {
            // Ring 1
            Animated.parallel([
                Animated.timing(ring1Scale, {
                    toValue: 1.5,
                    duration: 1000,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
                Animated.sequence([
                    Animated.timing(ring1Opacity, {
                        toValue: 0.6,
                        duration: 300,
                        useNativeDriver: true,
                    }),
                    Animated.timing(ring1Opacity, {
                        toValue: 0,
                        duration: 700,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();

            // Ring 2 (delayed)
            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(ring2Scale, {
                        toValue: 1.8,
                        duration: 1000,
                        easing: Easing.out(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.sequence([
                        Animated.timing(ring2Opacity, {
                            toValue: 0.4,
                            duration: 300,
                            useNativeDriver: true,
                        }),
                        Animated.timing(ring2Opacity, {
                            toValue: 0,
                            duration: 700,
                            useNativeDriver: true,
                        }),
                    ]),
                ]).start();
            }, 150);

            // Particles
            Animated.sequence([
                Animated.timing(particlesOpacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(particlesOpacity, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]).start();
        };

        // Initial animation for "3"
        animateRings();
        Animated.spring(countdownScale, {
            toValue: 1,
            tension: 100,
            friction: 7,
            useNativeDriver: true,
        }).start();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Countdown timer
        let currentValue = 3;
        const countdownInterval = setInterval(() => {
            currentValue -= 1;

            if (currentValue <= 0) {
                clearInterval(countdownInterval);
                // Show "GO!" for a moment, then start workout
                setCountdownValue(0);
                countdownScale.setValue(0);
                ring1Scale.setValue(0);
                ring1Opacity.setValue(0);
                ring2Scale.setValue(0);
                ring2Opacity.setValue(0);
                particlesOpacity.setValue(0);

                // Animate "GO!" with rings
                animateRings();
                Animated.spring(countdownScale, {
                    toValue: 1,
                    tension: 100,
                    friction: 7,
                    useNativeDriver: true,
                }).start();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

                setTimeout(() => {
                    startWorkoutWithAnimation();
                }, 500);
                return;
            }

            // Animate next number
            countdownScale.setValue(0);
            countdownOpacity.setValue(1);
            ring1Scale.setValue(0);
            ring1Opacity.setValue(0);
            ring2Scale.setValue(0);
            ring2Opacity.setValue(0);
            particlesOpacity.setValue(0);
            setCountdownValue(currentValue);

            animateRings();
            Animated.spring(countdownScale, {
                toValue: 1,
                tension: 100,
                friction: 7,
                useNativeDriver: true,
            }).start();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }, 1000);
    };

    // Start workout with transition animation
    const startWorkoutWithAnimation = () => {
        // Skip slow transitions and start immediately.
        dashedBoxScale.setValue(1);
        dashedBoxOpacity.setValue(0);
        workoutFadeIn.setValue(1);
        setShowCountdown(false);

        const newWorkout: ActiveWorkout = {
            id: Date.now().toString(),
            startedAt: new Date(),
            exercises: [],
        };
        setActiveWorkout(newWorkout);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                style={styles.scrollView}
                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                nestedScrollEnabled={true}
                keyboardShouldPersistTaps="handled"
                removeClippedSubviews={false}
                scrollEnabled={true}
                bounces={false}
                overScrollMode="never"
                alwaysBounceVertical={false}
                decelerationRate="normal"
            >
                {/* Header Section */}
                <WorkoutHeaderSection
                    exerciseCount={exerciseCount}
                    setCount={setCount}
                    duration={workoutDuration}
                    topInset={insets.top}
                    isEmpty={!activeWorkout}
                    isActive={!!activeWorkout}
                    completedSets={completedSets}
                    completedReps={completedReps}
                    totalSets={totalSets}
                    totalReps={totalReps}
                    workoutDuration={workoutTimer}
                    hasNeverLoggedWorkout={hasNeverLoggedWorkout}
                    onClosePress={() => navigation.goBack()}
                />

                {/* Empty State or Active Workout */}
                {!activeWorkout ? (
                    <View style={styles.emptyStateContainer}>
                        {/* Browse Workouts Button - Commented out */}
                        {/* <View style={styles.browseWorkoutsButtonContainer}>
                            <Button
                                variant={!hasCompletedWorkout ? "primary" : "secondary"}
                                title="Need inspiration?"
                                onPress={handleBrowseWorkouts}
                                containerStyle={styles.browseWorkoutsButton}
                            />
                        </View> */}

                        <Animated.View
                            style={[
                                styles.startWorkoutCard,
                                styles.startWorkoutCardWithButton,
                                {
                                    height: availableHeight - 10,
                                    transform: [{ scale: dashedBoxScale }],
                                    opacity: dashedBoxOpacity,
                                }
                            ]}
                        >
                            <TouchableOpacity
                                style={[StyleSheet.absoluteFill, { justifyContent: 'center', alignItems: 'center' }]}
                                onPress={handleStartWorkoutPress}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.startWorkoutTextLarge} numberOfLines={1}>Start today's workout!</Text>
                                <Text style={styles.startWorkoutTextSmall}>tap to start</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                ) : (
                    <Animated.View
                        style={[
                            styles.activeWorkoutContainer,
                            { opacity: workoutFadeIn }
                        ]}
                    >
                        {/* Finish Workout Button */}
                        <View style={styles.actionButtons}>
                            <Button
                                variant="primary"
                                title="finish workout"
                                onPress={handleFinishWorkout}
                                containerStyle={styles.finishWorkoutButton}
                            />
                        </View>

                        {/* Workout Box with Title and Exercises */}
                        <View style={[styles.workoutBox, { height: workoutBoxHeight }]}>
                            {/* Workout Name with Plus Icon */}
                            <View style={styles.workoutBoxHeader}>
                                {activeWorkout.workoutName && (
                                    <Text style={styles.workoutName}>{activeWorkout.workoutName}</Text>
                                )}
                                {!activeWorkout.workoutName && (
                                    <Text style={styles.workoutName}>workout</Text>
                                )}
                                <TouchableOpacity
                                    style={styles.addExerciseIconButton}
                                    onPress={handleAddExercise}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add" size={24} color="#526EFF" />
                                </TouchableOpacity>
                            </View>

                            {/* Exercise List */}
                            <View
                                onStartShouldSetResponder={() => true}
                                onResponderRelease={() => {
                                    const now = Date.now();
                                    const DOUBLE_TAP_DELAY = 300;

                                    if (now - lastTapRef.current.time < DOUBLE_TAP_DELAY) {
                                        // Double tap detected - open add exercise overlay
                                        setShowAddExerciseOverlay(true);
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        lastTapRef.current = { time: 0 };
                                    } else {
                                        // First tap - just record it
                                        lastTapRef.current = { time: now };
                                    }
                                }}
                                style={{ flex: 1 }}
                            >
                                <ScrollView
                                    style={styles.exercisesScrollView}
                                    contentContainerStyle={[
                                        styles.exercisesScrollContent,
                                        activeWorkout.exercises.length === 0 && styles.exercisesScrollContentEmpty
                                    ]}
                                    showsVerticalScrollIndicator={false}
                                    scrollEnabled={true}
                                >
                                    {activeWorkout.exercises.length === 0 ? (
                                        <View style={styles.emptyWorkoutPlaceholder}>
                                            <Text style={styles.emptyWorkoutText}>double tap to add workout</Text>
                                        </View>
                                    ) : (
                                        activeWorkout.exercises.map((exercise, index) => {
                                            const isComplete = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
                                            return (
                                                <ExerciseItem
                                                    key={exercise.id}
                                                    exercise={exercise}
                                                    isComplete={isComplete}
                                                    onPress={() => handleExercisePress(exercise)}
                                                    onLongPress={() => handleDeleteExercise(exercise)}
                                                    onLayout={(ref) => {
                                                        exerciseItemRefs.current.set(exercise.id, ref);
                                                    }}
                                                    isLast={index === activeWorkout.exercises.length - 1}
                                                />
                                            );
                                        })
                                    )}
                                </ScrollView>
                            </View>
                        </View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Confetti */}
            <Confetti particles={confettiParticles} />

            {/* White to transparent gradient behind buttons */}
            <LinearGradient
                colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                    {
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 150,
                        zIndex: 99, // Behind buttons but above content
                    },
                    { paddingBottom: insets.bottom }
                ]}
                pointerEvents="none"
            />

            {/* Start Workout Bottom Sheet */}
            <StartWorkoutBottomSheet
                visible={showStartWorkoutSheet}
                onClose={() => setShowStartWorkoutSheet(false)}
            />

            {/* Add Exercise Overlay */}
            <AddExerciseOverlay
                visible={showAddExerciseOverlay}
                onClose={() => setShowAddExerciseOverlay(false)}
                onSelectExercise={handleSelectExercise}
                onSelectExerciseAndNavigate={handleSelectExerciseAndNavigate}
                currentExerciseIds={activeWorkout?.exercises.map((exercise) => exercise.id) ?? []}
                currentExerciseNames={activeWorkout?.exercises.map((exercise) => exercise.name) ?? []}
                onRemoveExercise={handleRemoveExerciseFromOverlay}
            />

            {/* Workout Summary Receipt Overlay */}
            <Modal
                visible={showWorkoutReceipt && !!workoutSummary}
                transparent
                animationType="none"
                statusBarTranslucent={true}
                presentationStyle="overFullScreen"
                onRequestClose={handleReceiptContinue}
            >
                <View style={styles.receiptPage}>
                    <ScrollView
                        contentContainerStyle={[
                            styles.receiptScrollContent,
                            { paddingBottom: 120 + insets.bottom },
                        ]}
                        showsVerticalScrollIndicator={false}
                        scrollEventThrottle={16}
                        removeClippedSubviews={false}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        decelerationRate="normal"
                        bounces={true}
                        overScrollMode="auto"
                        scrollEnabled={true}
                    >
                        <Animated.View
                            style={[
                                styles.receiptContent,
                                {
                                    opacity: receiptOpacity,
                                    transform: [{ translateY: receiptTranslateY }],
                                },
                            ]}
                        >
                            <Text style={styles.receiptTitle}>workout complete!</Text>
                            <Text style={styles.receiptSubtitle}>{workoutSummary?.dateLabel}</Text>
                            {workoutSummary?.durationLabel && (
                                <Text style={styles.receiptSubline}>
                                    workout duration · {workoutSummary?.durationLabel}
                                </Text>
                            )}

                            <View style={styles.totalWeightSection}>
                                <View style={styles.totalWeightRow}>
                                    <View style={styles.redPlateIcon} />
                                    <Text style={styles.totalWeightValue}>
                                        {formatWeightLabel(workoutSummary?.totalWeight ?? 0)}kg
                                    </Text>
                                </View>
                                <Text style={styles.totalWeightLabel}>total weight lifted</Text>
                            </View>

                            <View style={styles.statsGrid}>
                                <View style={styles.statCard}>
                                    <Text style={styles.statValue}>{workoutSummary?.totalSets ?? 0}</Text>
                                    <Text style={styles.statLabel}>sets</Text>
                                </View>
                                <View style={styles.statCard}>
                                    <Text style={styles.statValue}>{workoutSummary?.totalReps ?? 0}</Text>
                                    <Text style={styles.statLabel}>reps</Text>
                                </View>
                            </View>

                            <View style={styles.exerciseListSection}>
                                <Text style={styles.exerciseListTitle}>set history</Text>
                                <ScrollView
                                    style={styles.exerciseListScroll}
                                    contentContainerStyle={styles.exerciseListContent}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {workoutSummary?.exercises.map((exercise) => (
                                        <View key={exercise.id} style={styles.exerciseRow}>
                                            <View style={[styles.exercisePlateDot, { backgroundColor: exercise.plateColor }]} />
                                            <Text style={styles.exerciseRowName} numberOfLines={1}>
                                                {exercise.name.toLowerCase()}
                                            </Text>
                                            <Text style={styles.exerciseRowValue}>
                                                {formatWeightLabel(exercise.topWeight)}kg
                                                {exercise.topReps > 0 ? ` x ${exercise.topReps}` : ''}
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            </View>

                        </Animated.View>
                    </ScrollView>
                    <View style={[styles.receiptFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                        <Button
                            variant="primary"
                            title="continue"
                            onPress={handleReceiptContinue}
                            containerStyle={styles.receiptFooterButton}
                        />
                    </View>
                </View>
            </Modal>

            {/* Countdown Overlay - Using Modal to ensure it's above navbar */}
            <Modal
                visible={showCountdown}
                transparent={true}
                animationType="none"
                statusBarTranslucent={true}
                presentationStyle="overFullScreen"
            >
                <View style={styles.countdownOverlay} pointerEvents="box-none">
                    {/* Animated Rings */}
                    <Animated.View
                        style={[
                            styles.countdownRing,
                            {
                                transform: [{ scale: ring1Scale }],
                                opacity: ring1Opacity,
                            },
                        ]}
                        pointerEvents="none"
                    />
                    <Animated.View
                        style={[
                            styles.countdownRing,
                            styles.countdownRing2,
                            {
                                transform: [{ scale: ring2Scale }],
                                opacity: ring2Opacity,
                            },
                        ]}
                        pointerEvents="none"
                    />

                    {/* Subtle Particles */}
                    <Animated.View
                        style={[
                            styles.countdownParticles,
                            { opacity: particlesOpacity },
                        ]}
                        pointerEvents="none"
                    >
                        <View style={[styles.particle, styles.particle1]} />
                        <View style={[styles.particle, styles.particle2]} />
                        <View style={[styles.particle, styles.particle3]} />
                        <View style={[styles.particle, styles.particle4]} />
                        <View style={[styles.particle, styles.particle5]} />
                        <View style={[styles.particle, styles.particle6]} />
                    </Animated.View>

                    {/* Countdown Number */}
                    <Animated.View
                        style={[
                            styles.countdownContainer,
                            {
                                transform: [{ scale: countdownScale }],
                                opacity: countdownOpacity,
                            },
                        ]}
                    >
                        {countdownValue > 0 ? (
                            <Text style={styles.countdownText}>{countdownValue}</Text>
                        ) : (
                            <Text style={styles.countdownText}>GO!</Text>
                        )}
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
};

// Exercise Item Component with Strike-through Animation
interface ExerciseItemProps {
    exercise: Exercise;
    isComplete: boolean;
    onPress: () => void;
    onLongPress: () => void;
    onLayout: (ref: { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void; getTextWidth: () => number }) => void;
    isLast?: boolean;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, isComplete, onPress, onLongPress, onLayout, isLast }) => {
    const itemRef = useRef<View>(null);
    const textRef = useRef<Text>(null);
    const [textWidth, setTextWidth] = useState(0);
    const completedSets = exercise.sets.filter(set => set.completed);
    const totalSets = exercise.sets.length;
    const lastCompletedSet = completedSets[completedSets.length - 1];
    const lastWeight = lastCompletedSet?.weight;
    const completedCount = completedSets.length;
    const averageWeight = completedCount > 0
        ? completedSets.reduce((sum, set) => sum + (parseFloat(set.weight) || 0), 0) / completedCount
        : 0;
    const averageReps = completedCount > 0
        ? completedSets.reduce((sum, set) => sum + (parseInt(set.reps) || 0), 0) / completedCount
        : 0;

    useEffect(() => {
        if (itemRef.current) {
            onLayout({
                measureInWindow: (callback) => {
                    itemRef.current?.measureInWindow(callback);
                },
                getTextWidth: () => textWidth,
            });
        }
    }, [onLayout, textWidth]);

    return (
        <TouchableOpacity
            ref={itemRef}
            onPress={onPress}
            activeOpacity={0.85}
            style={[styles.exerciseItemWrapper, isLast && styles.exerciseItemWrapperLast]}
        >
            <View style={styles.exerciseItemCard}>
                <View style={styles.exerciseItemHeader}>
                    <View style={styles.exerciseItemNameContainer}>
                        <Pressable
                            onLongPress={onLongPress}
                            delayLongPress={500}
                        >
                            <Text
                                ref={textRef}
                                style={styles.exerciseItemName}
                                onTextLayout={(event) => {
                                    const { width } = event.nativeEvent.lines[0] || { width: 0 };
                                    setTextWidth(width);
                                }}
                            >
                                {exercise.name}
                            </Text>
                        </Pressable>
                    </View>
                    <Ionicons
                        name={isComplete ? "checkmark-sharp" : "chevron-forward"}
                        size={20}
                        color={isComplete ? "#526EFF" : "#252525"}
                    />
                </View>
                <View style={styles.exerciseItemMetaRow}>
                    <View style={styles.exerciseItemMetaBlock}>
                        <Text style={styles.exerciseItemMetaLabel}>sets</Text>
                        <Text style={styles.exerciseItemMetaValue}>
                            {completedSets.length}/{totalSets}
                        </Text>
                    </View>
                    <View style={styles.exerciseItemMetaDivider} />
                    <View style={styles.exerciseItemMetaBlock}>
                        <Text style={styles.exerciseItemMetaLabel}>avg weight</Text>
                        <Text style={styles.exerciseItemMetaValue}>
                            {completedCount > 0 ? `${averageWeight.toFixed(1)}kg` : '--'}
                        </Text>
                    </View>
                    <View style={styles.exerciseItemMetaDivider} />
                    <View style={styles.exerciseItemMetaBlock}>
                        <Text style={styles.exerciseItemMetaLabel}>avg reps</Text>
                        <Text style={styles.exerciseItemMetaValue}>
                            {completedCount > 0 ? Math.round(averageReps) : '--'}
                        </Text>
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#fff',
    },
    gradientContainer: {
        width: Dimensions.get('window').width,
        marginLeft: -25,
        marginRight: -25,
        marginTop: 0,
        overflow: 'hidden',
        alignSelf: 'stretch',
    },
    gradientImage: {
        width: Dimensions.get('window').width,
        height: '100%',
        alignSelf: 'stretch',
    },
    scrollView: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    scrollContent: {
        flexGrow: 1,
        paddingLeft: 25,
        paddingRight: 25,
    },
    emptyStateContainer: {
        flex: 1,
        width: '100%',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: 0,
        paddingBottom: 0,
    },
    startWorkoutCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderRadius: 20,
        borderWidth: 2.5,
        borderStyle: 'dashed',
        borderColor: '#252525',
        paddingVertical: 60,
        paddingHorizontal: 32,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 0,
    },
    startWorkoutCardWithButton: {
        marginTop: 5,
    },
    startWorkoutTextLarge: {
        fontSize: 20,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 8,
        textAlign: 'center',
    },
    startWorkoutTextSmall: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    browseWorkoutsButtonContainer: {
        width: '100%',
        marginTop: 0,
        paddingHorizontal: 0,
    },
    browseWorkoutsButton: {
        width: '100%',
        marginTop: 0,
        marginBottom: 4,
    },

    workoutBox: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#252525',
        marginBottom: 16,
        overflow: 'hidden',
    },
    workoutBoxHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 6,
        paddingHorizontal: 15,
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
    },
    workoutName: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'left',
        flex: 1,
    },
    addExerciseIconButton: {
        padding: 4,
    },
    exercisesScrollView: {
        flex: 1,
    },
    exercisesScrollContent: {
        paddingTop: 12,
        paddingHorizontal: 12,
        paddingBottom: 14,
    },
    exercisesScrollContentEmpty: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyWorkoutPlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
    },
    emptyWorkoutText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: 'rgba(37, 37, 37, 0.3)',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    workoutSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#252525',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    summaryItem: {
        alignItems: 'center',
        flex: 1,
    },
    summaryLabel: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    summarySeparator: {
        width: 1,
        height: 30,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 16,
    },
    exerciseItemWrapper: {
        position: 'relative',
        marginBottom: 16,
        paddingBottom: 0,
    },
    exerciseItemWrapperLast: {
        marginBottom: 0,
    },
    exerciseItemCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
        paddingVertical: 12,
        paddingHorizontal: 15,
    },
    exerciseItemNameContainer: {
        flex: 1,
        position: 'relative',
    },
    exerciseItemName: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    exerciseItemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    exerciseItemMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
    },
    exerciseItemMetaBlock: {
        flex: 1,
    },
    exerciseItemMetaLabel: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 2,
    },
    exerciseItemMetaValue: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    exerciseItemMetaDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 12,
    },
    actionButtons: {
        marginTop: 0,
        marginBottom: 16,
        gap: 12,
        width: '100%',
    },
    finishWorkoutButton: {
        width: Dimensions.get('window').width - 50, // Match workout box width (screen width - 25px padding on each side)
        alignSelf: 'stretch',
    },
    activeWorkoutContainer: {
        width: '100%',
    },
    receiptPage: {
        flex: 1,
        backgroundColor: '#fff',
        position: 'relative',
        overflow: 'hidden',
    },
    receiptAuraTopRight: {
        position: 'absolute',
        top: -250,
        right: -250,
        width: 500,
        height: 500,
        zIndex: 0,
    },
    receiptAuraBottomLeft: {
        position: 'absolute',
        bottom: -250,
        left: -250,
        width: 500,
        height: 500,
        zIndex: 0,
    },
    receiptScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 20,
        alignItems: 'center',
    },
    receiptContent: {
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        zIndex: 1,
    },
    receiptTitle: {
        fontSize: 26,
        fontFamily: fonts.bold,
        textAlign: 'center',
        marginBottom: 4,
        textTransform: 'lowercase',
        color: '#252525',
    },
    receiptSubtitle: {
        fontSize: 16,
        fontFamily: fonts.regular,
        textAlign: 'center',
        marginBottom: 6,
        color: '#666',
        textTransform: 'lowercase',
    },
    receiptSubline: {
        fontSize: 14,
        fontFamily: fonts.regular,
        textAlign: 'center',
        marginBottom: 20,
        color: '#8A8A8A',
        textTransform: 'lowercase',
    },
    receiptFooter: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    receiptFooterButton: {
        width: '100%',
        maxWidth: 400,
    },
    totalWeightSection: {
        alignItems: 'center',
        marginBottom: 12,
    },
    totalWeightRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    redPlateIcon: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#D32F2F',
        borderWidth: 2,
        borderColor: '#252525',
        marginRight: 8,
    },
    totalWeightValue: {
        fontSize: 28,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    totalWeightLabel: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
        marginTop: 4,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        alignSelf: 'stretch',
        marginBottom: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: '#FFFFFF',
        borderWidth: 2,
        borderColor: '#252525',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    statLabel: {
        fontSize: 11,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
        marginTop: 2,
    },
    exerciseListSection: {
        alignSelf: 'stretch',
        marginBottom: 12,
    },
    exerciseListScroll: {
        maxHeight: 180,
    },
    exerciseListContent: {
        paddingBottom: 2,
    },
    exerciseListTitle: {
        fontSize: 12,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    exerciseRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    exercisePlateDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#252525',
        marginRight: 8,
    },
    exerciseRowName: {
        flex: 1,
        fontSize: 13,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
        marginRight: 8,
    },
    exerciseRowValue: {
        fontSize: 13,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    countdownOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    countdownContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    countdownText: {
        fontSize: 120,
        fontFamily: fonts.bold,
        color: '#fff',
        textTransform: 'uppercase',
    },
    countdownRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    countdownRing2: {
        width: 250,
        height: 250,
        borderRadius: 125,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    countdownParticles: {
        position: 'absolute',
        width: 300,
        height: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },
    particle: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
    },
    particle1: {
        top: 0,
        left: '50%',
        marginLeft: -2,
    },
    particle2: {
        top: '50%',
        right: 0,
        marginTop: -2,
    },
    particle3: {
        bottom: 0,
        left: '50%',
        marginLeft: -2,
    },
    particle4: {
        top: '50%',
        left: 0,
        marginTop: -2,
    },
    particle5: {
        top: '25%',
        right: '25%',
    },
    particle6: {
        bottom: '25%',
        left: '25%',
    },
});

