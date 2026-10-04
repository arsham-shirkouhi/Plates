// HABIT TRAIL
import { HabitChain } from '../habitChains/types';
import { formatProgress, isChainCompleteToday, nextStepIndex } from '../habitChains/selectors';
import { getTodayDateString } from '../services/userService';
import { hourToTimeOfDay, pathStageForStreak, TimeOfDay } from './trailConfig';
import { HabitTrailState } from './types';

const shiftDate = (dateStr: string, days: number): string => {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const parseAnchorHour = (chain: HabitChain): number | null => {
  if (chain.anchor?.type !== 'time') return null;
  const match = chain.anchor.time.match(/^(\d{1,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isFinite(hour) ? hour : null;
};

export const sortChainsForTrail = (chains: HabitChain[]): HabitChain[] =>
  [...chains].sort((a, b) => {
    const hourA = parseAnchorHour(a);
    const hourB = parseAnchorHour(b);
    if (hourA === null && hourB === null) return a.order - b.order;
    if (hourA === null) return 1;
    if (hourB === null) return -1;
    if (hourA !== hourB) return hourA - hourB;
    return a.order - b.order;
  });

export const timeOfDayForChain = (chain: HabitChain, trailState?: HabitTrailState): TimeOfDay => {
  if (trailState?.debugTimeOfDay) return trailState.debugTimeOfDay;
  const hour = parseAnchorHour(chain);
  if (hour !== null) return hourToTimeOfDay(hour);
  return hourToTimeOfDay(new Date().getHours());
};

export const effectiveStreak = (chain: HabitChain, trailState?: HabitTrailState): number => {
  const override = trailState?.debugStreakOverrides?.[chain.id];
  if (typeof override === 'number') return override;
  return chain.streak;
};

export const bestStreakFor = (chain: HabitChain, trailState?: HabitTrailState): number =>
  Math.max(chain.streak, trailState?.bestStreaks?.[chain.id] ?? 0, effectiveStreak(chain, trailState));

export const isRegionFaded = (chain: HabitChain, today = getTodayDateString()): boolean => {
  if (!chain.lastCompletedDate) return false;
  if (chain.lastCompletedDate === today) return false;
  if (chain.lastCompletedDate === shiftDate(today, -1)) return false;
  return true;
};

export const currentTrailFocus = (chains: HabitChain[]): HabitChain | null => {
  const ordered = sortChainsForTrail(chains);
  return ordered.find((chain) => nextStepIndex(chain) >= 0) ?? ordered[ordered.length - 1] ?? null;
};

export const stoneA11yLabel = (
  chain: HabitChain,
  stepTitle: string,
  status: 'done' | 'next' | 'locked'
): string => `${chain.name}, ${stepTitle}, ${status === 'done' ? 'completed' : status === 'next' ? 'next' : 'locked'}`;

export const signpostLabel = (chain: HabitChain): string => `${chain.name} ${formatProgress(chain)}`;

export const trailCaption = (chains: HabitChain[]): string => {
  const focus = currentTrailFocus(chains);
  if (!focus) return '';
  return `${focus.name} ${formatProgress(focus)}${isChainCompleteToday(focus) ? ' done' : ''}`;
};

export { pathStageForStreak };
