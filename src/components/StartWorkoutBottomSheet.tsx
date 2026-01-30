import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    Easing,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import * as Haptics from 'expo-haptics';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SHEET_HEIGHT = 400; // Height for the three buttons
const TOASTER_OFFSET = 50;
const SHEET_CONTENT_HEIGHT = SHEET_HEIGHT + TOASTER_OFFSET;

interface StartWorkoutBottomSheetProps {
    visible: boolean;
    onClose: () => void;
}

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const StartWorkoutBottomSheet: React.FC<StartWorkoutBottomSheetProps> = ({
    visible,
    onClose,
}) => {
    const navigation = useNavigation<NavigationProp>();
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT + TOASTER_OFFSET)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    // Animation refs for option buttons (like onboarding buttons)
    const pickAsYouGoTranslateY = useRef(new Animated.Value(0)).current;
    const pickAsYouGoShadowHeight = useRef(new Animated.Value(4)).current;

    const createNewTranslateY = useRef(new Animated.Value(0)).current;
    const createNewShadowHeight = useRef(new Animated.Value(4)).current;

    const scheduleTranslateY = useRef(new Animated.Value(0)).current;
    const scheduleShadowHeight = useRef(new Animated.Value(4)).current;

    useEffect(() => {
        if (visible) {
            slideAnim.setValue(SCREEN_HEIGHT + TOASTER_OFFSET);
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

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };

    const handleOptionPress = (type: 'pick-as-you-go' | 'new' | 'schedule') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (type === 'schedule') {
            // Schedule workout - just close
            handleClose();
            return;
        }

        // For other options, navigate to Workout screen with workout started
        handleClose();
        navigation.navigate('Workout', {
            startWorkoutType: type,
        });
    };

    const topSectionPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                return gestureState.dy > 10; // Only respond to downward swipes
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    // Swipe down to dismiss
                    handleClose();
                } else {
                    // Snap back
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

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent={true}
            presentationStyle="overFullScreen"
        >
            <View style={styles.container} pointerEvents="auto">
                {/* Backdrop */}
                <Animated.View
                    style={[
                        styles.backdrop,
                        {
                            opacity: backdropOpacity,
                        },
                    ]}
                    pointerEvents="auto"
                >
                    <TouchableOpacity
                        style={StyleSheet.absoluteFill}
                        activeOpacity={1}
                        onPress={handleClose}
                    />
                </Animated.View>

                {/* Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <View style={styles.sheetContent}>
                        {/* Handle bar area - swipe to dismiss */}
                        <View
                            style={styles.topSection}
                            {...topSectionPanResponder.panHandlers}
                        >
                            <View style={styles.handleBar} />
                        </View>

                        {/* Content */}
                        <View style={styles.content}>
                        {/* Option 1: Pick as you go */}
                        <View style={styles.optionButtonWrapper}>
                            {/* Shadow layer */}
                            <Animated.View
                                style={[
                                    styles.optionButtonShadow,
                                    {
                                        opacity: pickAsYouGoShadowHeight.interpolate({
                                            inputRange: [0, 4],
                                            outputRange: [0, 1],
                                        }),
                                    },
                                ]}
                                pointerEvents="none"
                            />
                            <TouchableOpacity
                                onPress={() => handleOptionPress('pick-as-you-go')}
                                onPressIn={() => {
                                    Animated.parallel([
                                        Animated.timing(pickAsYouGoTranslateY, {
                                            toValue: 4,
                                            duration: 120,
                                            useNativeDriver: true,
                                        }),
                                        Animated.timing(pickAsYouGoShadowHeight, {
                                            toValue: 0,
                                            duration: 120,
                                            useNativeDriver: false,
                                        }),
                                    ]).start();
                                }}
                                onPressOut={() => {
                                    Animated.parallel([
                                        Animated.timing(pickAsYouGoTranslateY, {
                                            toValue: 0,
                                            duration: 120,
                                            useNativeDriver: true,
                                        }),
                                        Animated.timing(pickAsYouGoShadowHeight, {
                                            toValue: 4,
                                            duration: 120,
                                            useNativeDriver: false,
                                        }),
                                    ]).start();
                                }}
                                activeOpacity={1}
                                style={styles.optionButtonTouchable}
                            >
                                <Animated.View
                                    style={[
                                        styles.optionButton,
                                        {
                                            transform: [{ translateY: pickAsYouGoTranslateY }],
                                        },
                                    ]}
                                >
                                    <View style={styles.optionButtonContent}>
                                        <View style={styles.optionButtonLeft}>
                                            <Ionicons name="flash" size={24} color="#252525" />
                                            <View style={styles.optionButtonTextContainer}>
                                                <Text style={styles.optionButtonTitle}>pick as you go</Text>
                                                <Text style={styles.optionButtonSubtitle}>start a workout and add exercises as you go</Text>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#252525" />
                                    </View>
                                </Animated.View>
                            </TouchableOpacity>
                        </View>

                        {/* Option 2: Create new workout */}
                        <View style={styles.optionButtonWrapper}>
                            {/* Shadow layer */}
                            <Animated.View
                                style={[
                                    styles.optionButtonShadow,
                                    {
                                        opacity: createNewShadowHeight.interpolate({
                                            inputRange: [0, 4],
                                            outputRange: [0, 1],
                                        }),
                                    },
                                ]}
                                pointerEvents="none"
                            />
                            <TouchableOpacity
                                onPress={() => handleOptionPress('new')}
                                onPressIn={() => {
                                    Animated.parallel([
                                        Animated.timing(createNewTranslateY, {
                                            toValue: 4,
                                            duration: 120,
                                            useNativeDriver: true,
                                        }),
                                        Animated.timing(createNewShadowHeight, {
                                            toValue: 0,
                                            duration: 120,
                                            useNativeDriver: false,
                                        }),
                                    ]).start();
                                }}
                                onPressOut={() => {
                                    Animated.parallel([
                                        Animated.timing(createNewTranslateY, {
                                            toValue: 0,
                                            duration: 120,
                                            useNativeDriver: true,
                                        }),
                                        Animated.timing(createNewShadowHeight, {
                                            toValue: 4,
                                            duration: 120,
                                            useNativeDriver: false,
                                        }),
                                    ]).start();
                                }}
                                activeOpacity={1}
                                style={styles.optionButtonTouchable}
                            >
                                <Animated.View
                                    style={[
                                        styles.optionButton,
                                        {
                                            transform: [{ translateY: createNewTranslateY }],
                                        },
                                    ]}
                                >
                                    <View style={styles.optionButtonContent}>
                                        <View style={styles.optionButtonLeft}>
                                            <Ionicons name="add-circle" size={24} color="#252525" />
                                            <View style={styles.optionButtonTextContainer}>
                                                <Text style={styles.optionButtonTitle}>create new workout</Text>
                                                <Text style={styles.optionButtonSubtitle}>build a custom workout from scratch</Text>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#252525" />
                                    </View>
                                </Animated.View>
                            </TouchableOpacity>
                        </View>

                        {/* Option 3: Schedule workout */}
                        <View style={styles.optionButtonWrapper}>
                            {/* Shadow layer */}
                            <Animated.View
                                style={[
                                    styles.optionButtonShadow,
                                    {
                                        opacity: scheduleShadowHeight.interpolate({
                                            inputRange: [0, 4],
                                            outputRange: [0, 1],
                                        }),
                                    },
                                ]}
                                pointerEvents="none"
                            />
                            <TouchableOpacity
                                onPress={() => handleOptionPress('schedule')}
                                onPressIn={() => {
                                    Animated.parallel([
                                        Animated.timing(scheduleTranslateY, {
                                            toValue: 4,
                                            duration: 120,
                                            useNativeDriver: true,
                                        }),
                                        Animated.timing(scheduleShadowHeight, {
                                            toValue: 0,
                                            duration: 120,
                                            useNativeDriver: false,
                                        }),
                                    ]).start();
                                }}
                                onPressOut={() => {
                                    Animated.parallel([
                                        Animated.timing(scheduleTranslateY, {
                                            toValue: 0,
                                            duration: 120,
                                            useNativeDriver: true,
                                        }),
                                        Animated.timing(scheduleShadowHeight, {
                                            toValue: 4,
                                            duration: 120,
                                            useNativeDriver: false,
                                        }),
                                    ]).start();
                                }}
                                activeOpacity={1}
                                style={styles.optionButtonTouchable}
                            >
                                <Animated.View
                                    style={[
                                        styles.optionButton,
                                        {
                                            transform: [{ translateY: scheduleTranslateY }],
                                        },
                                    ]}
                                >
                                    <View style={styles.optionButtonContent}>
                                        <View style={styles.optionButtonLeft}>
                                            <Ionicons name="calendar" size={24} color="#252525" />
                                            <View style={styles.optionButtonTextContainer}>
                                                <Text style={styles.optionButtonTitle}>schedule workout</Text>
                                                <Text style={styles.optionButtonSubtitle}>plan your workout for later</Text>
                                            </View>
                                        </View>
                                        <Ionicons name="chevron-forward" size={20} color="#252525" />
                                    </View>
                                </Animated.View>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                </Animated.View>
            </View>
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
    sheet: {
        position: 'absolute',
        bottom: -Dimensions.get('window').height * 0.6, // Start from below to extend behind keyboard
        left: 0,
        right: 0,
        paddingBottom: Dimensions.get('window').height * 0.6, // Extra padding to extend behind keyboard
        overflow: 'hidden',
    },
    sheetContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 2,
        borderColor: '#252525',
        borderBottomWidth: 0,
        paddingHorizontal: 20,
        overflow: 'hidden',
        height: SHEET_CONTENT_HEIGHT,
    },
    topSection: {
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
    content: {
        flex: 1,
        paddingHorizontal: 0,
        paddingTop: 0,
        gap: 12,
        alignItems: 'center',
    },
    optionButtonWrapper: {
        position: 'relative',
        width: '100%',
        maxWidth: 360,
        height: 100,
        marginBottom: 12,
    },
    optionButtonShadow: {
        position: 'absolute',
        width: '100%',
        height: 100,
        backgroundColor: '#252525',
        borderRadius: 12,
        top: 4,
        left: 0,
        zIndex: 0,
    },
    optionButtonTouchable: {
        zIndex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
    },
    optionButton: {
        width: '100%',
        height: 100,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#252525',
        borderRadius: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
    },
    optionButtonLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 12,
    },
    optionButtonTextContainer: {
        flex: 1,
        marginLeft: 16,
    },
    optionButtonTitle: {
        fontSize: 18,
        fontFamily: fonts.bold,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 4,
    },
    optionButtonSubtitle: {
        fontSize: 14,
        fontFamily: fonts.regular,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
});

