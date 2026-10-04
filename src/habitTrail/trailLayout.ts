// HABIT TRAIL
import { HabitChain } from '../habitChains/types';
import { nextStepIndex } from '../habitChains/selectors';
import { sortChainsForTrail } from './selectors';
import { HabitTrailState } from './types';

export interface Point {
  x: number;
  y: number;
}

export interface TrailNode {
  chainId: string;
  chainName: string;
  stepId: string;
  stepTitle: string;
  stepIndex: number;
  x: number;
  y: number;
  status: 'done' | 'next' | 'locked';
  isChainStart: boolean;
  hasChest: boolean;
}

export interface TrailGeom {
  width: number;
  height: number;
  nodes: TrailNode[];
  current: Point;
}

export const COMPACT_GAP = 36;
export const EXPANDED_GAP = 56;
export const COMPACT_RADIUS = 11;
export const EXPANDED_RADIUS = 16;

export const buildTrailGeom = (
  chains: HabitChain[],
  width: number,
  gap: number,
  trailState?: HabitTrailState
): TrailGeom => {
  const ordered = sortChainsForTrail(chains);
  const nodes: TrailNode[] = [];
  let current: Point = { x: width / 2, y: 22 };

  ordered.forEach((chain) => {
    const next = nextStepIndex(chain);
    chain.steps.forEach((step, stepIndex) => {
      const i = nodes.length;
      const column = i % 3 === 0 ? 0.5 : i % 3 === 1 ? 0.28 : 0.72;
      const point = { x: width * column, y: 22 + i * gap };
      const status: TrailNode['status'] =
        step.completed ? 'done' : stepIndex === next ? 'next' : 'locked';
      if (status === 'next' || (status === 'done' && next < 0)) current = point;
      nodes.push({
        chainId: chain.id,
        chainName: chain.name,
        stepId: step.id,
        stepTitle: step.title,
        stepIndex,
        x: point.x,
        y: point.y,
        status,
        isChainStart: stepIndex === 0,
        hasChest:
          stepIndex === chain.steps.length - 1 &&
          !!trailState?.treasures.some((item) => item.chainId === chain.id),
      });
    });
  });

  return {
    width,
    height: Math.max(gap + 20, 22 + Math.max(nodes.length - 1, 0) * gap + 28),
    nodes,
    current,
  };
};
