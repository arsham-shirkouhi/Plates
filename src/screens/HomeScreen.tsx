import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Alert, ScrollView, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
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
import { AuraOverlay } from '../components/AuraOverlay';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import { resetOnboarding, getUserProfile, UserProfile, getDailyMacroLog, getTodayDateString, DailyMacroLog, addToDailyMacroLog, subtractFromDailyMacroLog } from '../services/userService';
import { getQuickAddItems, FoodItem } from '../services/foodService';
import { useAddFood } from '../context/AddFoodContext';
import { getDailyTasks, createDailyTask, updateDailyTask, deleteDailyTask, generateDailySummary, DailyTask } from '../services/taskService';
import { styles } from './HomeScreen.styles';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

export const HomeScreen: React.FC = () => {
    const { user, logout } = useAuth();
    const navigation = useNavigation<HomeScreenNavigationProp>();
    const insets = useSafeAreaInsets();
    const { registerHandler, unregisterHandler, registerSheetState, unregisterSheetState } = useAddFood();
    const [loggingOut, setLoggingOut] = useState(false);
    const [resettingOnboarding, setResettingOnboarding] = useState(false);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [dailyLog, setDailyLog] = useState<DailyMacroLog | null>(null);
    const [loadingLog, setLoadingLog] = useState(true);
    const [showAddFoodSheet, setShowAddFoodSheet] = useState(false);
    const [showGoalsOverlay, setShowGoalsOverlay] = useState(false);
    
    // Tasks state (loaded from database)
    const [tasks, setTasks] = useState<DailyTask[]>([]);
    const [loadingTasks, setLoadingTasks] = useState(true);

    // Aura overlay state
    const [showBorderRing, setShowBorderRing] = useState(false);
    const isTouchingRef = useRef(false);
    const containerRef = useRef<View>(null);
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const hapticIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

    // Load today's tasks
    const loadDailyTasks = useCallback(async () => {
        if (!user) {
            setLoadingTasks(false);
            return;
        }

        try {
            setLoadingTasks(true);
            const today = getTodayDateString();
            const dailyTasks = await getDailyTasks(user, today);
            setTasks(dailyTasks);
        } catch (error) {
            console.error('Error loading daily tasks:', error);
        } finally {
            setLoadingTasks(false);
        }
    }, [user]);

    // Handle adding food
    const handleAddFood = useCallback(async (food: FoodItem) => {
        if (!user) return;

        try {
            // Add to daily log
            await addToDailyMacroLog(user, {
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fats: food.fats,
            });

            // Reload daily log to update UI
            await loadDailyLog();
        } catch (error) {
            console.error('Error adding food:', error);
            Alert.alert('Error', 'Failed to add food. Please try again.');
        }
    }, [user, loadDailyLog]);

    // Handle removing food (for undo)
    const handleRemoveFood = useCallback(async (food: FoodItem) => {
        if (!user) return;

        try {
            // Subtract from daily log
            await subtractFromDailyMacroLog(user, {
                calories: food.calories,
                protein: food.protein,
                carbs: food.carbs,
                fats: food.fats,
            });

            // Reload daily log to update UI
            await loadDailyLog();
        } catch (error) {
            console.error('Error removing food:', error);
            Alert.alert('Error', 'Failed to remove food. Please try again.');
        }
    }, [user, loadDailyLog]);

    // Register add food handler with context
    useEffect(() => {
        registerHandler(handleAddFood);
        registerSheetState(setShowAddFoodSheet);
        return () => {
            unregisterHandler();
            unregisterSheetState();
        };
    }, [handleAddFood, registerHandler, unregisterHandler, registerSheetState, unregisterSheetState]);

    // Convert tasks to goals format for widget - only from database, no placeholders
    const goals = (tasks || []).map((task, index) => ({
        text: task.title,
        completed: task.is_completed,
        createdAt: task.created_at,
        isRepeating: false, // Can be enhanced later
        order: index,
    }));

    // Handle task changes from widget
    const handleGoalsChange = useCallback(async (newGoals: Array<{ text: string; completed: boolean; createdAt?: string; isRepeating?: boolean; order?: number }>) => {
        if (!user) return;

        try {
            const today = getTodayDateString();
            const newGoalTexts = new Set(newGoals.map(g => g.text.trim()).filter(Boolean));
            
            // Find tasks that were deleted (exist in DB but not in new goals)
            const tasksToDelete = tasks.filter(t => !newGoalTexts.has(t.title));
            for (const task of tasksToDelete) {
                await deleteDailyTask(user, task.id);
            }

            // Update or create tasks
            for (const goal of newGoals) {
                if (!goal.text.trim()) continue;
                
                const existingTask = tasks.find(t => t.title === goal.text);
                
                if (existingTask) {
                    // Update existing task if completion status changed
                    if (existingTask.is_completed !== goal.completed) {
                        await updateDailyTask(user, existingTask.id, {
                            is_completed: goal.completed,
                        });
                    }
                } else {
                    // Create new task
                    await createDailyTask(user, goal.text);
                }
            }

            // Reload tasks
            await loadDailyTasks();
            
            // Generate summary after tasks change
            await generateDailySummary(user);
        } catch (error) {
            console.error('Error updating tasks:', error);
        }
    }, [user, tasks, loadDailyTasks]);

    // Load on mount
    useEffect(() => {
        loadUserProfile();
        loadDailyLog();
        loadDailyTasks();
    }, [loadUserProfile, loadDailyLog, loadDailyTasks]);

    // Reload when screen comes into focus (e.g., after completing onboarding)
    useFocusEffect(
        useCallback(() => {
            loadUserProfile();
            loadDailyLog();
            loadDailyTasks();
        }, [loadUserProfile, loadDailyLog, loadDailyTasks])
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

    const macros = userProfile?.target_macros || undefined;
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
        // Don't trigger aura if any overlay is open
        if (showAddFoodSheet || showGoalsOverlay) {
            return;
        }

        const { pageX, pageY } = evt.nativeEvent;
        touchStartPosition.current = { x: pageX, y: pageY };
        isScrolling.current = false;

        // Start timer for border ring (only if not scrolling)
        longPressTimerRef.current = setTimeout(() => {
            if (!isScrolling.current && touchStartPosition.current && !showAddFoodSheet && !showGoalsOverlay) {
                isTouchingRef.current = true;
                setShowBorderRing(true);

                // Start pulsating haptic feedback
                const triggerHaptic = () => {
                    try {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    } catch (error) {
                        // Haptics not available
                    }
                };

                // Initial haptic
                triggerHaptic();

                // Pulsating haptic every 800ms
                hapticIntervalRef.current = setInterval(triggerHaptic, 800);
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
                if (hapticIntervalRef.current) {
                    clearInterval(hapticIntervalRef.current);
                    hapticIntervalRef.current = null;
                }
            }
        }

    }, []);

    const handleTouchEnd = useCallback(() => {
        if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
        }
        if (hapticIntervalRef.current) {
            clearInterval(hapticIntervalRef.current);
            hapticIntervalRef.current = null;
        }
        touchStartPosition.current = null;
        isScrolling.current = false;
        isTouchingRef.current = false;
        setShowBorderRing(false);
    }, []);

    // Disable aura when overlays are open
    useEffect(() => {
        if (showAddFoodSheet || showGoalsOverlay) {
            setShowBorderRing(false);
            if (longPressTimerRef.current) {
                clearTimeout(longPressTimerRef.current);
                longPressTimerRef.current = null;
            }
            if (hapticIntervalRef.current) {
                clearInterval(hapticIntervalRef.current);
                hapticIntervalRef.current = null;
            }
        }
    }, [showAddFoodSheet, showGoalsOverlay]);


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
                onTouchStart={showAddFoodSheet || showGoalsOverlay ? undefined : handleTouchStart}
                onTouchMove={showAddFoodSheet || showGoalsOverlay ? undefined : handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                style={{ flex: 1 }}
                pointerEvents={showAddFoodSheet || showGoalsOverlay ? 'none' : 'auto'}
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
                    <FoodLog onPress={() => navigation.navigate('FoodLog')} />

                    {/* AI Widget */}
                    <AIWidget />

                    {/* Square Widgets Row */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
                        <TodaysGoalsWidget
                            goals={goals}
                            onGoalsChange={handleGoalsChange}
                            onOverlayChange={setShowGoalsOverlay}
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


            {/* Border ring animation (Apple AI style) - only render when active */}
            {showBorderRing && <AuraOverlay isActive={showBorderRing} />}

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


            {/* Add Food Bottom Sheet */}
            <AddFoodBottomSheet
                visible={showAddFoodSheet}
                onClose={() => setShowAddFoodSheet(false)}
                onAddFood={handleAddFood}
                onRemoveFood={handleRemoveFood}
                quickAddItems={getQuickAddItems()}
            />
        </View>
    );
};

