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
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { fonts } from '../constants/fonts';
import * as Haptics from 'expo-haptics';
import { useOverlay } from '../contexts/OverlayContext';
import { SavedWorkoutSummary } from '../workout/workoutHistoryTypes';
import { Button } from './Button';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const TOASTER_OFFSET = 50;
const SHEET_HEIGHT = 520;
const SHEET_CONTENT_HEIGHT = SHEET_HEIGHT + TOASTER_OFFSET;

interface StartWorkoutBottomSheetProps {
    visible: boolean;
    onClose: () => void;
    isFirstWorkout?: boolean;
    savedWorkouts?: SavedWorkoutSummary[];
    onStartEmpty?: () => void;
    onStartFromWorkout?: (workoutId: string) => void;
}

export const StartWorkoutBottomSheet: React.FC<StartWorkoutBottomSheetProps> = ({
    visible,
    onClose,
    isFirstWorkout = false,
    savedWorkouts = [],
    onStartEmpty,
    onStartFromWorkout,
}) => {
    const { registerOverlay } = useOverlay();
    const OVERLAY_ID = 'StartWorkoutBottomSheet';
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT + TOASTER_OFFSET)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        registerOverlay(OVERLAY_ID, visible);
        return () => {
            registerOverlay(OVERLAY_ID, false);
        };
    }, [visible, registerOverlay]);

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
    }, [visible, slideAnim, backdropOpacity]);

    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
    };

    const handleStartEmpty = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handleClose();
        onStartEmpty?.();
    };

    const handleStartFromSaved = (workoutId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        handleClose();
        onStartFromWorkout?.(workoutId);
    };

    const topSectionPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
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

    const hasSavedWorkouts = savedWorkouts.length > 0;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            onRequestClose={handleClose}
            statusBarTranslucent
            presentationStyle="overFullScreen"
        >
            <View style={styles.container} pointerEvents="auto">
                <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents="auto">
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={handleClose} />
                </Animated.View>

                <Animated.View style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={styles.sheetContent}>
                        <View style={styles.topSection} {...topSectionPanResponder.panHandlers}>
                            <View style={styles.handleBar} />
                            <Text style={styles.title}>
                                {isFirstWorkout ? 'your first workout' : 'start a workout'}
                            </Text>
                            <Text style={styles.subtitle}>
                                {isFirstWorkout
                                    ? 'you\'re about to begin — we\'ll count you in.'
                                    : 'repeat a saved workout or start fresh from scratch.'}
                            </Text>
                        </View>

                        <ScrollView
                            style={styles.scroll}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                        >
                            {!isFirstWorkout && hasSavedWorkouts ? (
                                <View style={styles.savedSection}>
                                    <Text style={styles.sectionTitle}>your workouts</Text>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={styles.savedScrollContent}
                                    >
                                        {savedWorkouts.map((workout) => (
                                            <TouchableOpacity
                                                key={workout.id}
                                                style={styles.savedCard}
                                                onPress={() => handleStartFromSaved(workout.id)}
                                                activeOpacity={0.85}
                                            >
                                                <View style={styles.savedCardHeader}>
                                                    <Text style={styles.savedCardTitle}>{workout.name}</Text>
                                                    <Ionicons name="chevron-forward" size={18} color="#252525" />
                                                </View>
                                                <Text style={styles.savedCardMeta}>
                                                    {workout.exerciseCount} exercises · {workout.duration}
                                                </Text>
                                                <Text style={styles.savedCardMeta}>
                                                    {workout.source === 'preset' ? 'preset' : 'last done'} ·{' '}
                                                    {workout.lastCompleted}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            ) : null}

                            <Button
                                title={isFirstWorkout ? 'start my first workout' : 'new workout from scratch'}
                                onPress={handleStartEmpty}
                                containerStyle={styles.primaryButton}
                            />
                        </ScrollView>
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
        bottom: -SCREEN_HEIGHT * 0.6,
        left: 0,
        right: 0,
        paddingBottom: SCREEN_HEIGHT * 0.6,
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
        paddingBottom: 12,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#E0E0E0',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontFamily: fonts.bold,
        fontSize: 22,
        color: '#252525',
        textTransform: 'lowercase',
        marginBottom: 6,
    },
    subtitle: {
        fontFamily: fonts.regular,
        fontSize: 14,
        color: '#9E9E9E',
        textTransform: 'lowercase',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    savedSection: {
        marginBottom: 18,
    },
    sectionTitle: {
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#252525',
        marginBottom: 12,
        textTransform: 'lowercase',
    },
    savedScrollContent: {
        gap: 10,
        paddingRight: 8,
    },
    savedCard: {
        width: 240,
        borderWidth: 2.5,
        borderColor: '#252525',
        borderRadius: 12,
        padding: 14,
        backgroundColor: '#FAFAFA',
    },
    savedCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    savedCardTitle: {
        flex: 1,
        fontFamily: fonts.bold,
        fontSize: 16,
        color: '#252525',
        textTransform: 'lowercase',
        marginRight: 8,
    },
    savedCardMeta: {
        fontFamily: fonts.regular,
        fontSize: 12,
        color: '#9E9E9E',
        marginTop: 2,
        textTransform: 'lowercase',
    },
    primaryButton: {
        width: '100%',
        maxWidth: 360,
        alignSelf: 'center',
    },
});
