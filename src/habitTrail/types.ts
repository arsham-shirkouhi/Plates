// HABIT TRAIL
import { TimeOfDay } from './trailConfig';

export interface TrailTreasure {
  chainId: string;
  earnedAt: string;
}

export interface HabitTrailState {
  treasures: TrailTreasure[];
  bestStreaks: Record<string, number>;
  debugStreakOverrides?: Record<string, number>;
  debugTimeOfDay?: TimeOfDay | null;
}
