// HABIT CHAINS
export type HabitChainAnchor =
  | { type: 'time'; time: string }
  | { type: 'cue'; text: string };

export interface HabitChainStep {
  id: string;
  title: string;
  completed: boolean;
}

export interface HabitChain {
  id: string;
  name: string;
  steps: HabitChainStep[];
  anchor?: HabitChainAnchor;
  /** YYYY-MM-DD the current step checkboxes belong to */
  progressDate: string;
  /** YYYY-MM-DD the last time every step was finished */
  lastCompletedDate: string | null;
  streak: number;
  order: number;
}
