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
    Image,
    TextInput,
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
}

interface ActiveWorkout {
    id: string;
    startedAt: Date;
    exercises: Exercise[];
}

const SCREEN_WIDTH = Dimensions.get('window').width;

export const WorkoutScreen: React.FC = () => {
    const navigation = useNavigation<WorkoutScreenNavigationProp>();
    const route = useRoute<RouteProp<RootStackParamList, 'Workout'>>();
    const insets = useSafeAreaInsets();
    const screenHeight = Dimensions.get('window').height;
    const headerHeight = 200; // Header section height (gradient + header)
    const finishButtonHeight = 60; // Finish workout button height + margin
    const navigationBarHeight = 80; // Navigation bar height + bottom inset + padding
    const workoutBoxHeight = screenHeight - insets.top - headerHeight - finishButtonHeight - 50; // Minimal padding
    const [activeWorkout, setActiveWorkout] = useState<ActiveWorkout | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);
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

    // Calculate workout stats
    const exerciseCount = activeWorkout?.exercises.length || 0;
    const setCount = activeWorkout?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) || 0;
    const completedSets = activeWorkout?.exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(set => set.completed).length, 0) || 0;
    const totalSets = activeWorkout?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) || 0;
    const completedReps = activeWorkout?.exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(set => set.completed).reduce((repSum, set) => repSum + (parseInt(set.reps) || 0), 0), 0) || 0;
    const totalReps = activeWorkout?.exercises.reduce((sum, ex) =>
        sum + ex.sets.reduce((repSum, set) => repSum + (parseInt(set.reps) || 0), 0), 0) || 0;
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

        const newExercise: Exercise = {
            id: Date.now().toString(),
            name: 'new exercise',
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

                // Update all exercises
                const updatedExercises = activeWorkout.exercises.map(ex => {
                    const updated = params.updatedExercises.find((ue: Exercise) => ue.id === ex.id);
                    return updated || ex;
                });

                setActiveWorkout({
                    ...activeWorkout,
                    exercises: updatedExercises,
                });

                // Trigger confetti for newly completed exercises
                const newlyCompletedIds = params.newlyCompletedExerciseIds || [];
                newlyCompletedIds.forEach((exerciseId: string) => {
                    const exercise = updatedExercises.find(ex => ex.id === exerciseId);
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


    const handleFinishWorkout = () => {
        if (!activeWorkout) return;

        // TODO: Save workout to database
        setActiveWorkout(null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const formatTime = (minutes: number): string => {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
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
            >
                {/* Gradient Background */}
                <View style={[styles.gradientContainer, { height: 300 + insets.top }]}>
                    <Image
                        source={require('../../assets/images/top_gradient.png')}
                        style={styles.gradientImage}
                        resizeMode="cover"
                    />
                </View>

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
                />

                {/* Empty State or Active Workout */}
                {!activeWorkout ? (
                    <View style={styles.emptyStateContainer}>
                        <TouchableOpacity
                            style={styles.startWorkoutCard}
                            onPress={() => {
                                navigation.navigate('StartWorkout');
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.startWorkoutTextLarge}>pick a workout or create your own!</Text>
                            <Text style={styles.startWorkoutTextSmall}>tap to start!</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.activeWorkoutContainer}>
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
                                    <Ionicons name="add" size={24} color="#252525" />
                                </TouchableOpacity>
                            </View>

                            {/* Exercise List */}
                            <ScrollView
                                style={styles.exercisesScrollView}
                                contentContainerStyle={styles.exercisesScrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {activeWorkout.exercises.map((exercise, index) => {
                                    const isComplete = exercise.sets.length > 0 && exercise.sets.every((set) => set.completed);
                                    return (
                                        <ExerciseItem
                                            key={exercise.id}
                                            exercise={exercise}
                                            isComplete={isComplete}
                                            hasBorder={index < activeWorkout.exercises.length - 1}
                                            onPress={() => handleExercisePress(exercise)}
                                            onLayout={(ref) => {
                                                exerciseItemRefs.current.set(exercise.id, ref);
                                            }}
                                        />
                                    );
                                })}
                            </ScrollView>
                        </View>
                    </View>
                )}
            </ScrollView>

            {/* Confetti */}
            <Confetti particles={confettiParticles} />
        </View>
    );
};

// Exercise Item Component with Strike-through Animation
interface ExerciseItemProps {
    exercise: Exercise;
    isComplete: boolean;
    hasBorder: boolean;
    onPress: () => void;
    onLayout: (ref: { measureInWindow: (callback: (x: number, y: number, width: number, height: number) => void) => void; getTextWidth: () => number }) => void;
}

const ExerciseItem: React.FC<ExerciseItemProps> = ({ exercise, isComplete, hasBorder, onPress, onLayout }) => {
    const strikeThroughWidth = useRef(new Animated.Value(0)).current;
    const itemRef = useRef<View>(null);
    const textRef = useRef<Text>(null);
    const [textWidth, setTextWidth] = useState(0);

    useEffect(() => {
        if (isComplete && textWidth > 0) {
            // Animate strike-through to exact text width
            Animated.timing(strikeThroughWidth, {
                toValue: textWidth,
                duration: 400,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }).start();
        } else {
            strikeThroughWidth.setValue(0);
        }
    }, [isComplete, textWidth]);

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
            style={[
                styles.exerciseItem,
                hasBorder && styles.exerciseItemBorder
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.exerciseItemNameContainer}>
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
                {isComplete && (
                    <Animated.View
                        style={[
                            styles.strikeThrough,
                            {
                                width: strikeThroughWidth,
                            },
                        ]}
                    />
                )}
            </View>
            <Ionicons
                name={isComplete ? "checkmark-sharp" : "chevron-forward"}
                size={20}
                color={isComplete ? "#526EFF" : "#252525"}
            />
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
        justifyContent: 'center',
        paddingTop: 0,
        paddingBottom: 20,
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
        flex: 1,
        minHeight: Dimensions.get('window').height * 0.7,
    },
    startWorkoutTextLarge: {
        fontSize: 20,
        fontFamily: fonts.bold,
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
        paddingBottom: 0,
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
    exerciseItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 15,
    },
    exerciseItemBorder: {
        borderBottomWidth: 2,
        borderBottomColor: '#F0F0F0',
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
    strikeThrough: {
        position: 'absolute',
        left: 0,
        top: '50%',
        height: 2,
        backgroundColor: '#252525',
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
});

