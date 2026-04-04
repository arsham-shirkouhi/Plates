import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigationState } from '@react-navigation/native';
import { SwipeableScreen } from './SwipeableScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { useWorkoutOverlay } from '../contexts/WorkoutOverlayContext';

/**
 * Renders the active workout UI above the stack (not as a modal screen) so Home / FoodLog
 * stay the focused route and remain scrollable when the sheet is minimized.
 * Hidden (non-intercepting) while other stack screens like ExerciseDetail are on top.
 */
export const WorkoutOverlayHost: React.FC = () => {
    const { isOpen } = useWorkoutOverlay();
    const topRouteName = useNavigationState((state) => {
        if (!state?.routes?.length) return undefined;
        return state.routes[state.index]?.name;
    });

    const dashboardVisible = topRouteName === 'Home' || topRouteName === 'FoodLog';

    if (!isOpen) {
        return null;
    }

    const allowChrome = dashboardVisible;

    return (
        <View
            style={[
                styles.layer,
                allowChrome ? styles.layerInteractive : styles.layerPassThrough,
            ]}
            collapsable={false}
        >
            <SwipeableScreen screenName="Workout">
                <WorkoutScreen />
            </SwipeableScreen>
        </View>
    );
};

const styles = StyleSheet.create({
    layer: {
        ...StyleSheet.absoluteFillObject,
    },
    layerInteractive: {
        zIndex: 100,
        elevation: 100,
        pointerEvents: 'box-none',
    },
    layerPassThrough: {
        zIndex: 0,
        elevation: 0,
        pointerEvents: 'none',
        opacity: 0,
    },
});
