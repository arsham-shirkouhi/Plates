import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { rootNavigationRef } from '../navigation/rootNavigationRef';
import { useWorkoutOverlay } from '../contexts/WorkoutOverlayContext';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';
import { WorkoutHeaderSection } from '../components/WorkoutHeaderSection';
import { Button } from '../components/Button';
import { Confetti, ConfettiParticle } from '../components/Confetti';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { StartWorkoutBottomSheet } from '../components/StartWorkoutBottomSheet';
import { AddExerciseOverlay } from '../components/AddExerciseOverlay';
import { useOverlay } from '../contexts/OverlayContext';
import { PlateSlider } from '../components/PlateSlider';

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

function getWidgetCurrentExerciseLabel(workout: ActiveWorkout): string {
    if (workout.exercises.length === 0) {
        return 'no exercise';
    }
    const incomplete = workout.exercises.find(
        (ex) => ex.sets.length === 0 || !ex.sets.every((set) => set.completed)
    );
    const pick = incomplete ?? workout.exercises[workout.exercises.length - 1];
    return pick.name.toLowerCase();
}

function createUniqueId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Compact elapsed time for the minimized bar (e.g. 43s, 4m 12s, 1h 2m) */
function formatWorkoutDurationShort(totalSeconds: number): string {
    const t = Math.max(0, Math.floor(totalSeconds));
    if (t < 60) {
        return `${t}s`;
    }
    if (t < 3600) {
        const m = Math.floor(t / 60);
        const s = t % 60;
        return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    const h = Math.floor(t / 3600);
    const rem = t % 3600;
    const m = Math.floor(rem / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

const SCREEN_WIDTH = Dimensions.get('window').width;
/** Inset “card” on a dimmed backdrop — not edge-to-edge */
const WORKOUT_SHEET_MARGIN_H = 20;
const WORKOUT_SHEET_MARGIN_V = 4;
const WORKOUT_SHEET_MAX_WIDTH = 540;
/** Floating widget (minimized) — match sheet horizontal inset */
const WIDGET_FLOAT_BOTTOM = 10;
const WIDGET_BAR_HEIGHT = 62;
/** Minimized bar is a pill; radius animates down to the expanded card */
const WIDGET_SHELL_CORNER_RADIUS = 31;
const EXPANDED_SHELL_CORNER_RADIUS = 22;
/** Same offset as primary `Button` harsh drop shadow */
const WIDGET_HARSH_SHADOW_OFFSET_Y = 4;
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
    const { params: workoutRouteParams, mergeParams, close: closeWorkoutOverlay } = useWorkoutOverlay();
    const insets = useSafeAreaInsets();
    const { registerOverlay } = useOverlay();
    const [hasCompletedWorkout, setHasCompletedWorkout] = useState(false);
    const screenHeight = Dimensions.get('window').height;
    const headerHeight = 228; // Title bar + divider + stats row (tighter top padding)
    const navigationBarHeight = 0; // Nav bar hidden
    const sheetPaddingTop = insets.top + WORKOUT_SHEET_MARGIN_V;
    const sheetPaddingBottom = insets.bottom + WORKOUT_SHEET_MARGIN_V;
    const sheetInnerHeight = screenHeight - sheetPaddingTop - sheetPaddingBottom;
    const workoutBoxHeight = Math.max(160, sheetInnerHeight - headerHeight - 20);

    // Calculate available height for dashed box (accounting for navbar - browse button is commented out)
    const browseButtonHeight = 0; // Browse workouts button is commented out, so no height needed
    const headerActualHeight = 120; // Actual header section height (gradient overlaps, so smaller)
    const bottomSpacing = 30; // Minimal spacing to prevent going behind navbar
    const availableHeight = Math.max(
        200,
        sheetInnerHeight - headerActualHeight - navigationBarHeight - browseButtonHeight - bottomSpacing
    );
    /** Lay out card in safe area so nothing clips past screen edges */
    const innerWidth = SCREEN_WIDTH - insets.left - insets.right;
    const workoutSheetMaxWidth = Math.min(
        WORKOUT_SHEET_MAX_WIDTH,
        innerWidth - 2 * WORKOUT_SHEET_MARGIN_H
    );
    const expandedCardWidth = workoutSheetMaxWidth;
    const expandedCardLeft = insets.left + (innerWidth - expandedCardWidth) / 2;
    const widgetBarWidth = innerWidth - 2 * WORKOUT_SHEET_MARGIN_H;
    const widgetBarLeft = insets.left + WORKOUT_SHEET_MARGIN_H;
    const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
    /** Full workout sheet vs bottom mini bar (active workout only) */
    const [workoutSheetExpanded, setWorkoutSheetExpanded] = useState(true);
    const workoutExpandProgress = useRef(new Animated.Value(1)).current;
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
    const lastAddedExerciseIdsRef = useRef<string[]>([]);
    const lastTapRef = useRef<{ time: number }>({ time: 0 });
    const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [confettiParticles, setConfettiParticles] = useState<ConfettiParticle[]>([]);
    const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
    const [editorReps, setEditorReps] = useState('10');
    const [editorWeight, setEditorWeight] = useState(20);
    const [recentlyAddedExerciseIds, setRecentlyAddedExerciseIds] = useState<string[]>([]);
    const editorEntryAnim = useRef(new Animated.Value(0)).current;
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

    // Handle workout start from StartWorkout screen / bottom sheet (overlay params)
    useEffect(() => {
        const params = workoutRouteParams;
        if (params?.startWorkoutType) {
            const { startWorkoutType, workoutId } = params;

            if (startWorkoutType === 'schedule') {
                return;
            }

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

            mergeParams({ startWorkoutType: undefined, workoutId: undefined });
        }
    }, [workoutRouteParams, mergeParams]);

    useEffect(() => {
        if (workoutRouteParams?.startWorkoutPrompt) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setShowCountdown(true);
            setTimeout(() => {
                startCountdown();
            }, 50);
            mergeParams({ startWorkoutPrompt: undefined });
        }
    }, [workoutRouteParams, mergeParams]);

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

    useEffect(() => {
        if (!activeWorkout) {
            workoutExpandProgress.setValue(1);
            setWorkoutSheetExpanded(true);
        }
    }, [activeWorkout, workoutExpandProgress]);

    const handleSelectExercise = (exercise: { id: string; name: string }) => {
        if (!activeWorkout) return;
        const exerciseId = createUniqueId();

        const newExercise: Exercise = {
            id: exerciseId,
            name: exercise.name,
            sets: [
                {
                    id: createUniqueId(),
                    reps: '10',
                    weight: '0',
                },
            ],
        };

        setActiveWorkout((prev) => {
            if (!prev) {
                return prev;
            }
            return {
                ...prev,
                exercises: [newExercise, ...prev.exercises],
            };
        });
        lastAddedExerciseIdsRef.current.push(newExercise.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleOpenAddExerciseOverlay = () => {
        if (!activeWorkout) return;
        lastAddedExerciseIdsRef.current = [];
        setShowAddExerciseOverlay(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleSelectionCommitted = useCallback((_count: number) => {
        const addedIds = lastAddedExerciseIdsRef.current;
        if (addedIds.length > 0) {
            setRecentlyAddedExerciseIds((prev) => [...new Set([...prev, ...addedIds])]);
            setTimeout(() => {
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
            }, 30);
            setTimeout(() => {
                setRecentlyAddedExerciseIds((prev) => prev.filter((id) => !addedIds.includes(id)));
            }, 2400);
        }
        lastAddedExerciseIdsRef.current = [];
    }, [setRecentlyAddedExerciseIds]);

    const handleExercisePress = (exercise: Exercise) => {
        if (!activeWorkout) return;
        const lastCompleted = [...exercise.sets].reverse().find((set) => set.completed);
        setEditorReps(lastCompleted?.reps ?? '10');
        setEditorWeight(parseFloat(lastCompleted?.weight ?? '20') || 20);
        setEditingExerciseId(exercise.id);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

    // ExerciseDetail returns updates via overlay mergeParams (replaces stack focus listener)
    useEffect(() => {
        const params = workoutRouteParams as Record<string, unknown> | undefined;
        if (!params) return;

        if (params.updatedExercises && Array.isArray(params.updatedExercises)) {
            if (!activeWorkout) return;

            const updatedExercises = params.updatedExercises as Exercise[];

            setActiveWorkout({
                ...activeWorkout,
                exercises: updatedExercises,
            });

            const newlyCompletedIds = (params.newlyCompletedExerciseIds as string[]) || [];
            newlyCompletedIds.forEach((exerciseId: string) => {
                const exercise = updatedExercises.find((ex: Exercise) => ex.id === exerciseId);
                if (exercise) {
                    const itemRef = exerciseItemRefs.current.get(exerciseId);
                    if (itemRef) {
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

            mergeParams({
                startWorkoutType: undefined,
                workoutId: undefined,
                updatedExerciseId: undefined,
                updatedSets: undefined,
                updatedExercises: undefined,
                newlyCompletedExerciseIds: undefined,
            });
        } else if (params.updatedExerciseId && params.updatedSets) {
            handleUpdateExerciseSets(params.updatedExerciseId as string, params.updatedSets as Set[]);
            mergeParams({
                startWorkoutType: undefined,
                workoutId: undefined,
                updatedExerciseId: undefined,
                updatedSets: undefined,
            });
        }
    }, [workoutRouteParams, activeWorkout, mergeParams]);

    // Recalculate completed sets/reps when workout changes
    useEffect(() => {
        // This will trigger a re-render with updated completedSets and completedReps
    }, [activeWorkout]);

    useEffect(() => {
        if (!activeWorkout || !editingExerciseId) return;
        const exists = activeWorkout.exercises.some((exercise) => exercise.id === editingExerciseId);
        if (!exists) {
            setEditingExerciseId(null);
        }
    }, [activeWorkout, editingExerciseId]);

    const handleBackFromInlineEditor = () => {
        setEditingExerciseId(null);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleInlineAddSet = () => {
        if (!activeWorkout || !editingExerciseId) return;
        const repsValue = (parseInt(editorReps, 10) || 0).toString();
        const safeWeight = Number.isFinite(editorWeight) ? editorWeight : 0;
        const newSet: Set = {
            id: createUniqueId(),
            reps: repsValue,
            weight: safeWeight.toFixed(2),
            completed: true,
        };

        setActiveWorkout((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                exercises: prev.exercises.map((exercise) =>
                    exercise.id === editingExerciseId
                        ? { ...exercise, sets: [...exercise.sets, newSet] }
                        : exercise
                ),
            };
        });

        setEditorReps('10');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleInlineRemoveSet = (setId: string) => {
        if (!activeWorkout || !editingExerciseId) return;
        setActiveWorkout((prev) => {
            if (!prev) return prev;
            return {
                ...prev,
                exercises: prev.exercises.map((exercise) =>
                    exercise.id === editingExerciseId
                        ? { ...exercise, sets: exercise.sets.filter((set) => set.id !== setId) }
                        : exercise
                ),
            };
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const editingExercise = activeWorkout?.exercises.find((exercise) => exercise.id === editingExerciseId) ?? null;

    useEffect(() => {
        if (editingExercise) {
            editorEntryAnim.setValue(0);
            Animated.spring(editorEntryAnim, {
                toValue: 1,
                tension: 120,
                friction: 12,
                useNativeDriver: true,
            }).start();
        } else {
            editorEntryAnim.setValue(0);
        }
    }, [editingExercise, editorEntryAnim]);

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
            closeWorkoutOverlay();
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
        if (rootNavigationRef.isReady()) {
            rootNavigationRef.navigate('BrowseWorkouts');
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const formatTime = (minutes: number): string => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const formatWorkoutClock = (totalSeconds: number): string => {
        const hours = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    };

    const handleWorkoutSheetExpandToggle = useCallback(() => {
        if (!activeWorkout) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setWorkoutSheetExpanded((prev) => {
            const next = !prev;
            Animated.timing(workoutExpandProgress, {
                toValue: next ? 1 : 0,
                duration: 280,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: false,
            }).start();
            return next;
        });
    }, [activeWorkout, workoutExpandProgress]);

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

    const widgetBottomInset = insets.bottom + WIDGET_FLOAT_BOTTOM;
    const expandedSheetHeight = screenHeight - sheetPaddingTop - sheetPaddingBottom;

    const shellTop = workoutExpandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [screenHeight - WIDGET_BAR_HEIGHT - widgetBottomInset, sheetPaddingTop],
    });
    const shellLeft = workoutExpandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [widgetBarLeft, expandedCardLeft],
    });
    const shellWidth = workoutExpandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [widgetBarWidth, expandedCardWidth],
    });
    const shellHeight = workoutExpandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [WIDGET_BAR_HEIGHT, expandedSheetHeight],
    });
    const shellRadius = workoutExpandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [WIDGET_SHELL_CORNER_RADIUS, EXPANDED_SHELL_CORNER_RADIUS],
    });
    /** No full-screen dim when minimized */
    const backdropDimOpacity = workoutExpandProgress.interpolate({
        inputRange: [0, 0.15, 1],
        outputRange: [0, 1, 1],
    });
    /** Soft shadow on expanded card only; minimized uses harsh duplicate like `Button` */
    const widgetLiftShadowOpacity = workoutExpandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 0.14],
    });
    const widgetLiftShadowRadius = workoutExpandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 11],
    });
    const widgetLiftElevation = workoutExpandProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 9],
    });
    const widgetHarshShadowOpacity = workoutExpandProgress.interpolate({
        inputRange: [0, 0.18, 0.42, 1],
        outputRange: [1, 0.35, 0, 0],
    });
    const expandedLayerOpacity = workoutExpandProgress.interpolate({
        inputRange: [0, 0.22, 1],
        outputRange: [0, 1, 1],
    });
    const widgetLayerOpacity = workoutExpandProgress.interpolate({
        inputRange: [0, 0.3, 1],
        outputRange: [1, 0, 0],
    });
    /** Bottom black wash behind the floating pill — fades in as the sheet collapses */
    const widgetBottomDepthOpacity = workoutExpandProgress.interpolate({
        inputRange: [0, 0.12, 0.35, 0.65, 1],
        outputRange: [1, 0.88, 0.45, 0.08, 0],
    });

    return (
        <>
            <Animated.View
                pointerEvents={workoutSheetExpanded ? 'auto' : 'none'}
                style={[StyleSheet.absoluteFillObject, { opacity: backdropDimOpacity, zIndex: 0 }]}
            >
                <BlurView intensity={52} tint="default" style={StyleSheet.absoluteFillObject} />
            </Animated.View>

            {activeWorkout ? (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.workoutBottomDepthGradient,
                        {
                            top: shellTop,
                            opacity: widgetBottomDepthOpacity,
                            zIndex: 6,
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.42)']}
                        locations={[0.2, 1]}
                        start={{ x: 0.5, y: 0 }}
                        end={{ x: 0.5, y: 1 }}
                        style={StyleSheet.absoluteFillObject}
                    />
                </Animated.View>
            ) : null}

            <Animated.View
                pointerEvents="none"
                style={[
                    styles.workoutWidgetHarshShadow,
                    {
                        top: shellTop,
                        left: shellLeft,
                        width: shellWidth,
                        height: shellHeight,
                        borderRadius: shellRadius,
                        opacity: widgetHarshShadowOpacity,
                        transform: [{ translateY: WIDGET_HARSH_SHADOW_OFFSET_Y }],
                        zIndex: 9,
                    },
                ]}
            />
            <Animated.View
                pointerEvents="box-none"
                style={[
                    styles.workoutFloatingShell,
                    {
                        top: shellTop,
                        left: shellLeft,
                        width: shellWidth,
                        height: shellHeight,
                        borderRadius: shellRadius,
                        shadowOpacity: widgetLiftShadowOpacity,
                        shadowRadius: widgetLiftShadowRadius,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: widgetLiftElevation,
                    },
                ]}
            >
                <Animated.View
                    style={[styles.workoutExpandedLayer, { opacity: expandedLayerOpacity }]}
                    pointerEvents={workoutSheetExpanded ? 'auto' : 'none'}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        contentContainerStyle={[styles.scrollContent, { paddingBottom: 28 }]}
                        showsVerticalScrollIndicator={false}
                        scrollEventThrottle={16}
                        nestedScrollEnabled={true}
                        keyboardShouldPersistTaps="handled"
                        removeClippedSubviews={false}
                        scrollEnabled={workoutSheetExpanded}
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
                            topInset={12}
                            isEmpty={!activeWorkout}
                            isActive={!!activeWorkout}
                            completedSets={completedSets}
                            completedReps={completedReps}
                            totalSets={totalSets}
                            totalReps={totalReps}
                            workoutDuration={workoutTimer}
                            hasNeverLoggedWorkout={hasNeverLoggedWorkout}
                            onClosePress={() => closeWorkoutOverlay()}
                            sheetExpanded={workoutSheetExpanded}
                            onSheetExpandToggle={activeWorkout ? handleWorkoutSheetExpandToggle : undefined}
                            onFinishPress={activeWorkout ? handleFinishWorkout : undefined}
                            inlineEditorActive={!!editingExercise}
                            onInlineBackPress={editingExercise ? handleBackFromInlineEditor : undefined}
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
                                <View style={[styles.workoutBox, { height: workoutBoxHeight }]}>
                                    {editingExercise ? (
                                        <Animated.View
                                            style={[
                                                styles.inlineEditorContainer,
                                                {
                                                    opacity: editorEntryAnim,
                                                    transform: [
                                                        {
                                                            translateY: editorEntryAnim.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [20, 0],
                                                            }),
                                                        },
                                                        {
                                                            scale: editorEntryAnim.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: [0.97, 1],
                                                            }),
                                                        },
                                                    ],
                                                },
                                            ]}
                                        >
                                            <View style={styles.inlineEditorHeader}>
                                                <TouchableOpacity
                                                    style={styles.inlineEditorBackButton}
                                                    onPress={handleBackFromInlineEditor}
                                                    activeOpacity={0.7}
                                                >
                                                    <Ionicons name="chevron-back" size={20} color="#526EFF" />
                                                    <Text style={styles.inlineEditorBackText}>back</Text>
                                                </TouchableOpacity>
                                                <Text style={styles.inlineEditorTitle} numberOfLines={1}>
                                                    {editingExercise.name.toLowerCase()}
                                                </Text>
                                            </View>
                                            <ScrollView
                                                style={styles.inlineEditorSetsScroll}
                                                contentContainerStyle={styles.inlineEditorSetsContent}
                                                showsVerticalScrollIndicator={false}
                                            >
                                                {editingExercise.sets.filter((set) => set.completed).length === 0 ? (
                                                    <Text style={styles.inlineEditorEmptyText}>no sets yet, add your first set</Text>
                                                ) : (
                                                    editingExercise.sets
                                                        .filter((set) => set.completed)
                                                        .map((set, index) => (
                                                            <View key={set.id} style={styles.inlineEditorSetCard}>
                                                                <View style={styles.inlineEditorSetCardLeft}>
                                                                    <Text style={styles.inlineEditorSetCardTitle}>set {index + 1}</Text>
                                                                    <Text style={styles.inlineEditorSetCardMeta}>
                                                                        {(parseFloat(set.weight) || 0).toFixed(1)}kg x {set.reps}
                                                                    </Text>
                                                                </View>
                                                                <TouchableOpacity
                                                                    onPress={() => handleInlineRemoveSet(set.id)}
                                                                    activeOpacity={0.7}
                                                                >
                                                                    <Ionicons name="trash-outline" size={20} color="#E53935" />
                                                                </TouchableOpacity>
                                                            </View>
                                                        ))
                                                )}
                                            </ScrollView>
                                            <View style={styles.inlineEditorControls}>
                                                <PlateSlider
                                                    value={editorWeight}
                                                    onValueChange={setEditorWeight}
                                                    min={2.5}
                                                    max={250}
                                                    step={2.5}
                                                />
                                                <View style={styles.inlineEditorRepsRow}>
                                                    <TouchableOpacity
                                                        style={styles.inlineEditorRepsAdjust}
                                                        onPress={() => {
                                                            const next = Math.max(0, (parseInt(editorReps, 10) || 0) - 1);
                                                            setEditorReps(next.toString());
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }}
                                                    >
                                                        <Text style={styles.inlineEditorRepsAdjustText}>-</Text>
                                                    </TouchableOpacity>
                                                    <TextInput
                                                        style={styles.inlineEditorRepsInput}
                                                        value={editorReps}
                                                        onChangeText={setEditorReps}
                                                        keyboardType="numeric"
                                                        placeholder="10"
                                                        placeholderTextColor="#9E9E9E"
                                                    />
                                                    <TouchableOpacity
                                                        style={styles.inlineEditorRepsAdjust}
                                                        onPress={() => {
                                                            const next = (parseInt(editorReps, 10) || 0) + 1;
                                                            setEditorReps(next.toString());
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }}
                                                    >
                                                        <Text style={styles.inlineEditorRepsAdjustText}>+</Text>
                                                    </TouchableOpacity>
                                                </View>
                                                <Button
                                                    variant="primary"
                                                    title="add set"
                                                    onPress={handleInlineAddSet}
                                                    containerStyle={styles.inlineEditorAddSetButton}
                                                />
                                            </View>
                                        </Animated.View>
                                    ) : (
                                        <>
                                            <TouchableOpacity
                                                style={styles.fixedAddExerciseButton}
                                                onPress={handleOpenAddExerciseOverlay}
                                                activeOpacity={0.8}
                                                accessibilityRole="button"
                                                accessibilityLabel="Add exercise"
                                            >
                                                <Text style={styles.emptyWorkoutText}>tap to add exercise</Text>
                                            </TouchableOpacity>

                                            {/* Exercise List */}
                                            <View
                                                onStartShouldSetResponder={() => (activeWorkout.exercises.length > 0 ? true : false)}
                                                onResponderRelease={() => {
                                                    if (activeWorkout.exercises.length === 0) {
                                                        return;
                                                    }
                                                    const now = Date.now();
                                                    const DOUBLE_TAP_DELAY = 300;

                                                    if (now - lastTapRef.current.time < DOUBLE_TAP_DELAY) {
                                                        // Double tap detected - open add exercise overlay
                                                        handleOpenAddExerciseOverlay();
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
                                                    contentContainerStyle={styles.exercisesScrollContent}
                                                    showsVerticalScrollIndicator={false}
                                                    scrollEnabled={true}
                                                >
                                                    {activeWorkout.exercises.map((exercise, index) => {
                                                        const isComplete = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
                                                        return (
                                                            <ExerciseItem
                                                                key={exercise.id}
                                                                exercise={exercise}
                                                                isComplete={isComplete}
                                                                isNew={recentlyAddedExerciseIds.includes(exercise.id)}
                                                                onPress={() => handleExercisePress(exercise)}
                                                                onLongPress={() => handleDeleteExercise(exercise)}
                                                                onLayout={(ref) => {
                                                                    exerciseItemRefs.current.set(exercise.id, ref);
                                                                }}
                                                                isLast={index === activeWorkout.exercises.length - 1}
                                                            />
                                                        );
                                                    })}
                                                </ScrollView>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </Animated.View>
                        )}
                    </ScrollView>

                    <LinearGradient
                        colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.sheetBottomFade}
                        pointerEvents="none"
                    />
                </Animated.View>

                {activeWorkout ? (
                    <Animated.View
                        pointerEvents={workoutSheetExpanded ? 'none' : 'box-none'}
                        style={[styles.workoutWidgetRow, { opacity: widgetLayerOpacity }]}
                    >
                        <TouchableOpacity
                            style={styles.workoutWidgetSideIcon}
                            onPress={handleWorkoutSheetExpandToggle}
                            activeOpacity={0.65}
                            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                            accessibilityLabel="Maximize workout"
                        >
                            <Ionicons name="expand-outline" size={24} color="#252525" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.workoutWidgetCenter}
                            onPress={handleWorkoutSheetExpandToggle}
                            activeOpacity={0.88}
                            accessibilityRole="button"
                            accessibilityLabel="Expand workout"
                        >
                            <View style={styles.workoutWidgetPrimaryRow}>
                                <View style={styles.workoutWidgetDotWrap}>
                                    <View style={styles.workoutWidgetDotGlow} />
                                    <View style={styles.workoutWidgetDotCore} />
                                </View>
                                <Text style={styles.workoutWidgetDuration}>
                                    {formatWorkoutDurationShort(workoutTimer)}
                                </Text>
                            </View>
                            <Text style={styles.workoutWidgetExercise} numberOfLines={1}>
                                {getWidgetCurrentExerciseLabel(activeWorkout)}
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.workoutWidgetSideIcon}
                            onPress={handleFinishWorkout}
                            activeOpacity={0.65}
                            hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                            accessibilityLabel="Delete workout"
                        >
                            <Ionicons name="trash-outline" size={22} color="#E53935" />
                        </TouchableOpacity>
                    </Animated.View>
                ) : null}
            </Animated.View>

            <View style={styles.confettiLayer} pointerEvents="none">
                <Confetti particles={confettiParticles} />
            </View>

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
                onSelectionCommitted={handleSelectionCommitted}
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
        </>
    );
};

