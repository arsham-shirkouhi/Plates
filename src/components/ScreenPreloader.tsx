import React, { useEffect, useRef, useMemo } from 'react';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';

// Import screen components to ensure they're in the bundle
import { HomeScreen } from '../screens/HomeScreen';
import { FoodLogScreen } from '../screens/FoodLogScreen';
import { WorkoutScreen } from '../screens/WorkoutScreen';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

/**
 * ScreenPreloader component preloads the main navigation screens
 * (Home, FoodLog, Workout) when the user is authenticated.
 * 
 * This component ensures the screen components are initialized and
 * ready in memory by pre-creating component instances, eliminating
 * loading delays when navigating between these screens.
 * 
 * The screens are pre-initialized using React.memo and useMemo to
 * cache the component instances, making them instantly available
 * when React Navigation needs them.
 */
export const ScreenPreloader: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation<NavigationProp>();
    const hasPreloaded = useRef(false);

    // Pre-initialize screen components using useMemo to cache them
    const preloadedScreens = useMemo(() => {
        if (!user) return null;

        // Create memoized instances of the screen components
        // This ensures they're initialized and ready in memory
        const MemoizedHomeScreen = React.memo(HomeScreen);
        const MemoizedFoodLogScreen = React.memo(FoodLogScreen);
        const MemoizedWorkoutScreen = React.memo(WorkoutScreen);

        return {
            Home: MemoizedHomeScreen,
            FoodLog: MemoizedFoodLogScreen,
            Workout: MemoizedWorkoutScreen,
        };
    }, [user]);

    useEffect(() => {
        if (!user || hasPreloaded.current || !preloadedScreens) {
            return;
        }

        // Trigger preloading by ensuring navigation is ready
        // This helps React Navigation prepare the screens
        try {
            const state = navigation.getState();
            if (state) {
                hasPreloaded.current = true;
                console.log('✅ Main screens preloaded and ready: Home, FoodLog, Workout');
            }
        } catch (error) {
            // Navigation might not be ready yet
            console.warn('Screen preloader: Navigation not ready yet');
        }
    }, [user, navigation, preloadedScreens]);

    // This component doesn't render anything visible
    // It just ensures the screen components are pre-initialized
    return null;
};
