import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Animated,
    Dimensions,
    Keyboard,
    Platform,
    ScrollView,
    PanResponder,
    KeyboardAvoidingView,
    Easing,
    Modal,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import * as Haptics from 'expo-haptics';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.6;
const TOASTER_OFFSET = 50;

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

interface ExerciseDetailBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    exercise: Exercise | null;
    onUpdateExercise: (exerciseId: string, sets: Set[]) => void;
}

export const ExerciseDetailBottomSheet: React.FC<ExerciseDetailBottomSheetProps> = ({
    visible,
    onClose,
    exercise,
    onUpdateExercise,
}) => {
    const [sets, setSets] = useState<Set[]>([]);
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT + TOASTER_OFFSET)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const keyboardHeightAnim = useRef(new Animated.Value(0)).current;
    const sheetHeightAnim = useRef(new Animated.Value(SHEET_HEIGHT)).current;

    // Initialize sets when exercise changes
    useEffect(() => {
        if (exercise && visible) {
            setSets(exercise.sets.map(set => ({ ...set })));
        }
    }, [exercise, visible]);

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT + TOASTER_OFFSET);
            backdropOpacity.setValue(0);
            sheetHeightAnim.setValue(SHEET_HEIGHT);

            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: SCREEN_HEIGHT + TOASTER_OFFSET,
                    duration: 250,
                    easing: Easing.in(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 200,
                    easing: Easing.in(Easing.ease),
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // Handle keyboard
    useEffect(() => {
        const keyboardWillShow = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
            (e) => {
                Animated.timing(keyboardHeightAnim, {
                    toValue: -e.endCoordinates.height,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }).start();
            }
        );
        const keyboardWillHide = Keyboard.addListener(
            Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
            () => {
                Animated.timing(keyboardHeightAnim, {
                    toValue: 0,
                    duration: 250,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: true,
                }).start();
            }
        );

        return () => {
            keyboardWillShow.remove();
            keyboardWillHide.remove();
        };
    }, []);

    const handleClose = () => {
        Keyboard.dismiss();
        if (exercise) {
            onUpdateExercise(exercise.id, sets);
        }
        onClose();
    };

    const handleUpdateSet = (setId: string, field: 'reps' | 'weight' | 'completed', value: string | boolean) => {
        setSets(prevSets =>
            prevSets.map(set =>
                set.id === setId ? { ...set, [field]: value } : set
            )
        );
    };

    const handleAddSet = () => {
        const newSet: Set = {
            id: Date.now().toString(),
            reps: '10',
            weight: '0',
        };
        setSets(prevSets => [...prevSets, newSet]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRemoveSet = (setId: string) => {
        if (sets.length > 1) {
            setSets(prevSets => prevSets.filter(set => set.id !== setId));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const topSectionPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 10;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    handleClose();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 100,
                        friction: 8,
                    }).start();
                }
            },
        })
    ).current;

    if (!exercise) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={0}
            >
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: backdropOpacity,
                        },
                    ]}
                >
                    <TouchableOpacity
                        style={styles.backdropTouchable}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                </Animated.View>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [
                                {
                                    translateY: Animated.add(slideAnim, keyboardHeightAnim)
                                },
                            ],
                        },
                    ]}
                    pointerEvents="auto"
                >
                    <Animated.View
                        style={[
                            styles.sheetContent,
                            {
                                height: sheetHeightAnim,
                            },
                        ]}
                    >
                        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                            <View style={styles.content} {...topSectionPanResponder.panHandlers}>
                                {/* Header */}
                                <View style={styles.header}>
                                    <Text style={styles.headerTitle}>{exercise.name}</Text>
                                    <TouchableOpacity
                                        style={styles.closeButton}
                                        onPress={handleClose}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons name="close" size={24} color="#252525" />
                                    </TouchableOpacity>
                                </View>

                                {/* Sets List */}
                                <ScrollView
                                    style={styles.setsScrollView}
                                    contentContainerStyle={styles.setsScrollContent}
                                    showsVerticalScrollIndicator={false}
                                    keyboardShouldPersistTaps="handled"
                                >
                                    {sets.map((set, index) => (
                                        <View key={set.id} style={[styles.setCard, set.completed && styles.setCardCompleted]}>
                                            <View style={styles.setHeader}>
                                                <View style={styles.setHeaderLeft}>
                                                    <TouchableOpacity
                                                        style={styles.completeButton}
                                                        onPress={() => handleUpdateSet(set.id, 'completed', !set.completed)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Ionicons 
                                                            name={set.completed ? "checkmark-circle" : "ellipse-outline"} 
                                                            size={24} 
                                                            color={set.completed ? "#26F170" : "#9E9E9E"} 
                                                        />
                                                    </TouchableOpacity>
                                                    <Text style={styles.setNumber}>set {index + 1}</Text>
                                                </View>
                                                {sets.length > 1 && (
                                                    <TouchableOpacity
                                                        style={styles.removeSetButton}
                                                        onPress={() => handleRemoveSet(set.id)}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Ionicons name="close-circle" size={20} color="#9E9E9E" />
                                                    </TouchableOpacity>
                                                )}
                                            </View>
                                            <View style={styles.setInputs}>
                                                <View style={styles.inputGroup}>
                                                    <Text style={styles.inputLabel}>reps</Text>
                                                    <TextInput
                                                        style={[styles.input, set.completed && styles.inputCompleted]}
                                                        value={set.reps}
                                                        onChangeText={(value) => handleUpdateSet(set.id, 'reps', value)}
                                                        keyboardType="numeric"
                                                        placeholder="0"
                                                        editable={!set.completed}
                                                    />
                                                </View>
                                                <View style={styles.inputGroup}>
                                                    <Text style={styles.inputLabel}>weight</Text>
                                                    <TextInput
                                                        style={[styles.input, set.completed && styles.inputCompleted]}
                                                        value={set.weight}
                                                        onChangeText={(value) => handleUpdateSet(set.id, 'weight', value)}
                                                        keyboardType="numeric"
                                                        placeholder="0"
                                                        editable={!set.completed}
                                                    />
                                                </View>
                                            </View>
                                        </View>
                                    ))}
                                </ScrollView>

                                {/* Add Set Button */}
                                <TouchableOpacity
                                    style={styles.addSetButton}
                                    onPress={handleAddSet}
                                    activeOpacity={0.7}
                                >
                                    <Ionicons name="add-circle-outline" size={24} color="#4463F7" />
                                    <Text style={styles.addSetText}>add set</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </Animated.View>
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    backdropTouchable: {
        flex: 1,
    },
    sheet: {
        position: 'absolute',
        bottom: -Dimensions.get('window').height * 0.4,
        left: 0,
        right: 0,
        paddingBottom: Dimensions.get('window').height * 0.4,
        overflow: 'hidden',
    },
    sheetContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 2.5,
        borderColor: '#252525',
        borderBottomWidth: 0,
        paddingHorizontal: 20,
        overflow: 'hidden',
    },
    content: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 20,
        paddingBottom: 16,
        borderBottomWidth: 2.5,
        borderBottomColor: '#E0E0E0',
    },
    headerTitle: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        flex: 1,
    },
    closeButton: {
        padding: 4,
    },
    setsScrollView: {
        flex: 1,
    },
    setsScrollContent: {
        paddingTop: 16,
        paddingBottom: 16,
        gap: 12,
    },
    setCard: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        borderWidth: 2.5,
        borderColor: '#252525',
        padding: 16,
    },
    setCardCompleted: {
        backgroundColor: '#F0F9F4',
        borderColor: '#26F170',
    },
    setHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    setHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    completeButton: {
        padding: 4,
    },
    setNumber: {
        fontSize: 16,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    removeSetButton: {
        padding: 4,
    },
    setInputs: {
        flexDirection: 'row',
        gap: 12,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 12,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    input: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#252525',
        borderWidth: 2.5,
        borderColor: '#252525',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        textAlign: 'center',
    },
    inputCompleted: {
        backgroundColor: '#E8F5E9',
        borderColor: '#26F170',
        color: '#9E9E9E',
    },
    addSetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
        borderTopWidth: 2.5,
        borderTopColor: '#E0E0E0',
        marginTop: 8,
    },
    addSetText: {
        fontSize: 16,
        fontFamily: fonts.regular,
        color: '#4463F7',
        textTransform: 'lowercase',
    },
});

