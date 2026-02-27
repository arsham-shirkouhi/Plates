import React from 'react';
import { HomeScreen } from '../screens/HomeScreen';
import { FoodLogScreen } from '../screens/FoodLogScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';
import { SwipeableScreen } from '../components/SwipeableScreen';

/**
 * Preloaded screen components for the main navigation tabs.
 * 
 * These components are pre-initialized using React.memo to ensure
 * they're ready in memory when React Navigation needs them, eliminating
 * loading delays when switching between tabs.
 * 
 * The memoization ensures the components are cached and instantly available.
 * Each screen is wrapped with SwipeableScreen to enable smooth swipe gestures.
 */

// Pre-initialize and memoize HomeScreen with swipe gestures
const HomeScreenWithSwipe = () => (
    <SwipeableScreen screenName="Home">
        <HomeScreen />
    </SwipeableScreen>
);
export const PreloadedHomeScreen = React.memo(HomeScreenWithSwipe);

// Pre-initialize and memoize FoodLogScreen with swipe gestures
const FoodLogScreenWithSwipe = () => (
    <SwipeableScreen screenName="FoodLog">
        <FoodLogScreen />
    </SwipeableScreen>
);
export const PreloadedFoodLogScreen = React.memo(FoodLogScreenWithSwipe);

// Pre-initialize and memoize WorkoutScreen with swipe gestures
const WorkoutScreenWithSwipe = () => (
    <SwipeableScreen screenName="Workout">
        <WorkoutScreen />
    </SwipeableScreen>
);
export const PreloadedWorkoutScreen = React.memo(WorkoutScreenWithSwipe);

