import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Easing,
    Dimensions,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { Button } from '../components/Button';
import { UndoToast } from '../components/UndoToast';
import { fonts } from '../constants/fonts';
import { PlateSlider } from '../components/PlateSlider';
import { Slider } from '../components/Slider';
import { getExerciseDetails } from '../services/exerciseService';

type ExerciseDetailScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ExerciseDetail'>;
type ExerciseDetailScreenRouteProp = RouteProp<RootStackParamList, 'ExerciseDetail'>;

interface Set {
    id: string;
    reps: string;
    weight: string;
    completed?: boolean;
}

interface Exercise {
    id: string;
    name: string;
    sets: Set[];
}

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

const getMiniPlateStack = (weightValue: number): number[] => {
    let remaining = Math.max(0, weightValue);
    const plates: number[] = [];
    PLATE_WEIGHTS.forEach((plate) => {
        const count = Math.floor((remaining + 1e-6) / plate);
        for (let i = 0; i < count; i += 1) {
            plates.push(plate);
        }
        remaining = Math.max(0, remaining - count * plate);
    });
    return plates;
};

const getMiniPlateSize = (weightValue: number): number => {
    const min = 12;
    const max = 20;
    const normalized = Math.min(25, Math.max(1.25, weightValue));
    const ratio = (normalized - 1.25) / (25 - 1.25);
    return min + ratio * (max - min);
};

