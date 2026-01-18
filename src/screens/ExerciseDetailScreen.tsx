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
    PanResponder,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import * as Haptics from 'expo-haptics';
import { fonts } from '../constants/fonts';

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
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const [exerciseStates, setExerciseStates] = useState<Map<string, { sets: Set[]; exercise: Exercise }>>(new Map());
    
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
    const removeAnimations = useRef<Map<string, Animated.Value>>(new Map()).current;
    const removingSetIds = useRef<Set<string>>(new Set()).current;

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
            // Initialize animations for all sets
            currentState.sets.forEach(set => {
                if (!setAnimations.has(set.id)) {
                    setAnimations.set(set.id, new Animated.Value(set.completed ? 1 : 0));
                }
            });
        }
    }, [currentIndex, exerciseStates]);


    const handleUpdateSet = (setId: string, field: 'reps' | 'weight', value: string) => {
        setSets(prevSets => {
            const updated = prevSets.map(set =>
                set.id === setId ? { ...set, [field]: value } : set
            );
            // Update exercise state
            const currentState = exerciseStates.get(exercise.id);
            if (currentState) {
                setExerciseStates(new Map(exerciseStates.set(exercise.id, {
                    ...currentState,
                    sets: updated,
                })));
            }
            return updated;
        });
    };

    const handleAddSet = () => {
        setSets(prevSets => {
            const lastSet = prevSets[prevSets.length - 1];
            const newReps = lastSet ? lastSet.reps || '0' : '0';
            const newWeight = lastSet ? lastSet.weight || '0' : '0';
            const updated = [...prevSets, { id: Date.now().toString(), reps: newReps, weight: newWeight, completed: false }];
            // Update exercise state
            const currentState = exerciseStates.get(exercise.id);
            if (currentState) {
                setExerciseStates(new Map(exerciseStates.set(exercise.id, {
                    ...currentState,
                    sets: updated,
                })));
            }
            return updated;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRemoveSet = (setId: string) => {
        if (removingSetIds.has(setId)) return;
        removingSetIds.add(setId);
        
        const removeAnimValue = removeAnimations.get(setId) || new Animated.Value(1);
        removeAnimations.set(setId, removeAnimValue);
        
        // Animate out - fade the row
        Animated.timing(removeAnimValue, {
            toValue: 0,
            duration: 300,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
        }).start(() => {
            setSets(prevSets => {
                const updated = prevSets.filter(set => set.id !== setId);
                // Update exercise state
                const currentState = exerciseStates.get(exercise.id);
                if (currentState) {
                    setExerciseStates(new Map(exerciseStates.set(exercise.id, {
                        ...currentState,
                        sets: updated,
                    })));
                }
                return updated;
            });
            removeAnimations.delete(setId);
            removingSetIds.delete(setId);
        });
        
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleToggleSetCompleted = (setId: string) => {
        setSets(prevSets => {
            const updatedSets = prevSets.map(set =>
                set.id === setId ? { ...set, completed: !set.completed } : set
            );
            const completedSet = updatedSets.find(set => set.id === setId);
            
            // Update exercise state
            const currentState = exerciseStates.get(exercise.id);
            if (currentState) {
                setExerciseStates(new Map(exerciseStates.set(exercise.id, {
                    ...currentState,
                    sets: updatedSets,
                })));
            }
            
            // Animate when completing
            if (completedSet?.completed) {
                const animValue = setAnimations.get(setId) || new Animated.Value(0);
                setAnimations.set(setId, animValue);
                
                // Fade in animation for the checkmark
                Animated.timing(animValue, {
                    toValue: 1,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }).start();
            } else {
                // Reset animation when uncompleting
                const animValue = setAnimations.get(setId);
                if (animValue) {
                    animValue.setValue(0);
                }
            }
            
            return updatedSets;
        });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleClose = () => {
        // Pass all updated exercises back via navigation params
        const updatedExercises = Array.from(exerciseStates.values()).map(state => ({
            id: state.exercise.id,
            name: state.exercise.name,
            sets: state.sets,
        }));
        
        // Track which exercises became complete
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
        // Pass delete signal back via navigation params
        navigation.navigate('Workout', {
            deletedExerciseId: exercise.id,
        } as any);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const renderExercisePage = (ex: Exercise, index: number) => {
        const exerciseState = exerciseStates.get(ex.id);
        const exerciseSets = exerciseState?.sets || ex.sets;
        const isCurrent = index === currentIndex;
        
        return (
            <View key={ex.id} style={{ width: screenWidth }}>
                <KeyboardAvoidingView
                    style={styles.keyboardView}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    keyboardVerticalOffset={0}
                >
                    <View style={[styles.content, { paddingTop: insets.top }]}>
                        <View style={styles.contentInner}>
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
                                        <Text style={styles.headerSubtitle}>barbell</Text>
                                    </View>
                                    <TouchableOpacity 
                                        style={styles.addSetHeaderButton} 
                                        onPress={() => {
                                            const currentState = exerciseStates.get(ex.id);
                                            if (currentState) {
                                                const lastSet = currentState.sets[currentState.sets.length - 1];
                                                const newReps = lastSet ? lastSet.reps || '0' : '0';
                                                const newWeight = lastSet ? lastSet.weight || '0' : '0';
                                                const updated = [...currentState.sets, { id: Date.now().toString(), reps: newReps, weight: newWeight, completed: false }];
                                                setExerciseStates(new Map(exerciseStates.set(ex.id, {
                                                    ...currentState,
                                                    sets: updated,
                                                })));
                                                if (isCurrent) {
                                                    setSets(updated);
                                                }
                                            }
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        }} 
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="add" size={24} color="#526EFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Header divider */}
                            <View style={styles.headerDivider} />

                            <ScrollView
                                style={styles.scrollView}
                                contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
                                showsVerticalScrollIndicator={false}
                                keyboardShouldPersistTaps="handled"
                            >
                                {/* Sets Table Section */}
                                <View>
                                    <View style={styles.tableHeader}>
                                        <View style={styles.tableCellSetComplete}>
                                            <Text style={styles.tableHeaderText}>set</Text>
                                        </View>
                                        <View style={styles.tableCellEqual}>
                                            <Text style={styles.tableHeaderText}>previous</Text>
                                        </View>
                                        <View style={styles.tableCellEqual}>
                                            <Text style={styles.tableHeaderText}>rep. x weight</Text>
                                        </View>
                                        <View style={styles.tableCellRemove}>
                                            <Text style={styles.tableHeaderText}></Text>
                                        </View>
                                    </View>
                                    {exerciseSets.map((set, setIndex) => {
                                        const previousReps = '5';
                                        const previousWeight = '50';
                                        const reps = set.reps || '0';
                                        const weight = set.weight || '0';
                                        const displayText = `${reps}x${weight} kg`;
                                        const previousText = `${previousReps}x${previousWeight} kg`;
                                        
                                        const setKey = `${ex.id}-${set.id}`;
                                        const animValue = setAnimations.get(setKey) || new Animated.Value(set.completed ? 1 : 0);
                                        const removeAnimValue = removeAnimations.get(setKey) || new Animated.Value(1);
                                        
                                        if (!setAnimations.has(setKey)) {
                                            setAnimations.set(setKey, animValue);
                                        }
                                        if (!removeAnimations.has(setKey)) {
                                            removeAnimations.set(setKey, removeAnimValue);
                                        }
                                        
                                        return (
                                            <Animated.View 
                                                key={set.id} 
                                                style={[
                                                    styles.tableRow,
                                                    {
                                                        opacity: removeAnimValue,
                                                    }
                                                ]}
                                            >
                                                <View style={styles.tableCellSetComplete}>
                                                    <TouchableOpacity
                                                        style={[styles.setCompleteButton, set.completed && styles.setCompleteButtonCompleted]}
                                                        onPress={() => {
                                                            if (isCurrent) {
                                                                const currentState = exerciseStates.get(ex.id);
                                                                if (currentState) {
                                                                    const updatedSets = currentState.sets.map(s =>
                                                                        s.id === set.id ? { ...s, completed: !s.completed } : s
                                                                    );
                                                                    setExerciseStates(new Map(exerciseStates.set(ex.id, {
                                                                        ...currentState,
                                                                        sets: updatedSets,
                                                                    })));
                                                                    if (isCurrent) {
                                                                        setSets(updatedSets);
                                                                    }
                                                                    
                                                                    const completedSet = updatedSets.find(s => s.id === set.id);
                                                                    if (completedSet?.completed) {
                                                                        Animated.timing(animValue, {
                                                                            toValue: 1,
                                                                            duration: 300,
                                                                            easing: Easing.out(Easing.ease),
                                                                            useNativeDriver: true,
                                                                        }).start();
                                                                    } else {
                                                                        animValue.setValue(0);
                                                                    }
                                                                }
                                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                            }
                                                        }}
                                                        activeOpacity={0.7}
                                                    >
                                                        {set.completed ? (
                                                            <Animated.View style={{ opacity: animValue }}>
                                                                <Ionicons name="checkmark" size={16} color="#fff" />
                                                            </Animated.View>
                                                        ) : (
                                                            <Text style={styles.setCompleteButtonText}>{setIndex + 1}</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                </View>
                                                <View style={styles.tableCellEqual}>
                                                    <Text style={styles.previousText}>{previousText}</Text>
                                                </View>
                                                <View style={styles.tableCellEqual}>
                                                    {set.completed ? (
                                                        <Animated.Text style={[styles.completedText, { opacity: animValue }]}>
                                                            {displayText}
                                                        </Animated.Text>
                                                    ) : (
                                                        <Animated.View style={[styles.editableCell, { opacity: Animated.subtract(1, animValue) }]}>
                                                            <TextInput
                                                                style={styles.inlineInput}
                                                                value={set.reps || ''}
                                                                onChangeText={(value) => {
                                                                    if (isCurrent) {
                                                                        const currentState = exerciseStates.get(ex.id);
                                                                        if (currentState) {
                                                                            const updated = currentState.sets.map(s =>
                                                                                s.id === set.id ? { ...s, reps: value } : s
                                                                            );
                                                                            setExerciseStates(new Map(exerciseStates.set(ex.id, {
                                                                                ...currentState,
                                                                                sets: updated,
                                                                            })));
                                                                            if (isCurrent) {
                                                                                setSets(updated);
                                                                            }
                                                                        }
                                                                    }
                                                                }}
                                                                keyboardType="numeric"
                                                                placeholder="0"
                                                                placeholderTextColor="#9E9E9E"
                                                                editable={isCurrent}
                                                            />
                                                            <Text style={styles.inlineText}>x</Text>
                                                            <TextInput
                                                                style={styles.inlineInput}
                                                                value={set.weight || ''}
                                                                onChangeText={(value) => {
                                                                    if (isCurrent) {
                                                                        const currentState = exerciseStates.get(ex.id);
                                                                        if (currentState) {
                                                                            const updated = currentState.sets.map(s =>
                                                                                s.id === set.id ? { ...s, weight: value } : s
                                                                            );
                                                                            setExerciseStates(new Map(exerciseStates.set(ex.id, {
                                                                                ...currentState,
                                                                                sets: updated,
                                                                            })));
                                                                            if (isCurrent) {
                                                                                setSets(updated);
                                                                            }
                                                                        }
                                                                    }
                                                                }}
                                                                keyboardType="numeric"
                                                                placeholder="0"
                                                                placeholderTextColor="#9E9E9E"
                                                                editable={isCurrent}
                                                            />
                                                            <Text style={styles.inlineText}> kg</Text>
                                                        </Animated.View>
                                                    )}
                                                </View>
                                                <View style={styles.tableCellRemove}>
                                                    {exerciseSets.length > 1 && (
                                                        <TouchableOpacity
                                                            style={styles.removeButton}
                                                            onPress={() => {
                                                                if (isCurrent) {
                                                                    const currentState = exerciseStates.get(ex.id);
                                                                    if (currentState) {
                                                                        const setToRemove = currentState.sets.find(s => s.id === set.id);
                                                                        if (setToRemove) {
                                                                            const removeAnim = removeAnimations.get(setKey) || new Animated.Value(1);
                                                                            removeAnimations.set(setKey, removeAnim);
                                                                            Animated.timing(removeAnim, {
                                                                                toValue: 0,
                                                                                duration: 300,
                                                                                easing: Easing.out(Easing.ease),
                                                                                useNativeDriver: true,
                                                                            }).start(() => {
                                                                                const updated = currentState.sets.filter(s => s.id !== set.id);
                                                                                setExerciseStates(new Map(exerciseStates.set(ex.id, {
                                                                                    ...currentState,
                                                                                    sets: updated,
                                                                                })));
                                                                                if (isCurrent) {
                                                                                    setSets(updated);
                                                                                }
                                                                                removeAnimations.delete(setKey);
                                                                            });
                                                                        }
                                                                    }
                                                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                                                }
                                                            }}
                                                            activeOpacity={0.7}
                                                        >
                                                            <Ionicons name="close" size={20} color="#9E9E9E" />
                                                        </TouchableOpacity>
                                                    )}
                                                </View>
                                            </Animated.View>
                                        );
                                    })}
                                </View>
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

                            {/* Delete Exercise */}
                            <View style={[styles.deleteExerciseContainer, { paddingBottom: insets.bottom + 20 }]}>
                                <TouchableOpacity 
                                    style={styles.deleteExercise}
                                    onPress={() => {
                                        if (isCurrent) {
                                            navigation.navigate('Workout', {
                                                deletedExerciseId: ex.id,
                                            } as any);
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                                    <Text style={styles.deleteExerciseText}>delete exercise</Text>
                                </TouchableOpacity>
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
    contentInner: {
        flex: 1,
    },
    headerContainer: {
        paddingHorizontal: 20,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 8,
        paddingBottom: 8,
        minHeight: 48,
        paddingLeft: 0,
        paddingRight: 0,
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
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        textAlign: 'center',
        marginTop: 2,
    },
    addSetHeaderButton: {
        padding: 12,
        marginRight: -12,
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerDivider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        width: '100%',
        marginTop: 0,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
    },
    tableHeader: {
        flexDirection: 'row',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        marginBottom: 10,
    },
    tableHeaderText: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    tableHeaderCheckbox: {
        width: 60,
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        minHeight: 44,
    },
    tableCellSetComplete: {
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    setCompleteButton: {
        width: 36,
        height: 36,
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#252525',
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
    },
    setCompleteButtonCompleted: {
        backgroundColor: '#526EFF',
        borderColor: '#526EFF',
    },
    setCompleteButtonText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
    },
    tableCellRemove: {
        width: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tableCellEqual: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    tableCellText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
    },
    previousText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#526EFF',
    },
    completedText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
    },
    editableCell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        justifyContent: 'center',
        flexWrap: 'wrap',
    },
    inlineInput: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        width: 35,
        padding: 0,
        paddingBottom: 4,
        textAlign: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#D0D0D0',
    },
    inlineText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
    },
    removeButton: {
        padding: 4,
    },
    paginationContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    paginationDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#D0D0D0',
    },
    paginationDotActive: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#526EFF',
    },
    deleteExerciseContainer: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
        alignItems: 'center',
    },
    deleteExercise: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    deleteExerciseText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#FF3B30',
        textTransform: 'lowercase',
    },
});

