import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Easing,
    PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import * as Haptics from 'expo-haptics';

interface StartWorkoutSlideInProps {
    visible: boolean;
    onClose: () => void;
    onStartWorkout: (type: 'pick-as-you-go' | 'previous' | 'new' | 'schedule') => void;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

export const StartWorkoutSlideIn: React.FC<StartWorkoutSlideInProps> = ({
    visible,
    onClose,
    onStartWorkout,
}) => {
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Mock previous workouts - in real app, this would come from database
    const hasPreviousWorkouts = false; // TODO: Check if user has previous workouts

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT);
            backdropOpacity.setValue(0);

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
                    toValue: SCREEN_HEIGHT,
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
                    onClose();
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

    if (!visible) return null;

    const handleOptionPress = (type: 'pick-as-you-go' | 'previous' | 'new' | 'schedule') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onStartWorkout(type);
    };

    return (
        <View style={styles.overlay} pointerEvents="box-none">
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
                    onPress={onClose}
                />
            </Animated.View>

            <Animated.View
                style={[
                    styles.container,
                    {
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
                pointerEvents="auto"
            >
                <View style={styles.header} {...topSectionPanResponder.panHandlers}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="#252525" />
                    </TouchableOpacity>
                    <Text style={styles.title}>start workout</Text>
                    <View style={styles.backButtonPlaceholder} />
                </View>

                <View style={styles.optionsContainer}>
                    {/* Option 1: Pick as you go */}
                    <TouchableOpacity
                        style={styles.option}
                        onPress={() => handleOptionPress('pick-as-you-go')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.optionText}>pick as you go</Text>
                        <Ionicons name="chevron-forward" size={20} color="#252525" />
                    </TouchableOpacity>

                    {/* Option 2: Previous workouts (only show if they exist) */}
                    {hasPreviousWorkouts && (
                        <TouchableOpacity
                            style={styles.option}
                            onPress={() => handleOptionPress('previous')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.optionText}>previous workouts</Text>
                            <Ionicons name="chevron-forward" size={20} color="#252525" />
                        </TouchableOpacity>
                    )}

                    {/* Option 3: Create new workout */}
                    <TouchableOpacity
                        style={styles.option}
                        onPress={() => handleOptionPress('new')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.optionText}>create new workout</Text>
                        <Ionicons name="chevron-forward" size={20} color="#252525" />
                    </TouchableOpacity>

                    {/* Option 4: Schedule workout */}
                    <TouchableOpacity
                        style={styles.option}
                        onPress={() => handleOptionPress('schedule')}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.optionText}>schedule workout</Text>
                        <Ionicons name="chevron-forward" size={20} color="#252525" />
                    </TouchableOpacity>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
    },
    backdropTouchable: {
        flex: 1,
    },
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 2.5,
        borderColor: '#252525',
        borderBottomWidth: 0,
        paddingTop: 20,
        paddingBottom: 40,
        maxHeight: SCREEN_HEIGHT * 0.7,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 25,
        paddingBottom: 20,
        borderBottomWidth: 2,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonPlaceholder: {
        width: 40,
    },
    title: {
        fontSize: 20,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
    optionsContainer: {
        paddingHorizontal: 25,
        paddingTop: 20,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 10,
        borderWidth: 2.5,
        borderColor: '#252525',
    },
    optionText: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
    },
});

