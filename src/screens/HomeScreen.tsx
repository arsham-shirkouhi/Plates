import React, { useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/Button';
import { resetOnboarding } from '../services/userService';
import { styles } from './HomeScreen.styles';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
    const { user, logout } = useAuth();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [loggingOut, setLoggingOut] = useState(false);
    const [resettingOnboarding, setResettingOnboarding] = useState(false);

    const handleLogout = async () => {
        setLoggingOut(true);
        try {
            console.log('Logging out...');
            await logout();
            console.log('Logout successful, navigating to Login...');
            setTimeout(() => {
                navigation.replace('Login');
            }, 100);
        } catch (error: any) {
            console.error('Logout error:', error);
            Alert.alert('Logout Error', 'Failed to logout. Please try again.');
        } finally {
            setLoggingOut(false);
        }
    };

    const handleResetOnboarding = async () => {
        if (!user) {
            Alert.alert('Error', 'You must be logged in to reset onboarding.');
            return;
        }

        Alert.alert(
            'Reset Onboarding',
            'This will clear all your onboarding data and reset the onboarding flag. This is for testing purposes only. Continue?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: async () => {
                        setResettingOnboarding(true);
                        try {
                            console.log('🔄 Starting onboarding reset...');
                            await resetOnboarding(user);
                            console.log('✅ Onboarding reset complete, navigating to onboarding screen...');
                            setResettingOnboarding(false);
                            // Navigate directly to onboarding - no alert needed
                            setTimeout(() => {
                                navigation.replace('Onboarding');
                            }, 100);
                        } catch (error: any) {
                            console.error('❌ Reset onboarding error:', error);
                            setResettingOnboarding(false);
                            Alert.alert('Error', 'Failed to reset onboarding. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Home</Text>
            <Text style={styles.subtitle}>Welcome, {user?.email}</Text>

            {/* Testing Button - Reset Onboarding */}
            <Button
                variant="secondary"
                title="Reset Onboarding (Testing)"
                onPress={handleResetOnboarding}
                loading={resettingOnboarding}
                disabled={resettingOnboarding}
                containerStyle={styles.testButton}
                textStyle={styles.testButtonText}
            />

            <Button
                variant="primary"
                title="Logout"
                onPress={handleLogout}
                loading={loggingOut}
                disabled={loggingOut}
                containerStyle={styles.logoutButton}
                textStyle={styles.buttonText}
            />
        </View>
    );
};

