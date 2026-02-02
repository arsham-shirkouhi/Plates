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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { Button } from '../components/Button';
import { fonts } from '../constants/fonts';
import { PlateSlider } from '../components/PlateSlider';

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
    const [activeSetExpanded, setActiveSetExpanded] = useState(true);
    const [activeReps, setActiveReps] = useState('10');
    const [activeWeight, setActiveWeight] = useState(20);
    const activeSetSlideAnim = useRef(new Animated.Value(1)).current;

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

    // Animate active set section expansion
    useEffect(() => {
        Animated.spring(activeSetSlideAnim, {
            toValue: activeSetExpanded ? 1 : 0,
            tension: 200,
            friction: 20,
            useNativeDriver: false,
        }).start();
    }, [activeSetExpanded]);

    // Separate completed and active sets
    const completedSets = sets.filter(set => set.completed);
    const activeSets = sets.filter(set => !set.completed);

    const handleAddSet = () => {
        if (!activeSetExpanded) {
            setActiveSetExpanded(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            return;
        }

        // Add the active set to the exercise (marked as completed when added)
        const newSet: Set = {
            id: Date.now().toString(),
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

        // Reset active set values
        setActiveReps('10');
        setActiveWeight(20);
        // Keep the active set expanded
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
                                </View>
                                <TouchableOpacity
                                    style={styles.addSetHeaderButton}
                                    onPress={handleAddSet}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add" size={24} color="#526EFF" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Split Section Layout */}
                        <View style={styles.splitContainer}>
                            {/* Top Section: Previous Sets (History) */}
                            <View style={styles.historySection}>
                                <Text style={styles.sectionTitle}>previous sets</Text>
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

                                        return (
                                            <ScrollView
                                                key={ex.id}
                                                style={[styles.historyPage, { width: screenWidth - 40 }]}
                                                contentContainerStyle={styles.historyContent}
                                                showsVerticalScrollIndicator={false}
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

                                                        return (
                                                            <Animated.View
                                                                key={set.id}
                                                                style={[
                                                                    styles.setCard,
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
                                                                    <Text style={styles.setNumber}>set {setIndex + 1}</Text>
                                                                    {isCurrentExercise && (
                                                                        <TouchableOpacity
                                                                            onPress={() => handleRemoveSet(set.id)}
                                                                            activeOpacity={0.7}
                                                                        >
                                                                            <Ionicons name="close" size={18} color="#9E9E9E" />
                                                                        </TouchableOpacity>
                                                                    )}
                                                                </View>
                                                                <View style={styles.setCardContent}>
                                                                    <View style={styles.setCardStat}>
                                                                        <Text style={styles.setCardLabel}>weight</Text>
                                                                        <Text style={styles.setCardValue}>{set.weight} kg</Text>
                                                                    </View>
                                                                    <View style={styles.setCardStat}>
                                                                        <Text style={styles.setCardLabel}>reps</Text>
                                                                        <Text style={styles.setCardValue}>{set.reps}</Text>
                                                                    </View>
                                                                </View>
                                                            </Animated.View>
                                                        );
                                                    })
                                                )}
                                            </ScrollView>
                                        );
                                    })}
                                </ScrollView>
                            </View>

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

                            {/* Bottom Section: Active Set Input */}
                            <Animated.View
                                style={[
                                    styles.activeSetSection,
                                    {
                                        maxHeight: activeSetSlideAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [160, 600],
                                        }),
                                        opacity: activeSetSlideAnim.interpolate({
                                            inputRange: [0, 0.3, 1],
                                            outputRange: [0.7, 0.9, 1],
                                        }),
                                    },
                                ]}
                            >
                                {!activeSetExpanded ? (
                                    <View style={styles.activeSetCollapsed}>
                                        <View style={styles.handleBar} />
                                        <TouchableOpacity
                                            style={styles.activeSetCollapsedContent}
                                            onPress={() => {
                                                setActiveSetExpanded(true);
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.activeSetCollapsedText}>tap to add set</Text>
                                            <Ionicons name="chevron-up" size={20} color="#526EFF" />
                                        </TouchableOpacity>
                                    </View>
                                ) : (
                                    <View style={styles.activeSetExpanded}>
                                        <View style={styles.handleBar} />
                                        <View style={styles.activeSetHeader}>
                                            <Text style={styles.activeSetTitle}>set {completedSets.length + 1}</Text>
                                            <TouchableOpacity
                                                onPress={() => {
                                                    setActiveSetExpanded(false);
                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <Ionicons name="chevron-down" size={20} color="#9E9E9E" />
                                            </TouchableOpacity>
                                        </View>

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
                                            <TextInput
                                                style={styles.repsInput}
                                                value={activeReps}
                                                onChangeText={setActiveReps}
                                                keyboardType="numeric"
                                                placeholder="10"
                                                placeholderTextColor="#9E9E9E"
                                            />
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
                                                    title="add set"
                                                    onPress={handleAddSet}
                                                    containerStyle={styles.addSetButtonContainer}
                                                />
                                            </View>
                                        </View>
                                    </View>
                                )}
                            </Animated.View>
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
    addSetHeaderButton: {
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
        paddingTop: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 12,
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
        paddingBottom: 20,
        gap: 12,
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
    setCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    setCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    setNumber: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    setCardContent: {
        flexDirection: 'row',
        gap: 24,
    },
    setCardStat: {
        flex: 1,
    },
    setCardLabel: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    setCardValue: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
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
    activeSetCollapsed: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    activeSetCollapsedContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    activeSetCollapsedText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#526EFF',
        textTransform: 'lowercase',
    },
    activeSetExpanded: {
        width: '100%',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 20,
    },
    activeSetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    activeSetTitle: {
        fontSize: 18,
        fontFamily: fonts.regular,
        color: '#252525',
        textTransform: 'lowercase',
    },
    repsInputContainer: {
        marginTop: 20,
        marginBottom: 20,
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
    },
    addSetButtonWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
        marginBottom: -6,
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
