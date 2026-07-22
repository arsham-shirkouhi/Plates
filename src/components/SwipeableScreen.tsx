import React, { useRef, useEffect } from 'react';
import { View, PanResponder, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useOverlay } from '../contexts/OverlayContext';
import { useWorkoutOverlay } from '../contexts/WorkoutOverlayContext';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';
import * as Haptics from 'expo-haptics';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

interface SwipeableScreenProps {
    children: React.ReactNode;
    screenName: 'Home' | 'FoodLog' | 'Workout';
}

const SCREEN_ORDER: ('Home' | 'FoodLog' | 'Workout')[] = ['Home', 'FoodLog', 'Workout'];
const SWIPE_THRESHOLD = 50; // Minimum distance to trigger swipe
const VELOCITY_THRESHOLD = 0.5; // Minimum velocity to trigger swipe

export const SwipeableScreen: React.FC<SwipeableScreenProps> = ({ children, screenName }) => {
    const navigation = useNavigation<NavigationProp>();
    const { open: openWorkoutOverlay, isOpen: isWorkoutOverlayOpen } = useWorkoutOverlay();
    const { state, expand } = useActiveWorkout();
    const { isAnyOverlayOpen } = useOverlay();
    const isAnyOverlayOpenRef = useRef(isAnyOverlayOpen);
    const isMuscleSelectOpen = isWorkoutOverlayOpen && !state.workout;
    const isMuscleSelectOpenRef = useRef(isMuscleSelectOpen);

    useEffect(() => {
        isAnyOverlayOpenRef.current = isAnyOverlayOpen;
    }, [isAnyOverlayOpen]);

    useEffect(() => {
        isMuscleSelectOpenRef.current = isMuscleSelectOpen;
    }, [isMuscleSelectOpen]);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                if (isAnyOverlayOpenRef.current || isMuscleSelectOpenRef.current) {
                    return false;
                }
                return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
            },
            onPanResponderRelease: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
                if (isAnyOverlayOpenRef.current || isMuscleSelectOpenRef.current) {
                    return;
                }

                const { dx, vx } = gestureState;
                const currentIndex = SCREEN_ORDER.indexOf(screenName);

                // Check if swipe is significant enough
                const isSwipeRight = dx < -SWIPE_THRESHOLD || (vx < -VELOCITY_THRESHOLD && dx < -20);
                const isSwipeLeft = dx > SWIPE_THRESHOLD || (vx > VELOCITY_THRESHOLD && dx > 20);

                if (isSwipeRight && currentIndex < SCREEN_ORDER.length - 1) {
                    const nextScreen = SCREEN_ORDER[currentIndex + 1];
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (nextScreen === 'Workout') {
                        openWorkoutOverlay();
                        if (state.workout) {
                            expand();
                        }
                    } else {
                        navigation.navigate(nextScreen);
                    }
                } else if (isSwipeLeft && currentIndex > 0) {
                    const prevScreen = SCREEN_ORDER[currentIndex - 1];
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    if (prevScreen === 'Workout') {
                        openWorkoutOverlay();
                        if (state.workout) {
                            expand();
                        }
                    } else {
                        navigation.navigate(prevScreen);
                    }
                }
            },
        })
    ).current;

    const blockWorkoutPassThrough = screenName === 'Workout' && isMuscleSelectOpen;

    return (
        <View
            style={{ flex: 1, backgroundColor: 'transparent' }}
            pointerEvents={blockWorkoutPassThrough ? 'auto' : screenName === 'Workout' ? 'box-none' : 'auto'}
            {...panResponder.panHandlers}
        >
            {children}
        </View>
    );
};

