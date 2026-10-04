// HABIT TRAIL
export type TimeOfDay = 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';
export type PathStage = 'dirt' | 'stone' | 'flowers' | 'lanterns';

export const TRAIL_SCENERY: Record<
  TimeOfDay,
  { label: string; sky: string; ground: string; accent: string; wood: string }
> = {
  morning: { label: 'sunrise forest', sky: '#FFE08A', ground: '#7CB342', accent: '#F9C117', wood: '#5D4037' },
  midday: { label: 'meadow', sky: '#B3E5FC', ground: '#9CCC65', accent: '#FFEB3B', wood: '#6D4C41' },
  afternoon: { label: 'hills', sky: '#90CAF9', ground: '#A1887F', accent: '#FF8A65', wood: '#4E342E' },
  evening: { label: 'sunset mountain', sky: '#FF8A65', ground: '#6D4C41', accent: '#FFD54F', wood: '#3E2723' },
  night: { label: 'starry lake', sky: '#1A237E', ground: '#283593', accent: '#FFF59D', wood: '#212121' },
};

export const TRAIL_PROGRESSION = {
  dirt: { min: 0, max: 2 },
  stone: { min: 3, max: 6 },
  flowers: { min: 7, max: 20 },
  lanterns: { min: 21, max: Number.POSITIVE_INFINITY },
} as const;

export const TRAIL_REWARDS = {
  chestChance: 0.05,
};

export const hourToTimeOfDay = (hour: number): TimeOfDay => {
  if (hour >= 5 && hour < 11) return 'morning';
  if (hour >= 11 && hour < 14) return 'midday';
  if (hour >= 14 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

export const pathStageForStreak = (streak: number): PathStage => {
  if (streak >= TRAIL_PROGRESSION.lanterns.min) return 'lanterns';
  if (streak >= TRAIL_PROGRESSION.flowers.min) return 'flowers';
  if (streak >= TRAIL_PROGRESSION.stone.min) return 'stone';
  return 'dirt';
};
