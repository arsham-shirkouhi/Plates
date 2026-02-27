import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { User } from '@supabase/supabase-js';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { VerificationScreen } from '../screens/VerificationScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { MacroResultsScreen } from '../screens/MacroResultsScreen';
import { MealDetailScreen } from '../screens/MealDetailScreen';
import { PreloadedHomeScreen, PreloadedFoodLogScreen, PreloadedWorkoutScreen } from './PreloadedScreens';
import { StartWorkoutScreen } from '../screens/StartWorkoutScreen';
import { BrowseWorkoutsScreen } from '../screens/BrowseWorkoutsScreen';
import { ExerciseDetailScreen } from '../screens/ExerciseDetailScreen';
import { ExerciseInfoScreen } from '../screens/ExerciseInfoScreen';
import { ExerciseLogScreen } from '../screens/ExerciseLogScreen';
import { UniversalNavBar } from '../components/UniversalNavBar';
import { SimpleNavBar } from '../components/SimpleNavBar';
import { ScreenPreloader } from '../components/ScreenPreloader';

export type RootStackParamList = {
    Login: undefined;
    Signup: undefined;
    Home: undefined;
    Verification: { email?: string };
    ForgotPassword: undefined;
    Onboarding: undefined;
    MacroResults: {
        macros: {
            calories: number;
            protein: number;
            carbs: number;
            fats: number;
            baseTDEE?: number;
        };
        goal: 'lose' | 'maintain' | 'build';
        goalIntensity: 'mild' | 'moderate' | 'aggressive';
    };
    FoodLog: undefined;
    ExerciseLog: undefined;
    MealDetail: {
        meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
        foods: Array<{
            id: string;
            food: {
                name: string;
                calories: number;
                protein: number;
                carbs: number;
                fats: number;
            };
            loggedAt: string; // ISO string
            meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
            portion?: string;
        }>;
        mealTotal: {
            calories: number;
            protein: number;
            carbs: number;
            fats: number;
        };
    };
    Workout: {
        startWorkoutType?: 'pick-as-you-go' | 'previous' | 'new' | 'schedule';
        workoutId?: string;
        updatedExerciseId?: string;
        updatedSets?: Array<{ id: string; reps: string; weight: string; completed?: boolean }>;
        updatedExercises?: Array<{
            id: string;
            name: string;
            sets: Array<{ id: string; reps: string; weight: string; completed?: boolean }>;
        }>;
        newlyCompletedExerciseIds?: string[];
        startWorkoutPrompt?: boolean;
    } | undefined;
    StartWorkout: { selectedWorkoutId?: string } | undefined;
    BrowseWorkouts: undefined;
    ExerciseDetail: {
        exercise: {
            id: string;
            name: string;
            sets: Array<{
                id: string;
                reps: string;
                weight: string;
                completed?: boolean;
            }>;
        };
        exerciseId: string;
        allExercises?: Array<{
            id: string;
            name: string;
            sets: Array<{
                id: string;
                reps: string;
                weight: string;
                completed?: boolean;
            }>;
        }>;
        currentExerciseIndex?: number;
    };
    ExerciseInfo: {
        exerciseId: string;
    };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
    user: User | null;
}

const NavigatorWithNavBar: React.FC = () => {
    return (
        <>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    contentStyle: { flex: 1 },
                    animation: 'fade',
                    animationDuration: 200,
                }}
                initialRouteName="Login"
            >
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 250,
                        gestureEnabled: true,
                    }}
                />
                <Stack.Screen
                    name="Signup"
                    component={SignupScreen}
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 250,
                        gestureEnabled: true,
                    }}
                />
                <Stack.Screen name="Verification" component={VerificationScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="Onboarding" component={OnboardingScreen} />
                <Stack.Screen
                    name="MacroResults"
                    component={MacroResultsScreen}
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 300,
                    }}
                />
                <Stack.Screen
                    name="Home"
                    component={PreloadedHomeScreen}
                    options={{
                        gestureEnabled: true,
                        animation: 'slide_from_right',
                        animationDuration: 200,
                        // Screen is preloaded and ready for smooth swiping
                    }}
                />
                <Stack.Screen
                    name="FoodLog"
                    component={PreloadedFoodLogScreen}
                    options={{
                        gestureEnabled: true,
                        animation: 'slide_from_right',
                        animationDuration: 200,
                        // Screen is preloaded and ready for smooth swiping
                    }}
                />
                <Stack.Screen
                    name="MealDetail"
                    component={MealDetailScreen}
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 300,
                    }}
                />
                <Stack.Screen
                    name="Workout"
                    component={PreloadedWorkoutScreen}
                    options={{
                        gestureEnabled: true,
                        animation: 'slide_from_right',
                        animationDuration: 200,
                        // Screen is preloaded and ready for smooth swiping
                    }}
                />
                <Stack.Screen
                    name="StartWorkout"
                    component={StartWorkoutScreen}
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 300,
                    }}
                />
                <Stack.Screen
                    name="BrowseWorkouts"
                    component={BrowseWorkoutsScreen}
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 300,
                    }}
                />
                <Stack.Screen
                    name="ExerciseDetail"
                    component={ExerciseDetailScreen}
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 300,
                    }}
                />
                <Stack.Screen
                    name="ExerciseInfo"
                    component={ExerciseInfoScreen}
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 300,
                    }}
                />
                <Stack.Screen
                    name="ExerciseLog"
                    component={ExerciseLogScreen}
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 300,
                    }}
                />
            </Stack.Navigator>
            {/* Old NavBar - hidden but component preserved */}
            <UniversalNavBar />
            {/* New Simple NavBar */}
            <SimpleNavBar />
            {/* Screen Preloader - preloads main screens for instant navigation */}
            <ScreenPreloader />
        </>
    );
};

export const AppNavigator: React.FC<AppNavigatorProps> = ({ user }) => {
    return (
        <NavigationContainer>
            <NavigatorWithNavBar />
        </NavigationContainer>
    );
};

