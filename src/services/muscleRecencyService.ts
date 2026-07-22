import AsyncStorage from '@react-native-async-storage/async-storage';
import { MOCK_EXERCISES } from '../workout/mockWorkoutData';
import {
    mapBodyPartToMuscleGroup,
    MUSCLE_GROUPS,
    MuscleGroup,
    MuscleRecencyMap,
    NEUTRAL_MUSCLE_RECENCY,
} from '../workout/muscleGroups';
import { StoredCompletedWorkout } from '../workout/workoutHistoryTypes';

const RECENCY_CACHE_KEY = '@plates/muscle-recency/v1';
const COMPLETED_KEY = '@plates/workout-completed/v1';

function scopedKey(base: string, userId?: string | null): string {
    return userId ? `${base}:${userId}` : base;
}

function daysBetween(from: Date, to: Date): number {
    const start = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    const end = new Date(to.getFullYear(), to.getMonth(), to.getDate());
    return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
}

function resolveExerciseBodyPart(exerciseId: string, name: string, bodyPart?: string): string | undefined {
    if (bodyPart) return bodyPart;
    const mock = MOCK_EXERCISES.find((item) => item.id === exerciseId);
    return mock?.bodyPart ?? bodyPart;
}

async function loadCompletedWorkouts(userId?: string | null): Promise<StoredCompletedWorkout[]> {
    try {
        const raw = await AsyncStorage.getItem(scopedKey(COMPLETED_KEY, userId));
        if (!raw) return [];
        return JSON.parse(raw) as StoredCompletedWorkout[];
    } catch {
        return [];
    }
}

export function computeMuscleRecencyFromWorkouts(
    completedWorkouts: StoredCompletedWorkout[],
    now = new Date()
): MuscleRecencyMap {
    const lastTrained: Partial<Record<MuscleGroup, Date>> = {};

    for (const workout of completedWorkouts) {
        const completedAt = new Date(workout.completedAt);
        if (Number.isNaN(completedAt.getTime())) continue;

        for (const exercise of workout.exercises) {
            const bodyPart = resolveExerciseBodyPart(
                exercise.exerciseId,
                exercise.name,
                exercise.bodyPart
            );
            const muscle = mapBodyPartToMuscleGroup(bodyPart, exercise.name);
            if (!muscle) continue;

            const existing = lastTrained[muscle];
            if (!existing || completedAt > existing) {
                lastTrained[muscle] = completedAt;
            }
        }
    }

    return MUSCLE_GROUPS.reduce((acc, group) => {
        const last = lastTrained[group];
        acc[group] = last ? daysBetween(last, now) : null;
        return acc;
    }, {} as MuscleRecencyMap);
}

export async function readCachedMuscleRecency(userId?: string | null): Promise<MuscleRecencyMap | null> {
    try {
        const raw = await AsyncStorage.getItem(scopedKey(RECENCY_CACHE_KEY, userId));
        if (!raw) return null;
        return JSON.parse(raw) as MuscleRecencyMap;
    } catch {
        return null;
    }
}

export async function writeCachedMuscleRecency(
    recency: MuscleRecencyMap,
    userId?: string | null
): Promise<void> {
    try {
        await AsyncStorage.setItem(scopedKey(RECENCY_CACHE_KEY, userId), JSON.stringify(recency));
    } catch (error) {
        console.warn('[muscleRecencyService] Failed to cache muscle recency', error);
    }
}

export async function fetchMuscleRecency(userId?: string | null): Promise<MuscleRecencyMap> {
    const completed = await loadCompletedWorkouts(userId);
    const recency = computeMuscleRecencyFromWorkouts(completed);
    await writeCachedMuscleRecency(recency, userId);
    return recency;
}

export async function getMuscleRecencyInitial(userId?: string | null): Promise<MuscleRecencyMap> {
    const cached = await readCachedMuscleRecency(userId);
    return cached ?? NEUTRAL_MUSCLE_RECENCY;
}

export async function hasAnyWorkoutHistory(userId?: string | null): Promise<boolean> {
    const completed = await loadCompletedWorkouts(userId);
    return completed.length > 0;
}

export interface MuscleRecencyCoverage {
    totalExerciseEntries: number;
    mappedExerciseEntries: number;
    mappedPercentage: number;
    groupsWithData: number;
}

export async function computeMuscleRecencyCoverageFromWorkouts(
    userId?: string | null
): Promise<MuscleRecencyCoverage> {
    const completed = await loadCompletedWorkouts(userId);
    let totalExerciseEntries = 0;
    let mappedExerciseEntries = 0;

    for (const workout of completed) {
        for (const exercise of workout.exercises) {
            totalExerciseEntries += 1;
            const bodyPart = resolveExerciseBodyPart(
                exercise.exerciseId,
                exercise.name,
                exercise.bodyPart
            );
            const muscle = mapBodyPartToMuscleGroup(bodyPart, exercise.name);
            if (muscle) mappedExerciseEntries += 1;
        }
    }

    const recency = computeMuscleRecencyFromWorkouts(completed);
    const groupsWithData = MUSCLE_GROUPS.filter((group) => recency[group] !== null).length;

    return {
        totalExerciseEntries,
        mappedExerciseEntries,
        mappedPercentage:
            totalExerciseEntries === 0
                ? 0
                : Math.round((mappedExerciseEntries / totalExerciseEntries) * 100),
        groupsWithData,
    };
}
