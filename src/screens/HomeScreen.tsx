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
import { ProfileOverlay, ProfileIconOrigin } from '../components/ProfileOverlay';
import { MacrosCard } from '../components/MacrosCard';
import { FoodLog, FoodLogHandle } from '../components/FoodLog';
import { AIWidget } from '../components/AIWidget';
import { TodaysGoalsWidget } from '../components/TodaysGoalsWidget';
import { TimerWidget } from '../components/TimerWidget'; // ✅ ADD
import { QuickActionsWidget } from '../components/QuickActionsWidget';
import { TestControls } from '../components/TestControls';
import { GradientBackground } from '../components/GradientBackground';
import { AuraOverlay } from '../components/AuraOverlay';
import { ScrollingGridBackground } from '../components/ScrollingGridBackground';
import {
  resetOnboarding,
  getUserProfile,
  UserProfile,
  getDailyMacroLog,
  getTodayDateString,
  DailyMacroLog,
} from '../services/userService';
import { useAddFood } from '../context/AddFoodContext';
import { useFoodLog } from '../context/FoodLogContext';
import { useWorkoutOverlay } from '../contexts/WorkoutOverlayContext';
import { useActiveWorkout } from '../contexts/ActiveWorkoutContext';
import {
  getDailyTasks,
  createDailyTask,
  updateDailyTask,
  deleteDailyTask,
  generateDailySummary,
  copyDailyTasksFromYesterday,
  DailyTask,
} from '../services/taskService';
import { styles } from './HomeScreen.styles';

type HomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

// In-memory cache for instant data access
const dataCache = {
  profile: null as UserProfile | null,
  dailyLog: null as DailyMacroLog | null,
  tasks: [] as DailyTask[],
  lastUpdate: {
    profile: 0,
    dailyLog: 0,
    tasks: 0,
  },
};

