// HABIT CHAINS
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTodayDateString } from '../services/userService';
import { HabitChain, HabitChainAnchor, HabitChainStep } from './types';
import { isChainCompleteToday, nextStepIndex } from './selectors';

const storageKey = (userId: string) => `plates.habit_chains.${userId}`;

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const shiftDate = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const applyDailyReset = (chain: HabitChain, today: string): HabitChain => {
  if (chain.progressDate === today) return chain;

  const yesterday = shiftDate(today, -1);
  const keptStreak =
    chain.lastCompletedDate === yesterday || chain.lastCompletedDate === today
      ? chain.streak
      : 0;

  return {
    ...chain,
    progressDate: today,
    streak: keptStreak,
    steps: chain.steps.map((step) => ({ ...step, completed: false })),
  };
};

export const loadHabitChains = async (userId: string): Promise<HabitChain[]> => {
  try {
    const raw = await AsyncStorage.getItem(storageKey(userId));
    const parsed = raw ? (JSON.parse(raw) as HabitChain[]) : [];
    const today = getTodayDateString();
    const reset = parsed.map((chain) => applyDailyReset(chain, today));
    if (JSON.stringify(reset) !== JSON.stringify(parsed)) {
      await saveHabitChains(userId, reset);
    }
    return reset.sort((a, b) => a.order - b.order);
  } catch (error) {
    console.warn('[habitChains] failed to load', error);
    return [];
  }
};

export const saveHabitChains = async (userId: string, chains: HabitChain[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(storageKey(userId), JSON.stringify(chains));
  } catch (error) {
    console.warn('[habitChains] failed to save', error);
  }
};

export const createHabitChain = (
  name: string,
  stepTitles: string[],
  anchor?: HabitChainAnchor,
  order = 0
): HabitChain => {
  const today = getTodayDateString();
  const steps: HabitChainStep[] = stepTitles
    .map((title) => title.trim())
    .filter(Boolean)
    .map((title) => ({
      id: newId(),
      title: title.toLowerCase(),
      completed: false,
    }));

  return {
    id: newId(),
    name: name.trim().toLowerCase() || 'new chain',
    steps,
    anchor,
    progressDate: today,
    lastCompletedDate: null,
    streak: 0,
    order,
  };
};

export const completeNextStep = (
  chain: HabitChain
): { chain: HabitChain; justFinished: boolean } => {
  const index = nextStepIndex(chain);
  if (index < 0) return { chain, justFinished: false };

  const steps = chain.steps.map((step, i) =>
    i === index ? { ...step, completed: true } : step
  );
  const updated: HabitChain = { ...chain, steps };
  const justFinished = isChainCompleteToday(updated);

  if (justFinished) {
    updated.lastCompletedDate = getTodayDateString();
    updated.streak = chain.streak + 1;
  }

  return { chain: updated, justFinished };
};

export const upsertHabitChain = (chains: HabitChain[], next: HabitChain): HabitChain[] => {
  const exists = chains.some((chain) => chain.id === next.id);
  const list = exists
    ? chains.map((chain) => (chain.id === next.id ? next : chain))
    : [...chains, next];
  return list.sort((a, b) => a.order - b.order);
};

export const removeHabitChain = (chains: HabitChain[], id: string): HabitChain[] =>
  chains.filter((chain) => chain.id !== id);