export const ExerciseDetailScreen: React.FC = () => {
    const navigation = useNavigation<ExerciseDetailScreenNavigationProp>();
    const route = useRoute<ExerciseDetailScreenRouteProp>();
    const insets = useSafeAreaInsets();

    const { exercise: initialExercise, exerciseId, allExercises, currentExerciseIndex } = route.params;

    const exercises = allExercises || [initialExercise];
    const initialIndex = currentExerciseIndex !== undefined ? currentExerciseIndex : 0;
    const screenWidth = Dimensions.get('window').width;
    const horizontalScrollRef = useRef<ScrollView>(null);
    const historyScrollRef = useRef<ScrollView>(null);
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [exerciseStates, setExerciseStates] = useState<Map<string, { sets: Set[]; exercise: Exercise }>>(new Map());

    // Active set state
    const [activeReps, setActiveReps] = useState('10');
    const [activeWeight, setActiveWeight] = useState(20);
    const [activeSetNumber, setActiveSetNumber] = useState(1);
    const [selectedSetId, setSelectedSetId] = useState<string | null>(null);
    const [showSetToast, setShowSetToast] = useState(false);
    const [setToastMessage, setSetToastMessage] = useState('');
    const [setToastActionLabel, setSetToastActionLabel] = useState<string | undefined>(undefined);
    const lastAddedSetIdRef = useRef<string | null>(null);
    const activeSetTitleAnim = useRef(new Animated.Value(1)).current;
    const [detailsById, setDetailsById] = useState<Record<string, { equipment: string | null; bodyPart: string | null }>>({});
    const requestedEquipmentRef = useRef(new Set<string>());

    // Initialize exercise states
    useEffect(() => {
        const states = new Map<string, { sets: Set[]; exercise: Exercise }>();
        exercises.forEach(ex => {
            states.set(ex.id, {
                exercise: ex,
                sets: ex.sets.map(set => ({ ...set })),
            });
        });
        setExerciseStates(states);

        // Scroll to initial exercise
        setTimeout(() => {
            horizontalScrollRef.current?.scrollTo({
                x: initialIndex * screenWidth,
                animated: false,
            });
        }, 100);
    }, []);

    const currentExerciseState = exerciseStates.get(exercises[currentIndex]?.id);
    const [exercise, setExercise] = useState<Exercise>(currentExerciseState?.exercise || initialExercise);
    const [sets, setSets] = useState<Set[]>(currentExerciseState?.sets || initialExercise.sets);
    const setAnimations = useRef<Map<string, Animated.Value>>(new Map()).current;

    // Update current exercise when scroll position changes
    const handleScroll = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const newIndex = Math.round(offsetX / screenWidth);
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < exercises.length) {
            setCurrentIndex(newIndex);
            const newExerciseState = exerciseStates.get(exercises[newIndex].id);
            if (newExerciseState) {
                setExercise(newExerciseState.exercise);
                setSets(newExerciseState.sets.map(set => ({ ...set })));
            }
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    useEffect(() => {
        const currentState = exerciseStates.get(exercises[currentIndex]?.id);
        if (currentState) {
            setExercise(currentState.exercise);
            setSets(currentState.sets.map(set => ({ ...set })));
        }
    }, [currentIndex, exerciseStates]);

    useEffect(() => {
        const currentExerciseId = exercises[currentIndex]?.id;
        if (!currentExerciseId || requestedEquipmentRef.current.has(currentExerciseId)) return;
        requestedEquipmentRef.current.add(currentExerciseId);

        let cancelled = false;
        const loadDetails = async () => {
            const details = await getExerciseDetails(currentExerciseId);
            if (cancelled) return;
            setDetailsById(prev => ({
                ...prev,
                [currentExerciseId]: {
                    equipment: details?.Equipment ?? null,
                    bodyPart: details?.BodyPart ?? null,
                },
            }));
        };
        loadDetails();

        return () => {
            cancelled = true;
        };
    }, [currentIndex, exercises]);

    const currentDetails = detailsById[exercises[currentIndex]?.id];
    const currentEquipment = currentDetails?.equipment ?? null;
    const currentBodyPart = currentDetails?.bodyPart ?? null;
    const isBodyweight = !!currentEquipment && /body\s*only|bodyweight|body weight/i.test(currentEquipment);

    useEffect(() => {
        setActiveWeight(isBodyweight ? 0 : 20);
    }, [currentIndex, isBodyweight]);

    // Keep active set inputs visible at all times

    // Separate completed and active sets
    const completedSets = sets.filter(set => set.completed);
    const activeSets = sets.filter(set => !set.completed);

    useEffect(() => {
        // Reset selection and active set label when the exercise or its sets change.
        setSelectedSetId(null);
        setActiveSetNumber(completedSets.length + 1);
    }, [currentIndex, sets, completedSets.length]);

    useEffect(() => {
        activeSetTitleAnim.setValue(0.9);
        Animated.spring(activeSetTitleAnim, {
            toValue: 1,
            tension: 220,
            friction: 14,
            useNativeDriver: true,
        }).start();
    }, [activeSetNumber, activeSetTitleAnim]);


    const handleAddSet = () => {
        if (selectedSetId) {
            // Update selected set instead of adding a new one
            setSets(prevSets => {
                const updated = prevSets.map(set =>
                    set.id === selectedSetId
                        ? { ...set, reps: activeReps, weight: activeWeight.toFixed(2) }
                        : set
                );
                const currentState = exerciseStates.get(exercise.id);
                if (currentState) {
                    setExerciseStates(new Map(exerciseStates.set(exercise.id, {
                        ...currentState,
                        sets: updated,
                    })));
                }
                return updated;
            });
            setSelectedSetId(null);
            setActiveSetNumber(completedSets.length + 1);
            setSetToastMessage('set updated!');
            setSetToastActionLabel('ok');
            setShowSetToast(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            return;
        }

        // Add the active set to the exercise (marked as completed when added)
        const newSetId = Date.now().toString();
        const newSet: Set = {
            id: newSetId,
            reps: activeReps,
            weight: activeWeight.toFixed(2),
            completed: true, // Sets are completed when added to history
        };

        setSets(prevSets => {
            const updated = [...prevSets, newSet];
            const currentState = exerciseStates.get(exercise.id);
            if (currentState) {
                setExerciseStates(new Map(exerciseStates.set(exercise.id, {
                    ...currentState,
                    sets: updated,
                })));
            }
            return updated;
        });

        // Animate the new set card appearing
        const animValue = new Animated.Value(0);
        setAnimations.set(newSet.id, animValue);
        Animated.spring(animValue, {
            toValue: 1,
            tension: 200,
            friction: 15,
            useNativeDriver: true,
        }).start();

        // Carry forward last used weight, reset reps
        setActiveReps('10');
        setActiveWeight(parseFloat(newSet.weight));
        setActiveSetNumber(completedSets.length + 2);
        lastAddedSetIdRef.current = newSetId;
        setSetToastMessage('set added!');
        setSetToastActionLabel('undo');
        setShowSetToast(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    const handleToggleSetCompleted = (setId: string) => {
        setSets(prevSets => {
            const updatedSets = prevSets.map(set =>
                set.id === setId ? { ...set, completed: !set.completed } : set
            );
            const currentState = exerciseStates.get(exercise.id);
            if (currentState) {
                setExerciseStates(new Map(exerciseStates.set(exercise.id, {
                    ...currentState,
                    sets: updatedSets,
                })));
            }

            const completedSet = updatedSets.find(set => set.id === setId);
            if (completedSet?.completed) {
                const animValue = setAnimations.get(setId) || new Animated.Value(0);
                setAnimations.set(setId, animValue);
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }).start();
            } else {
                const animValue = setAnimations.get(setId);
                if (animValue) {
                    animValue.setValue(0);
                }
            }

            return updatedSets;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRemoveSet = (setId: string) => {
        const removeAnim = setAnimations.get(setId) || new Animated.Value(1);
        setAnimations.set(setId, removeAnim);

        Animated.timing(removeAnim, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            setSets(prevSets => {
                const updated = prevSets.filter(set => set.id !== setId);
                const currentState = exerciseStates.get(exercise.id);
                if (currentState) {
                    setExerciseStates(new Map(exerciseStates.set(exercise.id, {
                        ...currentState,
                        sets: updated,
                    })));
                }
                return updated;
            });
            setAnimations.delete(setId);
        });

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleClose = () => {
        const updatedExercises = Array.from(exerciseStates.values()).map(state => ({
            id: state.exercise.id,
            name: state.exercise.name,
            sets: state.sets,
        }));

        const newlyCompletedExercises: string[] = [];
        updatedExercises.forEach(updatedEx => {
            const originalEx = exercises.find(ex => ex.id === updatedEx.id);
            if (originalEx) {
                const wasComplete = originalEx.sets.length > 0 && originalEx.sets.every(set => set.completed);
                const isNowComplete = updatedEx.sets.length > 0 && updatedEx.sets.every(set => set.completed);
                if (!wasComplete && isNowComplete) {
                    newlyCompletedExercises.push(updatedEx.id);
                }
            }
        });

        navigation.navigate('Workout', {
            updatedExercises: updatedExercises,
            newlyCompletedExerciseIds: newlyCompletedExercises,
        } as any);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleDeleteExercise = () => {
        Alert.alert(
            'Delete Exercise',
            `Remove "${exercise.name}" from this workout?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        // Remove current exercise from the list
                        const updatedExercises = exercises.filter(ex => ex.id !== exercise.id);

                        // Update exercise states to remove the deleted exercise
                        const newExerciseStates = new Map(exerciseStates);
                        newExerciseStates.delete(exercise.id);
                        setExerciseStates(newExerciseStates);

                        // Navigate back with updated exercises (excluding the deleted one)
                        const exercisesToReturn = Array.from(newExerciseStates.values()).map(state => ({
                            id: state.exercise.id,
                            name: state.exercise.name,
                            sets: state.sets,
                        }));

                        navigation.navigate('Workout', {
                            updatedExercises: exercisesToReturn,
                            newlyCompletedExerciseIds: [],
                        } as any);
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    },
                },
            ]
        );
    };

    const renderExercisePage = (ex: Exercise, index: number) => {
        const exerciseState = exerciseStates.get(ex.id);
        const exerciseSets = exerciseState?.sets || ex.sets;
        const isCurrent = index === currentIndex;
        const pageCompletedSets = exerciseSets.filter(set => set.completed);
        const pageActiveSets = exerciseSets.filter(set => !set.completed);

        return (
            <View key={ex.id} style={{ width: screenWidth, flex: 1 }}>
                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={0}
                >
                    <View style={[styles.content, { paddingTop: insets.top }]}>
                        {/* Header */}
                        <View style={styles.headerContainer}>
                            <View style={styles.header}>
                                <TouchableOpacity
                                    style={styles.backButton}
                                    onPress={handleClose}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="chevron-back" size={24} color="#526EFF" />
                                </TouchableOpacity>
                                <View style={styles.headerCenter}>
                                    <Text style={styles.headerTitle}>{ex.name.toLowerCase()}</Text>
                                    {!!currentBodyPart && (
                                        <Text style={styles.headerSubtitle}>{currentBodyPart.toLowerCase()}</Text>
                                    )}
                                </View>
                                <TouchableOpacity
                                    style={styles.deleteExerciseButton}
                                    onPress={handleDeleteExercise}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={24} color="#FF5252" />
                                </TouchableOpacity>
                            </View>
                        </View>
                        <View style={styles.headerDivider} />

                        {/* Split Section Layout */}
                        <View style={styles.splitContainer}>
                            {/* Top Section: Previous Sets (History) */}
                            <View style={styles.historySection}>
                                <ScrollView
                                    horizontal
                                    pagingEnabled
                                    showsHorizontalScrollIndicator={false}
                                    onScroll={(event) => {
                                        const offsetX = event.nativeEvent.contentOffset.x;
                                        const pageWidth = screenWidth - 40;
                                        const newIndex = Math.round(offsetX / pageWidth);
                                        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < exercises.length) {
                                            setCurrentIndex(newIndex);
                                            const newExerciseState = exerciseStates.get(exercises[newIndex].id);
                                            if (newExerciseState) {
                                                setExercise(newExerciseState.exercise);
                                                setSets(newExerciseState.sets.map(set => ({ ...set })));
                                            }
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            // Sync the main horizontal scroll
                                            horizontalScrollRef.current?.scrollTo({
                                                x: newIndex * screenWidth,
                                                animated: true,
                                            });
                                        }
                                    }}
                                    scrollEventThrottle={16}
                                    ref={historyScrollRef}
                                    style={styles.historyScroll}
                                    contentContainerStyle={styles.historyScrollContent}
                                >
                                    {exercises.map((ex, exerciseIndex) => {
                                        const exerciseState = exerciseStates.get(ex.id);
                                        const exerciseCompletedSets = exerciseState?.sets.filter(s => s.completed) || [];
                                        const isCurrentExercise = exerciseIndex === currentIndex;

                                        const canScrollSets = exerciseCompletedSets.length > 3;

                                        return (
                                            <ScrollView
                                                key={ex.id}
                                                style={[styles.historyPage, { width: screenWidth - 40 }]}
                                                contentContainerStyle={styles.historyContent}
                                                showsVerticalScrollIndicator={false}
                                                scrollEnabled={canScrollSets}
                                            >
                                                {exerciseCompletedSets.length === 0 ? (
                                                    <View style={styles.emptyState}>
                                                        <Text style={styles.emptyStateText}>no completed sets yet</Text>
                                                    </View>
                                                ) : (
                                                    exerciseCompletedSets.map((set, setIndex) => {
                                                        const animValue = setAnimations.get(set.id) || new Animated.Value(1);
                                                        if (!setAnimations.has(set.id)) {
                                                            setAnimations.set(set.id, animValue);
                                                        }
                                                        const setWeightValue = parseFloat(set.weight);
                                                        const miniPlates = getMiniPlateStack(
                                                            Number.isFinite(setWeightValue) ? setWeightValue : 0
                                                        );

                                                        const handleSelectSet = () => {
                                                            if (selectedSetId === set.id) {
                                                                setSelectedSetId(null);
                                                                setActiveSetNumber(completedSets.length + 1);
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                                return;
                                                            }
                                                            const parsedWeight = parseFloat(set.weight);
                                                            setActiveWeight(Number.isFinite(parsedWeight) ? parsedWeight : 0);
                                                            setActiveReps(set.reps || '0');
                                                            setActiveSetNumber(setIndex + 1);
                                                            setSelectedSetId(set.id);
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        };

                                                        return (
                                                            <TouchableOpacity
                                                                key={set.id}
                                                                activeOpacity={0.8}
                                                                onPress={handleSelectSet}
                                                            >
                                                                <View style={styles.setCardWrapper}>
                                                                    <Animated.View
                                                                        style={[
                                                                            styles.setCard,
                                                                            selectedSetId === set.id && styles.setCardSelected,
                                                                            {
                                                                                opacity: animValue,
                                                                                transform: [
                                                                                    {
                                                                                        scale: animValue.interpolate({
                                                                                            inputRange: [0, 1],
                                                                                            outputRange: [0.8, 1],
                                                                                        }),
                                                                                    },
                                                                                ],
                                                                            },
                                                                        ]}
                                                                    >
                                                                        <View style={styles.setCardHeader}>
                                                                            <View style={styles.setNumberRow}>
                                                                                <Text style={styles.setNumber}>set {setIndex + 1}</Text>
                                                                                {selectedSetId === set.id && (
                                                                                    <View style={styles.setEditingPill}>
                                                                                        <Text style={styles.setEditingText}>editing</Text>
                                                                                    </View>
                                                                                )}
                                                                            </View>
                                                                            {isCurrentExercise && (
                                                                                <TouchableOpacity
                                                                                    onPress={() => handleRemoveSet(set.id)}
                                                                                    activeOpacity={0.7}
                                                                                >
                                                                                    <Ionicons name="close" size={20} color="#252525" />
                                                                                </TouchableOpacity>
                                                                            )}
                                                                        </View>
                                                                        <View style={styles.setCardContent}>
                                                                            <View style={styles.setCardStats}>
                                                                                <View style={styles.setCardStat}>
                                                                                    <Text style={styles.setCardLabel}>weight</Text>
                                                                                    <Text style={[styles.setCardValue, styles.setCardWeightValue]}>
                                                                                        {Number.isFinite(parseFloat(set.weight))
                                                                                            ? `${parseFloat(set.weight).toFixed(1)}kg`
                                                                                            : `${set.weight}kg`}
                                                                                    </Text>
                                                                                </View>
                                                                                <View style={styles.setCardDivider} />
                                                                                <View style={styles.setCardStat}>
                                                                                    <Text style={styles.setCardLabel}>reps</Text>
                                                                                    <Text style={styles.setCardValue}>{set.reps}</Text>
                                                                                </View>
                                                                            </View>
                                                                            <View style={styles.miniPlateStack}>
                                                                                {miniPlates.map((plate, plateIndex) => {
                                                                                    const size = getMiniPlateSize(plate);
                                                                                    return (
                                                                                        <View
                                                                                            key={`${set.id}-plate-${plateIndex}-${plate}`}
                                                                                            style={[
                                                                                                styles.miniPlate,
                                                                                                {
                                                                                                    width: size,
                                                                                                    height: size,
                                                                                                    borderRadius: size / 2,
                                                                                                    backgroundColor: PLATE_COLORS[plate] || '#8E8E93',
                                                                                                    marginLeft: plateIndex === 0 ? 0 : -Math.max(4, size * 0.35),
                                                                                                },
                                                                                            ]}
                                                                                        />
                                                                                    );
                                                                                })}
                                                                            </View>
                                                                        </View>
                                                                    </Animated.View>
                                                                </View>
                                                            </TouchableOpacity>
                                                        );
                                                    })
                                                )}
                                            </ScrollView>
                                        );
                                    })}
                                </ScrollView>

                                {/* Pagination Indicator */}
                                {exercises.length > 1 && (
                                    <View style={styles.paginationContainer}>
                                        {exercises.map((_, idx) => (
                                            <View
                                                key={idx}
                                                style={[
                                                    styles.paginationDot,
                                                    idx === currentIndex && styles.paginationDotActive,
                                                ]}
                                            />
                                        ))}
                                    </View>
                                )}
                            </View>

                            {/* Bottom Section: Active Set Input */}
                            <View style={styles.activeSetSection}>
                                <View style={styles.activeSetExpanded}>
                                    <View style={styles.activeSetHeader}>
                                        <Animated.Text
                                            style={[
                                                styles.activeSetTitle,
                                                {
                                                    transform: [{ scale: activeSetTitleAnim }],
                                                    opacity: activeSetTitleAnim.interpolate({
                                                        inputRange: [0.9, 1],
                                                        outputRange: [0.6, 1],
                                                    }),
                                                },
                                            ]}
                                        >
                                            set {activeSetNumber}
                                        </Animated.Text>
                                    </View>

                                    {isBodyweight ? (
                                        <View style={styles.bodyweightRepsContainer}>
                                            <Text style={styles.bodyweightRepsLabel}>reps</Text>
                                            <Slider
                                                value={Math.max(1, parseInt(activeReps) || 1)}
                                                onValueChange={(value) => {
                                                    setActiveReps(value.toString());
                                                }}
                                                minimumValue={1}
                                                maximumValue={50}
                                                step={1}
                                                unit="reps"
                                            />
                                        </View>
                                    ) : (
                                        <>
                                            {/* Plate Slider */}
                                            <PlateSlider
                                                value={activeWeight}
                                                onValueChange={(value) => {
                                                    setActiveWeight(value);
                                                }}
                                                min={2.5}
                                                max={250}
                                                step={2.5}
                                            />
                                        </>
                                    )}

                                    {isBodyweight ? (
                                        <View style={styles.bodyweightAddSetContainer}>
                                            <Button
                                                variant="primary"
                                                title={selectedSetId ? 'update set' : 'add set'}
                                                onPress={handleAddSet}
                                                containerStyle={styles.addSetButtonContainer}
                                            />
                                        </View>
                                    ) : (
                                        <>
                                            {/* Reps Counter and Add Set Button */}
                                            <View style={styles.repsAndAddSetContainer}>
                                                <View style={styles.repsButtonWrapper}>
                                                    <Button
                                                        variant="secondary"
                                                        title="-"
                                                        onPress={() => {
                                                            const currentValue = parseInt(activeReps) || 0;
                                                            const newValue = Math.max(0, currentValue - 1);
                                                            setActiveReps(newValue.toString());
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }}
                                                        containerStyle={styles.repsButtonContainer}
                                                        textStyle={styles.repsButtonText}
                                                    />
                                                </View>
                                                <View style={styles.repsInputContainer}>
                                                    {/* Shadow layer - harsh drop shadow */}
                                                    <View style={styles.repsInputShadow} />
                                                    <TextInput
                                                        style={styles.repsInput}
                                                        value={activeReps}
                                                        onChangeText={setActiveReps}
                                                        keyboardType="numeric"
                                                        placeholder="10"
                                                        placeholderTextColor="#9E9E9E"
                                                    />
                                                </View>
                                                <View style={styles.repsButtonWrapper}>
                                                    <Button
                                                        variant="secondary"
                                                        title="+"
                                                        onPress={() => {
                                                            const currentValue = parseInt(activeReps) || 0;
                                                            const newValue = currentValue + 1;
                                                            setActiveReps(newValue.toString());
                                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                        }}
                                                        containerStyle={styles.repsButtonContainer}
                                                        textStyle={styles.repsButtonText}
                                                    />
                                                </View>
                                                <View style={styles.addSetButtonWrapper}>
                                                    <Button
                                                        variant="primary"
                                                        title={selectedSetId ? 'update set' : 'add set'}
                                                        onPress={handleAddSet}
                                                        containerStyle={styles.addSetButtonContainer}
                                                    />
                                                </View>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <ScrollView
                ref={horizontalScrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                style={styles.horizontalScrollView}
            >
                {exercises.map((ex, index) => renderExercisePage(ex, index))}
            </ScrollView>
            <UndoToast
                visible={showSetToast}
                message={setToastMessage}
                showUndo={setToastActionLabel === 'undo'}
                actionLabel={setToastActionLabel === 'undo' ? undefined : setToastActionLabel}
                onAction={() => {
                    setShowSetToast(false);
                }}
                onUndo={() => {
                    const lastAddedId = lastAddedSetIdRef.current;
                    if (!lastAddedId) {
                        setShowSetToast(false);
                        return;
                    }
                    setSets(prevSets => {
                        const updated = prevSets.filter(set => set.id !== lastAddedId);
                        const currentState = exerciseStates.get(exercise.id);
                        if (currentState) {
                            setExerciseStates(new Map(exerciseStates.set(exercise.id, {
                                ...currentState,
                                sets: updated,
                            })));
                        }
                        return updated;
                    });
                    lastAddedSetIdRef.current = null;
                }}
                onDismiss={() => setShowSetToast(false)}
                duration={2000}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    horizontalScrollView: {
        flex: 1,
    },
    keyboardView: {
        flex: 1,
    },
    content: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerContainer: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        minHeight: 48,
    },
    backButton: {
        padding: 12,
        marginLeft: -12,
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginTop: 2,
        textAlign: 'center',
    },
    headerDivider: {
        height: 2,
        backgroundColor: '#E0E0E0',
        marginTop: 8,
    },
    deleteExerciseButton: {
        padding: 12,
        marginRight: -12,
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    splitContainer: {
        flex: 1,
        flexDirection: 'column',
    },
    historySection: {
        flex: 1,
        paddingHorizontal: 20,
        paddingTop: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 8,
    },
    historyScroll: {
        flex: 1,
    },
    historyScrollContent: {
        flexDirection: 'row',
    },
    historyPage: {
        width: Dimensions.get('window').width - 40,
        paddingHorizontal: 0,
    },
    historyContent: {
        paddingBottom: 12,
        gap: 8,
    },
    emptyState: {
        paddingVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyStateText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    setCardWrapper: {
        position: 'relative',
    },
    setCard: {
        backgroundColor: '#F8F8F8',
        borderRadius: 12,
        padding: 10,
        borderWidth: 2,
        borderColor: '#252525',
        position: 'relative',
        zIndex: 1,
    },
    setCardSelected: {
        backgroundColor: '#F2F5FF',
        borderColor: '#526EFF',
    },
    setNumberRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    setEditingPill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#526EFF',
        backgroundColor: '#F2F5FF',
    },
    setEditingText: {
        fontSize: 10,
        fontFamily: fonts.bold,
        color: '#526EFF',
        textTransform: 'lowercase',
    },
    setCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    setNumber: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    setCardContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    setCardStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
        minWidth: 150,
    },
    setCardStat: {
        flex: 1,
    },
    setCardDivider: {
        width: 1,
        height: 32,
        backgroundColor: '#E0E0E0',
    },
    setCardLabel: {
        fontSize: 11,
        fontFamily: fonts.regular,
        color: '#666',
        textTransform: 'lowercase',
        marginBottom: 2,
    },
    setCardValue: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    setCardWeightValue: {
        width: 100,
    },
    miniPlateStack: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: 80,
        marginLeft: 12,
    },
    miniPlate: {
        borderWidth: 2,
        borderColor: '#252525',
    },
    activeSetSection: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 2,
        borderColor: '#252525',
        borderBottomWidth: 0,
        paddingHorizontal: 0,
        paddingTop: 0,
        paddingBottom: 0,
        overflow: 'hidden',
        width: '100%',
    },
    activeSetExpanded: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
    },
    activeSetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    activeSetTitle: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    repsAndAddSetContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginTop: 8,
        marginBottom: 12,
        width: '100%',
    },
    repsButtonWrapper: {
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: -6, // Compensate for button's marginBottom: 12 / 2
        marginBottom: -6,
    },
    repsButtonContainer: {
        width: 50,
        height: 50,
        margin: 0,
    },
    repsButtonText: {
        fontSize: 24,
        fontFamily: fonts.bold,
        color: '#252525',
    },
    repsInputContainer: {
        position: 'relative',
        width: 50,
        height: 50,
    },
    repsInputShadow: {
        position: 'absolute',
        width: 50,
        height: 50,
        backgroundColor: '#252525',
        borderRadius: 12,
        top: 4,
        left: 0,
        zIndex: 0,
    },
    repsInput: {
        width: 50,
        backgroundColor: '#fff',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#252525',
        paddingHorizontal: 12,
        paddingVertical: 16,
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
        textAlign: 'center',
        height: 50, // Match button height
        position: 'relative',
        zIndex: 1,
    },
    addSetButtonWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
        marginBottom: -6,
    },
    bodyweightAddSetContainer: {
        marginTop: 12,
        width: '100%',
    },
    bodyweightRepsContainer: {
        marginTop: 4,
        marginBottom: 8,
        width: '100%',
    },
    bodyweightRepsLabel: {
        fontSize: 14,
        fontFamily: fonts.bold,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 8,
        marginLeft: 2,
    },
    bottomAddSetButtonContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: '#fff',
    },
    addSetButtonContainer: {
        width: '100%',
        margin: 0,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    paginationDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#E0E0E0',
    },
    paginationDotActive: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#526EFF',
    },
});