export const HomeScreen: React.FC = () => {
  const { user, logout } = useAuth();
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const insets = useSafeAreaInsets();
  const {
    registerSheetState,
    unregisterSheetState,
    showAddFoodSheet: openAddFoodSheet,
    registerFoodLogTarget,
  } = useAddFood();
  const { consumed: loggedConsumed, dashboardItems } = useFoodLog();
  const foodLogRef = useRef<FoodLogHandle>(null);
  const { open: openWorkoutOverlay } = useWorkoutOverlay();
  const { state: activeWorkoutState, endActiveWorkout, expand: expandWorkout } = useActiveWorkout();
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
  const [showGoalsOverlay, setShowGoalsOverlay] = useState(false);
  const [showProfileOverlay, setShowProfileOverlay] = useState(false);
  const [hideProfileIcon, setHideProfileIcon] = useState(false);
  const [profileOrigin, setProfileOrigin] = useState<ProfileIconOrigin | null>(null);

  // Tasks state (loaded from database)
  const [tasks, setTasks] = useState<DailyTask[]>(dataCache.tasks);
  const [loadingTasks, setLoadingTasks] = useState(dataCache.tasks.length === 0);

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

  const performLogout = async () => {
    setLoggingOut(true);
    try {
      // Ending the workout first ensures a non-empty session is saved to history
      // and an empty one is discarded, before the session is torn down.
      await endActiveWorkout();

      // Clear cache on logout
      dataCache.profile = null;
      dataCache.dailyLog = null;
      dataCache.tasks = [];
      dataCache.lastUpdate = { profile: 0, dailyLog: 0, tasks: 0 };

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

  const handleLogout = () => {
    // If a workout is in progress, let the user keep it going or end it on logout.
    if (activeWorkoutState.workout) {
      Alert.alert(
        'Workout in progress',
        'Logging out will end your current workout. What would you like to do?',
        [
          { text: 'Continue workout', style: 'cancel' },
          {
            text: 'End & log out',
            style: 'destructive',
            onPress: () => {
              void performLogout();
            },
          },
        ],
        { cancelable: true }
      );
      return;
    }

    void performLogout();
  };

  const handleProfilePress = (origin: ProfileIconOrigin) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setProfileOrigin(origin);
    setShowProfileOverlay(true);
  };

  useEffect(() => {
    if (!showProfileOverlay) {
      setHideProfileIcon(false);
      return;
    }
    const frame = requestAnimationFrame(() => setHideProfileIcon(true));
    return () => cancelAnimationFrame(frame);
  }, [showProfileOverlay]);

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
      const [profile, log] = await Promise.all([getUserProfile(user), getDailyMacroLog(user, today)]);

      if (profile) {
        dataCache.profile = profile;
        dataCache.lastUpdate.profile = Date.now();
        setUserProfile(profile);
      }

      dataCache.dailyLog = log;
      dataCache.lastUpdate.dailyLog = Date.now();
      setDailyLog(log);

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

  useEffect(() => {
    registerSheetState(setShowAddFoodSheet);
    return () => {
      unregisterSheetState();
    };
  }, [registerSheetState, unregisterSheetState]);

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

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, [loadAllData])
  );

  useFocusEffect(
    useCallback(() => {
      registerFoodLogTarget({
        measureTarget: () => foodLogRef.current?.measureTarget() ?? Promise.resolve(null),
        getTargetRect: () => foodLogRef.current?.getTargetRect() ?? null,
        pulse: () => foodLogRef.current?.pulse(),
      });
      return () => registerFoodLogTarget(null);
    }, [registerFoodLogTarget])
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
  const consumed = {
    calories: loggedConsumed.calories + testValues.calories,
    protein: loggedConsumed.protein + testValues.protein,
    carbs: loggedConsumed.carbs + testValues.carbs,
    fats: loggedConsumed.fats + testValues.fats,
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
      // Lock scroll while overlays are open
      setScrollEnabled(false);
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
    } else {
      // Restore scroll once overlays are closed
      setScrollEnabled(!scrollLockRef.current);
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
        onTouchStart={showAddFoodSheet || showGoalsOverlay || showProfileOverlay ? undefined : handleTouchStart}
        onTouchMove={showAddFoodSheet || showGoalsOverlay || showProfileOverlay ? undefined : handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        style={{ flex: 1 }}
        pointerEvents={showAddFoodSheet || showGoalsOverlay || showProfileOverlay ? 'none' : 'auto'}
      >
        <ScrollingGridBackground />
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
            onProfilePress={handleProfilePress}
            hideProfile={hideProfileIcon}
          />

          <MacrosCard macros={macros} consumed={consumed} loading={loadingProfile} />

          <FoodLog
            ref={foodLogRef}
            items={dashboardItems}
            onPress={() => navigation.navigate('FoodLog')}
          />

          <AIWidget />

          <View style={styles.widgetRow}>
            <TodaysGoalsWidget
              goals={goals}
              onGoalsChange={handleGoalsChange}
              onOverlayChange={setShowGoalsOverlay}
            />

            <QuickActionsWidget
              workoutInProgress={!!activeWorkoutState.workout}
              onLogFoodPress={() => openAddFoodSheet()}
              onLogExercisePress={() => {
                // Resume the active workout if one is already going.
                if (activeWorkoutState.workout) {
                  openWorkoutOverlay();
                  expandWorkout();
                  return;
                }
                Alert.alert(
                  'Start a workout?',
                  'Ready to log your exercises and track your session?',
                  [
                    { text: 'Not now', style: 'cancel' },
                    {
                      text: 'Start',
                      onPress: () => openWorkoutOverlay({ startWorkoutPrompt: true }),
                    },
                  ],
                  { cancelable: true }
                );
              }}
            />
          </View>

          <View style={styles.widgetRow}>
            <TimerWidget
              initialMinutes={0}
              initialSeconds={300}
              onInteractionChange={handleTimerInteractionChange}
            />
            <View style={styles.widgetSpacer} />
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

      <ProfileOverlay
        visible={showProfileOverlay}
        origin={profileOrigin}
        username={userProfile?.onboarding_data?.name}
        email={user?.email ?? undefined}
        streak={streak}
        onClose={() => setShowProfileOverlay(false)}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

    </View>
  );
};
