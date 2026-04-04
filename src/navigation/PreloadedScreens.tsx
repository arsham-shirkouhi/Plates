import React from 'react';
import { HomeScreen } from '../screens/HomeScreen';
import { FoodLogScreen } from '../screens/FoodLogScreen';
import { SwipeableScreen } from '../components/SwipeableScreen';

/**
 * Preloaded screen components for the main navigation tabs.
 * Workout UI is rendered via `WorkoutOverlayHost`, not as a stack screen.
 */

const HomeScreenWithSwipe = () => (
    <SwipeableScreen screenName="Home">
        <HomeScreen />
    </SwipeableScreen>
);
export const PreloadedHomeScreen = React.memo(HomeScreenWithSwipe);

const FoodLogScreenWithSwipe = () => (
    <SwipeableScreen screenName="FoodLog">
        <FoodLogScreen />
    </SwipeableScreen>
);
export const PreloadedFoodLogScreen = React.memo(FoodLogScreenWithSwipe);
