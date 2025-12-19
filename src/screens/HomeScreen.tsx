import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Alert, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
import { TodaysGoalsWidget } from '../components/TodaysGoalsWidget';
import { SquareWidget } from '../components/SquareWidget';
import { TestControls } from '../components/TestControls';
import { GradientBackground } from '../components/GradientBackground';
import { BottomNavBar } from '../components/BottomNavBar';
import { AddButton, NavButtons } from '../components/NavButton';
import { BlobAnimation } from '../components/BlobAnimation';
import { BorderRingAnimation } from '../components/BorderRingAnimation';
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
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const closeMenuRef = useRef<(() => void) | null>(null);

    // Blob animation state - single blob that follows finger
    const [isTouching, setIsTouching] = useState(false);
    const [showBorderRing, setShowBorderRing] = useState(false);
    const isTouchingRef = useRef(false);
    const pan = useRef(new Animated.ValueXY()).current;
    const containerRef = useRef<View>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    const loadUserProfile = useCallback(async () => {
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
    }, [user]);

    // Load today's daily log
    const loadDailyLog = useCallback(async () => {
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
    }, [user]);

    // Load on mount
    useEffect(() => {
        loadUserProfile();
        loadDailyLog();
    }, [loadUserProfile, loadDailyLog]);

    // Reload when screen comes into focus (e.g., after completing onboarding)
    useFocusEffect(
        useCallback(() => {
            loadUserProfile();
            loadDailyLog();
        }, [loadUserProfile, loadDailyLog])
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

    // Store container position for coordinate calculation
    const containerPositionRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

    // Track touch for blob animation without interfering with ScrollView
    const touchStartPosition = useRef<{ x: number; y: number } | null>(null);
    const isScrolling = useRef(false);

    const handleTouchStart = useCallback((evt: any) => {
        const { pageX, pageY } = evt.nativeEvent;
        touchStartPosition.current = { x: pageX, y: pageY };
        isScrolling.current = false;

        // Start timer for blob and border ring (only if not scrolling)
        longPressTimerRef.current = setTimeout(() => {
            if (!isScrolling.current && touchStartPosition.current) {
                pan.setValue({
                    x: touchStartPosition.current.x - containerPositionRef.current.x - 35,
                    y: touchStartPosition.current.y - containerPositionRef.current.y - 35,
                });
                isTouchingRef.current = true;
                setIsTouching(true);
                setShowBorderRing(true);
            }
        }, 1000);
    }, []);

    const handleTouchMove = useCallback((evt: any) => {
        // If user moves finger significantly, they're scrolling
        if (touchStartPosition.current) {
            const { pageX, pageY } = evt.nativeEvent;
            const dx = Math.abs(pageX - touchStartPosition.current.x);
            const dy = Math.abs(pageY - touchStartPosition.current.y);
            if (dx > 5 || dy > 5) {
                isScrolling.current = true;
                if (longPressTimerRef.current) {
                    clearTimeout(longPressTimerRef.current);
                    longPressTimerRef.current = null;
                }
            }
        }

        // Update blob position if it's active - use ref to avoid dependency
        if (isTouchingRef.current) {
            const { pageX, pageY } = evt.nativeEvent;
            pan.setValue({
                x: pageX - containerPositionRef.current.x - 35,
                y: pageY - containerPositionRef.current.y - 35,
            });
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        touchStartPosition.current = null;
        isScrolling.current = false;
        isTouchingRef.current = false;
        setIsTouching(false);
        setShowBorderRing(false);
    }, []);


    return (
        <View
            ref={containerRef}
            style={styles.container}
            onLayout={() => {
                // Store container position when layout is ready
                containerRef.current?.measureInWindow((x, y, width, height) => {
                    containerPositionRef.current = { x, y };
                });
            }}
        >
            <View
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    style={styles.scrollView}
                    scrollEventThrottle={16}
                    removeClippedSubviews={false}
                    nestedScrollEnabled={true}
                    keyboardShouldPersistTaps="handled"
                    decelerationRate="normal"
                    bounces={false}
                    overScrollMode="never"
                    scrollEnabled={true}
                    alwaysBounceVertical={false}
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

                    {/* Square Widgets Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                        <TodaysGoalsWidget
                            onPress={() => {
                                Alert.alert('Today\'s Goals', 'Goals screen coming soon');
                            }}
                        />
                        <SquareWidget title="widget 2" content="content 2" />
                    </View>

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
            </View>

            {/* Blob that follows finger */}
            {isTouching && (
                <Animated.View
                    style={[
                        {
                            position: 'absolute',
                            width: 70,
                            height: 70,
                            transform: [
                                { translateX: pan.x },
                                { translateY: pan.y },
                            ],
                        },
                    ]}
                    pointerEvents="none"
                >
                    <BlobAnimation
                        x={35}
                        y={35}
                        onComplete={() => { }}
                    />
                </Animated.View>
            )}

            {/* Border ring animation (Apple AI style) */}
            <BorderRingAnimation isActive={showBorderRing} />

            {/* White to transparent gradient behind buttons */}
            <LinearGradient
                colors={['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={[
                    {
                        position: 'absolute',
                        left: 0,
                        right: 0,
                        bottom: 0,
                        height: 150,
                        zIndex: 99, // Behind buttons but above content
                    },
                    { paddingBottom: insets.bottom }
                ]}
                pointerEvents="none"
            />

            {/* Transparent overlay to close menu when clicking outside */}
            {isMenuOpen && (
                <TouchableOpacity
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        width: Dimensions.get('window').width,
                        height: Dimensions.get('window').height,
                        zIndex: 98, // Above content but below nav buttons (zIndex 100)
                    }}
                    activeOpacity={1}
                    onPress={() => {
                        // Close menu by calling AddButton's close function
                        closeMenuRef.current?.();
                    }}
                />
            )}

            {/* Bottom Navigation Bar */}
            <BottomNavBar>
                <NavButtons
                    onHomePress={() => {
                        // Close menu if open
                        if (isMenuOpen) {
                            closeMenuRef.current?.();
                        }
                        // Already on home screen
                    }}
                    onFoodPress={() => {
                        // Close menu if open
                        if (isMenuOpen) {
                            closeMenuRef.current?.();
                        }
                        Alert.alert('Food', 'Food screen coming soon');
                    }}
                    onFitnessPress={() => {
                        // Close menu if open
                        if (isMenuOpen) {
                            closeMenuRef.current?.();
                        }
                        Alert.alert('Fitness', 'Fitness screen coming soon');
                    }}
                />
                <AddButton
                    onPress={() => {
                        Alert.alert('Add', 'Add functionality coming soon');
                    }}
                    onMenuStateChange={(isOpen) => {
                        setIsMenuOpen(isOpen);
                    }}
                    onCloseMenu={closeMenuRef}
                />
            </BottomNavBar>
        </View>
    );
};

