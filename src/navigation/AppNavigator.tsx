import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { User } from 'firebase/auth';
import { LoginScreen } from '../screens/LoginScreen';
import { SignupScreen } from '../screens/SignupScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { VerificationScreen } from '../screens/VerificationScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';

export type RootStackParamList = {
    Login: undefined;
    Signup: undefined;
    Home: undefined;
    Verification: { email?: string };
    ForgotPassword: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

interface AppNavigatorProps {
    user: User | null;
}

export const AppNavigator: React.FC<AppNavigatorProps> = ({ user }) => {
    return (
        <NavigationContainer>
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
                <Stack.Screen name="Home" component={HomeScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

