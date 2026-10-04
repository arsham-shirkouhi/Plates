// HABIT CHAINS
import { HabitChain, HabitChainAnchor } from './types';

export const countCompletedSteps = (chain: HabitChain): number =>
  chain.steps.filter((step) => step.completed).length;

export const nextStepIndex = (chain: HabitChain): number =>
  chain.steps.findIndex((step) => !step.completed);

export const isChainCompleteToday = (chain: HabitChain): boolean =>
  chain.steps.length > 0 && chain.steps.every((step) => step.completed);

export const formatAnchor = (anchor?: HabitChainAnchor): string => {
  if (!anchor) return '';
  if (anchor.type === 'time') return anchor.time;
  return anchor.text;
};

export const formatProgress = (chain: HabitChain): string =>
  `${countCompletedSteps(chain)}/${chain.steps.length}`;
