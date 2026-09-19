import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SwipeableScreen } from './SwipeableScreen';
import { ActiveWorkoutScreen } from '../screens/ActiveWorkoutScreen';
import { useWorkoutOverlay } from '../contexts/WorkoutOverlayContext';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';
import { isOverlayVisible } from '../workout/workoutSelectors';

/**
 * Renders the active workout UI above the stack (not as a modal screen) so Home / FoodLog
 * stay the focused route and remain scrollable when the sheet is minimized.
 * Stays mounted while a workout is in progress, even across navigation.
 */
export const WorkoutOverlayHost: React.FC = () => {
    const { isOpen } = useWorkoutOverlay();
    const { state, wrapUpSummary } = useActiveWorkout();

    const hasActiveWorkout = !!state.workout && isOverlayVisible(state.presentation);
    const shouldMount = isOpen || hasActiveWorkout || !!wrapUpSummary;

    if (!shouldMount || !state.isHydrated) {
        return null;
    }

    /** Full-screen muscle select / countdown / wrap-up must capture all touches. */
    const blockBackgroundInteraction = !!wrapUpSummary || (isOpen && !state.workout);

    return (
        <View
            style={[
                styles.layer,
                blockBackgroundInteraction ? styles.layerBlocking : styles.layerPassThrough,
            ]}
            collapsable={false}
        >
            <SwipeableScreen screenName="Workout">
                <ActiveWorkoutScreen />
            </SwipeableScreen>
        </View>
    );
};

const styles = StyleSheet.create({
    layer: {
        ...StyleSheet.absoluteFill,
    },
    layerBlocking: {
        zIndex: 100,
        elevation: 100,
        pointerEvents: 'auto',
    },
    layerPassThrough: {
        zIndex: 100,
        elevation: 100,
        pointerEvents: 'box-none',
    },
});
