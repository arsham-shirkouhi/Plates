import React, { useState, useEffect } from 'react';
import { View, Text, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/Button';
import { resetOnboarding, getUserProfile, UserProfile } from '../services/userService';
import { styles } from './HomeScreen.styles';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
    const { user, logout } = useAuth();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const [loggingOut, setLoggingOut] = useState(false);
    const [resettingOnboarding, setResettingOnboarding] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);

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

    // Load user profile and macros on mount and when screen comes into focus
    const loadUserProfile = async () => {
        if (!user) {
            setLoadingProfile(false);
            return;
        }

        try {
            setLoadingProfile(true);
            const profile = await getUserProfile(user);
            setUserProfile(profile);
        } catch (error) {
            console.error('Error loading user profile:', error);
        } finally {
            setLoadingProfile(false);
        }
    };

    // Load on mount
    useEffect(() => {
        loadUserProfile();
    }, [user]);

    // Reload when screen comes into focus (e.g., after completing onboarding)
    useFocusEffect(
        React.useCallback(() => {
            loadUserProfile();
        }, [user])
    );

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

            {/* Macros Display */}
            {!loadingProfile && (userProfile?.userSettings?.macros || userProfile?.targetMacros) && (
                <View style={styles.macrosContainer}>
                    <Text style={styles.macrosTitle}>Daily Macros</Text>
                    {(() => {
                        const macros = userProfile?.userSettings?.macros || userProfile?.targetMacros;
                        return (
                            <>
                                {/* Base TDEE (Maintenance) */}
                                {macros?.baseTDEE && (
                                    <View style={styles.baseTDEEContainer}>
                                        <Text style={styles.baseTDEELabel}>Maintenance Calories:</Text>
                                        <Text style={styles.baseTDEEValue}>{macros.baseTDEE}</Text>
                                    </View>
                                )}
                                <View style={styles.macroRow}>
                                    <Text style={styles.macroLabel}>Calories:</Text>
                                    <Text style={styles.macroValue}>{macros?.calories}</Text>
                                </View>
                                <View style={styles.macroRow}>
                                    <Text style={styles.macroLabel}>Protein:</Text>
                                    <Text style={styles.macroValue}>{macros?.protein} g</Text>
                                </View>
                                <View style={styles.macroRow}>
                                    <Text style={styles.macroLabel}>Carbs:</Text>
                                    <Text style={styles.macroValue}>{macros?.carbs} g</Text>
                                </View>
                                <View style={styles.macroRow}>
                                    <Text style={styles.macroLabel}>Fats:</Text>
                                    <Text style={styles.macroValue}>{macros?.fats} g</Text>
                                </View>
                            </>
                        );
                    })()}
                </View>
            )}

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

