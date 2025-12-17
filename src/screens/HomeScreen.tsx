import React, { useState, useEffect, useRef } from 'react';
import { View, Alert, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { Button } from '../components/Button';
import { HeaderSection } from '../components/HeaderSection';
import { MacrosCard } from '../components/MacrosCard';
import { FoodLog } from '../components/FoodLog';
import { AIWidget } from '../components/AIWidget';
import { TestControls } from '../components/TestControls';
import { GradientBackground } from '../components/GradientBackground';
import { BottomNavBar } from '../components/BottomNavBar';
import { AddButton, NavButtons } from '../components/NavButton';
import { resetOnboarding, getUserProfile, UserProfile, getDailyMacroLog, getTodayDateString, DailyMacroLog } from '../services/userService';
import { styles } from './HomeScreen.styles';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
    const { user, logout } = useAuth();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const insets = useSafeAreaInsets();
    const [loggingOut, setLoggingOut] = useState(false);
    const [resettingOnboarding, setResettingOnboarding] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [dailyLog, setDailyLog] = useState<DailyMacroLog | null>(null);
    const [loadingLog, setLoadingLog] = useState(true);
    const closeMenuRef = useRef<(() => void) | null>(null);

    // Test values for manual adjustment
    const [testValues, setTestValues] = useState({
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
    });

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

    // Load today's daily log
    const loadDailyLog = async () => {
        if (!user) {
            setLoadingLog(false);
            return;
        }

        try {
            setLoadingLog(true);
            const today = getTodayDateString();
            const log = await getDailyMacroLog(user, today);
            setDailyLog(log);
        } catch (error) {
            console.error('Error loading daily log:', error);
        } finally {
            setLoadingLog(false);
        }
    };

    // Load on mount
    useEffect(() => {
        loadUserProfile();
        loadDailyLog();
    }, [user]);

    // Reload when screen comes into focus (e.g., after completing onboarding)
    useFocusEffect(
        React.useCallback(() => {
            loadUserProfile();
            loadDailyLog();
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

    const macros = userProfile?.userSettings?.macros || userProfile?.targetMacros;
    const streak = userProfile?.streak || 0;
    const baseConsumed = dailyLog || { calories: 0, protein: 0, carbs: 0, fats: 0 };
    const consumed = {
        calories: baseConsumed.calories + testValues.calories,
        protein: baseConsumed.protein + testValues.protein,
        carbs: baseConsumed.carbs + testValues.carbs,
        fats: baseConsumed.fats + testValues.fats,
    };

    const handleTestUpdate = (type: 'calories' | 'protein' | 'carbs' | 'fats', amount: number) => {
        setTestValues(prev => ({
            ...prev,
            [type]: Math.max(0, prev[type] + amount),
        }));
    };

    const handleTestReset = () => {
        setTestValues({ calories: 0, protein: 0, carbs: 0, fats: 0 });
    };

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                style={styles.scrollView}
            >
                {/* Gradient background */}
                <GradientBackground />

                {/* Header with streak, date, and profile */}
                {!loadingProfile && (
                    <HeaderSection
                        streak={streak}
                        topInset={insets.top}
                        onProfilePress={() => {
                            // TODO: Navigate to profile screen
                            Alert.alert('Profile', 'Profile screen coming soon');
                        }}
                    />
                )}

                {/* Main Content Card */}
                {!loadingProfile && macros && (
                    <MacrosCard macros={macros} consumed={consumed} />
                )}

                {/* Food Log */}
                <FoodLog />

                {/* AI Widget */}
                <AIWidget />

                {/* Test Controls */}
                {!loadingProfile && macros && (
                    <TestControls
                        consumed={consumed}
                        onUpdate={handleTestUpdate}
                        onReset={handleTestReset}
                    />
                )}

                {/* Testing Button - Reset Onboarding */}
                <Button
                    variant="secondary"
                    title="Reset Onboarding (Testing)"
                    onPress={handleResetOnboarding}
                    loading={resettingOnboarding}
                    disabled={resettingOnboarding}
                    containerStyle={styles.testButton}
                />

                <Button
                    variant="primary"
                    title="Logout"
                    onPress={handleLogout}
                    loading={loggingOut}
                    disabled={loggingOut}
                    containerStyle={styles.logoutButton}
                />
            </ScrollView>
            
            {/* Bottom Navigation Bar */}
            <BottomNavBar>
                <NavButtons
                    onHomePress={() => {
                        // Already on home screen
                    }}
                    onFoodPress={() => {
                        Alert.alert('Food', 'Food screen coming soon');
                    }}
                    onFitnessPress={() => {
                        Alert.alert('Fitness', 'Fitness screen coming soon');
                    }}
                />
                <AddButton
                    onPress={() => {
                        Alert.alert('Add', 'Add functionality coming soon');
                    }}
                    onMenuStateChange={() => {
                        // Menu state change handler (if needed in future)
                    }}
                    onCloseMenu={closeMenuRef}
                />
            </BottomNavBar>
        </View>
    );
};