// Exercise Item Component with Strike-through Animation
interface ExerciseItemProps {
    exercise: Exercise;
    isComplete: boolean;
    isNew?: boolean;
    onPress: () => void;
    onLongPress: () => void;
    onLayout: (ref: { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void; getTextWidth: () => number }) => void;
    isLast?: boolean;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, isComplete, isNew = false, onPress, onLongPress, onLayout, isLast }) => {
    const itemRef = useRef<View>(null);
    const textRef = useRef<Text>(null);
    const [textWidth, setTextWidth] = useState(0);
    const newBadgeOpacity = useRef(new Animated.Value(0)).current;
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

    useEffect(() => {
        if (!isNew) {
            newBadgeOpacity.setValue(0);
            return;
        }
        newBadgeOpacity.setValue(1);
        Animated.sequence([
            Animated.timing(newBadgeOpacity, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.delay(1500),
            Animated.timing(newBadgeOpacity, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();
    }, [isNew, newBadgeOpacity]);

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
                        <Animated.View style={[styles.newSetHintBadge, { opacity: newBadgeOpacity }]}>
                            <Text style={styles.newSetHintText}>new - add weight & reps</Text>
                        </Animated.View>
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
    workoutBottomDepthGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    /** Offset #252525 slab — matches primary `Button` floating shadow */
    workoutWidgetHarshShadow: {
        position: 'absolute',
        backgroundColor: '#252525',
    },
    workoutFloatingShell: {
        position: 'absolute',
        backgroundColor: '#ffffff',
        borderWidth: 2.5,
        borderColor: '#252525',
        overflow: 'hidden',
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
    },
    workoutExpandedLayer: {
        flex: 1,
    },
    workoutWidgetRow: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: WIDGET_BAR_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        overflow: 'hidden',
    },
    workoutWidgetSideIcon: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    workoutWidgetCenter: {
        flex: 1,
        minWidth: 0,
        paddingHorizontal: 10,
        justifyContent: 'center',
    },
    workoutWidgetPrimaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutWidgetDotWrap: {
        width: 14,
        height: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    workoutWidgetDotGlow: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(82, 110, 255, 0.45)',
        shadowColor: '#526EFF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.85,
        shadowRadius: 6,
        elevation: 4,
    },
    workoutWidgetDotCore: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#526EFF',
    },
    workoutWidgetDuration: {
        fontSize: 15,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    workoutWidgetExercise: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#757575',
        textTransform: 'lowercase',
        marginTop: 1,
    },
    confettiLayer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 50,
        pointerEvents: 'none',
    },
    sheetBottomFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 130,
        zIndex: 5,
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
    },
    scrollContent: {
        flexGrow: 1,
        paddingLeft: 16,
        paddingRight: 16,
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
        marginBottom: 0,
        overflow: 'hidden',
    },
    exercisesScrollView: {
        flex: 1,
    },
    exercisesScrollContent: {
        paddingTop: 4,
        paddingHorizontal: 4,
        paddingBottom: 12,
    },
    fixedAddExerciseButton: {
        width: '100%',
        minHeight: 72,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(37, 37, 37, 0.28)',
        paddingVertical: 12,
        paddingHorizontal: 15,
        backgroundColor: 'rgba(82, 110, 255, 0.03)',
        marginTop: 2,
        marginBottom: 12,
    },
    emptyWorkoutText: {
        fontSize: 15,
        fontFamily: fonts.regular,
        color: 'rgba(37, 37, 37, 0.55)',
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
    newSetHintBadge: {
        position: 'absolute',
        right: 0,
        top: -8,
        backgroundColor: '#EEF3FF',
        borderWidth: 1.5,
        borderColor: '#526EFF',
        borderRadius: 999,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    newSetHintText: {
        fontSize: 10,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textTransform: 'lowercase',
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
    activeWorkoutContainer: {
        width: '100%',
    },
    inlineEditorContainer: {
        flex: 1,
        paddingHorizontal: 0,
        paddingBottom: 8,
    },
    inlineEditorHeader: {
        height: 44,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    inlineEditorBackButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingRight: 12,
    },
    inlineEditorBackText: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textTransform: 'lowercase',
    },
    inlineEditorTitle: {
        flex: 1,
        fontSize: 17,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    inlineEditorSetsScroll: {
        flex: 1,
    },
    inlineEditorSetsContent: {
        paddingBottom: 8,
        gap: 8,
    },
    inlineEditorEmptyText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        textAlign: 'center',
        marginTop: 18,
    },
    inlineEditorSetCard: {
        minHeight: 52,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
        backgroundColor: '#fff',
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    inlineEditorSetCardLeft: {
        flex: 1,
        marginRight: 10,
    },
    inlineEditorSetCardTitle: {
        fontSize: 13,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 2,
    },
    inlineEditorSetCardMeta: {
        fontSize: 13,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
    },
    inlineEditorControls: {
        borderTopWidth: 2,
        borderTopColor: '#F1F1F1',
        paddingTop: 8,
    },
    inlineEditorRepsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
        marginBottom: 8,
    },
    inlineEditorRepsAdjust: {
        width: 42,
        height: 42,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#252525',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fff',
    },
    inlineEditorRepsAdjustText: {
        fontSize: 24,
        lineHeight: 24,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    inlineEditorRepsInput: {
        flex: 1,
        height: 42,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#252525',
        paddingHorizontal: 12,
        backgroundColor: '#fff',
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
        textAlign: 'center',
    },
    inlineEditorAddSetButton: {
        width: '100%',
        marginTop: 0,
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

