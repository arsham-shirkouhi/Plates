// HABIT TRAIL
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from '../services/userService';
import { TimeOfDay, TRAIL_REWARDS } from './trailConfig';
import { HabitTrailState } from './types';

const storageKey = (userId: string) => `plates.habit_trail.${userId}`;

const emptyState = (): HabitTrailState => ({
  treasures: [],
  bestStreaks: {},
  debugStreakOverrides: {},
  debugTimeOfDay: null,
});

export const loadHabitTrailState = async (userId: string): Promise<HabitTrailState> => {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (!raw) return emptyState();
    const parsed = JSON.parse(raw) as HabitTrailState;
    return {
      treasures: parsed.treasures ?? [],
      bestStreaks: parsed.bestStreaks ?? {},
      debugStreakOverrides: parsed.debugStreakOverrides ?? {},
      debugTimeOfDay: parsed.debugTimeOfDay ?? null,
    };
  } catch (error) {
    console.warn('[habitTrail] failed to load', error);
    return emptyState();
  }
};

export const saveHabitTrailState = async (userId: string, state: HabitTrailState): Promise<void> => {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(state));
  } catch (error) {
    console.warn('[habitTrail] failed to save', error);
  }
};

export const recordBestStreak = async (
  userId: string,
  chainId: string,
  streak: number
): Promise<HabitTrailState> => {
  const state = await loadHabitTrailState(userId);
  const current = state.bestStreaks[chainId] ?? 0;
  if (streak <= current) return state;
  const next = { ...state, bestStreaks: { ...state.bestStreaks, [chainId]: streak } };
  await saveHabitTrailState(userId, next);
  return next;
};

export const maybeAwardTreasure = async (userId: string, chainId: string): Promise<HabitTrailState> => {
  const state = await loadHabitTrailState(userId);
  if (state.treasures.some((item) => item.chainId === chainId)) return state;
  if (Math.random() > TRAIL_REWARDS.chestChance) return state;
  const next: HabitTrailState = {
    ...state,
    treasures: [...state.treasures, { chainId, earnedAt: getTodayDateString() }],
  };
  await saveHabitTrailState(userId, next);
  return next;
};

export const setDebugStreakOverride = async (
  userId: string,
  chainId: string,
  streak: number | null
): Promise<HabitTrailState> => {
  const state = await loadHabitTrailState(userId);
  const overrides = { ...(state.debugStreakOverrides ?? {}) };
  if (streak === null) delete overrides[chainId];
  else overrides[chainId] = streak;
  const next = { ...state, debugStreakOverrides: overrides };
  await saveHabitTrailState(userId, next);
  return next;
};

export const setDebugTimeOfDay = async (
  userId: string,
  timeOfDay: TimeOfDay | null
): Promise<HabitTrailState> => {
  const state = await loadHabitTrailState(userId);
  const next = { ...state, debugTimeOfDay: timeOfDay };
  await saveHabitTrailState(userId, next);
  return next;
};
