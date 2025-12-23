import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { User } from '@supabase/supabase-js';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { VerificationScreen } from '../screens/VerificationScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { MacroResultsScreen } from '../screens/MacroResultsScreen';
import { FoodLogScreen } from '../screens/FoodLogScreen';
import { UniversalNavBar } from '../components/UniversalNavBar';

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
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen
                    name="FoodLog"
                    component={FoodLogScreen}
                    options={{
                        animation: 'slide_from_right',
                        animationDuration: 300,
                    }}
                />
            </Stack.Navigator>
            {/* Universal NavBar - overlays all main app screens */}
            <UniversalNavBar />
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

