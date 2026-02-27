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
import { TimerWidget } from '../components/TimerWidget'; // ✅ ADD
import { SquareWidget } from '../components/SquareWidget';
import { TestControls } from '../components/TestControls';
import { GradientBackground } from '../components/GradientBackground';
import { AuraOverlay } from '../components/AuraOverlay';
import { AddFoodBottomSheet } from '../components/AddFoodBottomSheet';
import {
  resetOnboarding,
  getUserProfile,
  UserProfile,
  getDailyMacroLog,
  getTodayDateString,
  DailyMacroLog,
  addToDailyMacroLog,
  subtractFromDailyMacroLog,
} from '../services/userService';
import { getQuickAddItems, FoodItem } from '../services/foodService';
import { useAddFood } from '../context/AddFoodContext';
import {
  getDailyTasks,
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
  generateDailySummary,
  copyDailyTasksFromYesterday,
  DailyTask,
} from '../services/taskService';
import { createFoodLogEntry, getFoodLogEntriesForDate, MealType as FoodLogMealType } from '../services/foodLogService';
import { styles } from './HomeScreen.styles';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

// In-memory cache for instant data access
const dataCache = {
  profile: null as UserProfile | null,
  dailyLog: null as DailyMacroLog | null,
  tasks: [] as DailyTask[],
  foodLogPreview: [] as Array<{ name: string; calories: number; time: string }>,
  lastUpdate: {
    profile: 0,
    dailyLog: 0,
    tasks: 0,
    foodLogPreview: 0,
  },
};

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const { registerHandler, unregisterHandler, registerSheetState, unregisterSheetState } = useAddFood();
  const [loggingOut, setLoggingOut] = useState(false);
  const [resettingOnboarding, setResettingOnboarding] = useState(false);

  // ✅ Scroll lock for timer interaction
  const [scrollEnabled, setScrollEnabled] = useState(true);
  const scrollLockRef = useRef(false);

  // Initialize with cached data for instant display
  const [userProfile, setUserProfile] = useState<UserProfile | null>(dataCache.profile);
  const [loadingProfile, setLoadingProfile] = useState(!dataCache.profile);
  const [dailyLog, setDailyLog] = useState<DailyMacroLog | null>(dataCache.dailyLog);
  const [loadingLog, setLoadingLog] = useState(!dataCache.dailyLog);
  const [showAddFoodSheet, setShowAddFoodSheet] = useState(false);
  const [quickAddItems, setQuickAddItems] = useState<FoodItem[]>([]);
  const [showGoalsOverlay, setShowGoalsOverlay] = useState(false);

  // Tasks state (loaded from database)
  const [tasks, setTasks] = useState<DailyTask[]>(dataCache.tasks);
  const [loadingTasks, setLoadingTasks] = useState(dataCache.tasks.length === 0);
  const [foodLogPreview, setFoodLogPreview] = useState<Array<{ name: string; calories: number; time: string }>>(
    dataCache.foodLogPreview
  );

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
      // Clear cache on logout
      dataCache.profile = null;
      dataCache.dailyLog = null;
      dataCache.tasks = [];
      dataCache.foodLogPreview = [];
      dataCache.lastUpdate = { profile: 0, dailyLog: 0, tasks: 0, foodLogPreview: 0 };

      await logout();
      setTimeout(() => {
        navigation.replace('Login');
      }, 100);
    } catch (error: any) {
      Alert.alert('Logout Error', 'Failed to logout. Please try again.');
    } finally {
      setLoggingOut(false);
    }
  };

  const loadUserProfile = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    try {
      if (dataCache.profile) {
        setUserProfile(dataCache.profile);
        setLoadingProfile(false);
      } else {
        setLoadingProfile(true);
      }

      const profile = await getUserProfile(user);
      if (profile) {
        dataCache.profile = profile;
        dataCache.lastUpdate.profile = Date.now();
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoadingProfile(false);
    }
  }, [user]);

  const getTimeAgo = (createdAt: string) => {
    const now = Date.now();
    const loggedAt = new Date(createdAt).getTime();
    const diffMins = Math.floor((now - loggedAt) / 60000);

    if (diffMins < 1) return '0m';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d`;
  };

  const getMealByTime = (): FoodLogMealType => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 17 && hour < 22) return 'dinner';
    return 'snack';
  };

  const loadFoodLogPreview = useCallback(async () => {
    if (!user) {
      setFoodLogPreview([]);
      return;
    }

    try {
      const today = getTodayDateString();
      const entries = await getFoodLogEntriesForDate(user, today);
      const previewItems = entries.slice(0, 3).map((entry) => ({
        name: entry.food_name,
        calories: Math.round(Number(entry.calories) || 0),
        time: getTimeAgo(entry.created_at),
      }));

      dataCache.foodLogPreview = previewItems;
      dataCache.lastUpdate.foodLogPreview = Date.now();
      setFoodLogPreview(previewItems);
    } catch (error) {
      console.error('Error loading food log preview:', error);
    }
  }, [user]);

  const loadDailyLog = useCallback(async () => {
    if (!user) {
      setLoadingLog(false);
      return;
    }

    try {
      if (dataCache.dailyLog) {
        setDailyLog(dataCache.dailyLog);
        setLoadingLog(false);
      } else {
        setLoadingLog(true);
      }

      const today = getTodayDateString();
      const log = await getDailyMacroLog(user, today);
      dataCache.dailyLog = log;
      dataCache.lastUpdate.dailyLog = Date.now();
      setDailyLog(log);
    } catch (error) {
      console.error('Error loading daily log:', error);
    } finally {
      setLoadingLog(false);
    }
  }, [user]);

  const loadDailyTasks = useCallback(async () => {
    if (!user) {
      setLoadingTasks(false);
      return;
    }

    try {
      if (dataCache.tasks.length > 0) {
        setTasks(dataCache.tasks);
        setLoadingTasks(false);
      } else {
        setLoadingTasks(true);
      }

      await copyDailyTasksFromYesterday(user);

      const today = getTodayDateString();
      const dailyTasks = await getDailyTasks(user, today);
      dataCache.tasks = dailyTasks;
      dataCache.lastUpdate.tasks = Date.now();
      setTasks(dailyTasks);
    } catch (error) {
      console.error('Error loading daily tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  }, [user]);

  const loadAllData = useCallback(async () => {
    if (!user) {
      setLoadingProfile(false);
      setLoadingLog(false);
      setLoadingTasks(false);
      return;
    }

    try {
      if (!dataCache.profile) setLoadingProfile(true);
      if (!dataCache.dailyLog) setLoadingLog(true);
      if (dataCache.tasks.length === 0) setLoadingTasks(true);

      const today = getTodayDateString();
      const [profile, log, entries] = await Promise.all([
        getUserProfile(user),
        getDailyMacroLog(user, today),
        getFoodLogEntriesForDate(user, today),
      ]);

      if (profile) {
        dataCache.profile = profile;
        dataCache.lastUpdate.profile = Date.now();
        setUserProfile(profile);
      }

      dataCache.dailyLog = log;
      dataCache.lastUpdate.dailyLog = Date.now();
      setDailyLog(log);

      const previewItems = entries.slice(0, 3).map((entry) => ({
        name: entry.food_name,
        calories: Math.round(Number(entry.calories) || 0),
        time: getTimeAgo(entry.created_at),
      }));
      dataCache.foodLogPreview = previewItems;
      dataCache.lastUpdate.foodLogPreview = Date.now();
      setFoodLogPreview(previewItems);

      try {
        await copyDailyTasksFromYesterday(user);
        const dailyTasks = await getDailyTasks(user, today);
        dataCache.tasks = dailyTasks;
        dataCache.lastUpdate.tasks = Date.now();
        setTasks(dailyTasks);
      } catch (taskError) {
        console.error('Error loading tasks:', taskError);
        const dailyTasks = await getDailyTasks(user, today);
        dataCache.tasks = dailyTasks;
        dataCache.lastUpdate.tasks = Date.now();
        setTasks(dailyTasks);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoadingProfile(false);
      setLoadingLog(false);
      setLoadingTasks(false);
    }
  }, [user]);

  const handleAddFood = useCallback(
    async (food: FoodItem) => {
      if (!user) return;

      try {
        const currentLog = dailyLog || { calories: 0, protein: 0, carbs: 0, fats: 0 };
        const optimisticLog = {
          ...currentLog,
          calories: (currentLog.calories || 0) + food.calories,
          protein: (currentLog.protein || 0) + food.protein,
          carbs: (currentLog.carbs || 0) + food.carbs,
          fats: (currentLog.fats || 0) + food.fats,
        };
        setDailyLog(optimisticLog as DailyMacroLog);
        dataCache.dailyLog = optimisticLog as DailyMacroLog;

        await addToDailyMacroLog(user, {
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fats: food.fats,
        });
        await createFoodLogEntry(user, {
          meal: getMealByTime(),
          food,
          portion: '1 serving',
        });

        const today = getTodayDateString();
        const log = await getDailyMacroLog(user, today);
        dataCache.dailyLog = log;
        dataCache.lastUpdate.dailyLog = Date.now();
        setDailyLog(log);
        await loadFoodLogPreview();
      } catch (error) {
        console.error('Error adding food:', error);
        Alert.alert('Error', 'Failed to add food. Please try again.');
        await loadDailyLog();
      }
    },
    [user, dailyLog, loadDailyLog, loadFoodLogPreview]
  );

  const handleRemoveFood = useCallback(
    async (food: FoodItem) => {
      if (!user) return;

      try {
        const currentLog = dailyLog || { calories: 0, protein: 0, carbs: 0, fats: 0 };
        const optimisticLog = {
          ...currentLog,
          calories: Math.max(0, (currentLog.calories || 0) - food.calories),
          protein: Math.max(0, (currentLog.protein || 0) - food.protein),
          carbs: Math.max(0, (currentLog.carbs || 0) - food.carbs),
          fats: Math.max(0, (currentLog.fats || 0) - food.fats),
        };
        setDailyLog(optimisticLog as DailyMacroLog);
        dataCache.dailyLog = optimisticLog as DailyMacroLog;

        await subtractFromDailyMacroLog(user, {
          calories: food.calories,
          protein: food.protein,
          carbs: food.carbs,
          fats: food.fats,
        });

        const today = getTodayDateString();
        const log = await getDailyMacroLog(user, today);
        dataCache.dailyLog = log;
        dataCache.lastUpdate.dailyLog = Date.now();
        setDailyLog(log);
        await loadFoodLogPreview();
      } catch (error) {
        console.error('Error removing food:', error);
        Alert.alert('Error', 'Failed to remove food. Please try again.');
        await loadDailyLog();
      }
    },
    [user, dailyLog, loadDailyLog, loadFoodLogPreview]
  );

  useEffect(() => {
    registerHandler(handleAddFood);
    registerSheetState(setShowAddFoodSheet);
    return () => {
      unregisterHandler();
      unregisterSheetState();
    };
  }, [handleAddFood, registerHandler, unregisterHandler, registerSheetState, unregisterSheetState]);

  const goals = (tasks || []).map((task, index) => ({
    text: task.title,
    completed: task.is_completed,
    createdAt: task.created_at,
    isRepeating: task.is_daily,
    order: index,
    id: task.id,
  }));

  const handleGoalsChange = useCallback(
    async (
      newGoals: Array<{
        text: string;
        completed: boolean;
        createdAt?: string;
        isRepeating?: boolean;
        order?: number;
        id?: string;
      }>
    ) => {
      if (!user) return;

      try {
        const newGoalTexts = new Set(newGoals.map((g) => g.text.trim()).filter(Boolean));

        const tasksToDelete = tasks.filter((t) => !newGoalTexts.has(t.title));
        for (const task of tasksToDelete) {
          await deleteDailyTask(user, task.id);
        }

        for (const goal of newGoals) {
          if (!goal.text.trim()) continue;

          const existingTask = tasks.find((t) => t.title === goal.text || t.id === goal.id);

          if (existingTask) {
            const updates: any = {};
            if (existingTask.is_completed !== goal.completed) updates.is_completed = goal.completed;
            if (existingTask.is_daily !== goal.isRepeating) updates.is_daily = goal.isRepeating || false;

            if (Object.keys(updates).length > 0) {
              await updateDailyTask(user, existingTask.id, updates);
            }
          } else {
            await createDailyTask(user, goal.text, goal.isRepeating || false);
          }
        }

        const today = getTodayDateString();
        const updatedTasks = await getDailyTasks(user, today);
        dataCache.tasks = updatedTasks;
        dataCache.lastUpdate.tasks = Date.now();
        setTasks(updatedTasks);

        await generateDailySummary(user);
      } catch (error) {
        console.error('Error updating tasks:', error);
      }
    },
    [user, tasks]
  );

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    let mounted = true;

    const loadQuickAddItems = async () => {
      const items = await getQuickAddItems();
      if (mounted) {
        setQuickAddItems(items);
      }
    };

    loadQuickAddItems();
    return () => {
      mounted = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  const handleResetOnboarding = async () => {
    if (!user) {
      Alert.alert('Error', 'You must be logged in to reset onboarding.');
      return;
    }

    Alert.alert('Reset Onboarding', 'This will clear onboarding data. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          setResettingOnboarding(true);
          try {
            await resetOnboarding(user);
            setTimeout(() => navigation.replace('Onboarding'), 100);
          } catch (error: any) {
            Alert.alert('Error', 'Failed to reset onboarding. Please try again.');
          } finally {
            setResettingOnboarding(false);
          }
        },
      },
    ]);
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
    setTestValues((prev) => ({
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

  const handleTouchStart = useCallback(
    (evt: any) => {
      if (showAddFoodSheet || showGoalsOverlay) return;

      // ✅ don't trigger aura if timer is interacting
      if (scrollLockRef.current) return;

      const { pageX, pageY } = evt.nativeEvent;
      touchStartPosition.current = { x: pageX, y: pageY };
      isScrolling.current = false;

      longPressTimerRef.current = setTimeout(() => {
        if (!isScrolling.current && touchStartPosition.current && !showAddFoodSheet && !showGoalsOverlay) {
          isTouchingRef.current = true;
          setShowBorderRing(true);

          const triggerHaptic = () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } catch {}
          };

          triggerHaptic();
          hapticIntervalRef.current = setInterval(triggerHaptic, 800);
        }
      }, 1000);
    },
    [showAddFoodSheet, showGoalsOverlay]
  );

  const handleTouchMove = useCallback((evt: any) => {
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

  // ✅ called by TimerWidget to lock/unlock ScrollView
  const handleTimerInteractionChange = useCallback((interacting: boolean) => {
    scrollLockRef.current = interacting;
    setScrollEnabled(!interacting);
  }, []);

  return (
    <View
      ref={containerRef}
      style={styles.container}
      onLayout={() => {
        containerRef.current?.measureInWindow((x, y) => {
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
          scrollEnabled={scrollEnabled} // ✅ changed from true
          alwaysBounceVertical={false}
        >
          <GradientBackground />

          <HeaderSection
            streak={streak}
            topInset={insets.top}
            onProfilePress={() => Alert.alert('Profile', 'Profile screen coming soon')}
          />

          <MacrosCard macros={macros} consumed={consumed} loading={loadingProfile} />

          <FoodLog items={foodLogPreview} onPress={() => navigation.navigate('FoodLog')} />

          <AIWidget />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 }}>
            <TodaysGoalsWidget
              goals={goals}
              onGoalsChange={handleGoalsChange}
              onOverlayChange={setShowGoalsOverlay}
            />

            {/* ✅ TimerWidget added */}
            <TimerWidget
              initialMinutes={0}
              initialSeconds={300}
              onInteractionChange={handleTimerInteractionChange}
            />
          </View>

          {!loadingProfile && macros && (
            <TestControls consumed={consumed} onUpdate={handleTestUpdate} onReset={handleTestReset} />
          )}

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

      {showBorderRing && <AuraOverlay isActive={showBorderRing} />}

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
            zIndex: 99,
          },
          { paddingBottom: insets.bottom },
        ]}
        pointerEvents="none"
      />

      <AddFoodBottomSheet
        visible={showAddFoodSheet}
        onClose={() => setShowAddFoodSheet(false)}
        onAddFood={handleAddFood}
        onRemoveFood={handleRemoveFood}
        quickAddItems={quickAddItems}
      />
    </View>
  );
};
