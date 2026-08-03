import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockExerciseTemplate } from '../workout/mockWorkoutData';
import {
    SavedWorkoutSummary,
    StoredCompletedWorkout,
    StoredWorkoutPreset,
    WorkoutWrapUpSummary,
} from '../workout/workoutHistoryTypes';
import { Workout } from '../workout/types';
import { createUniqueId, formatWorkoutDurationShort } from '../workout/workoutSelectors';

const PRESETS_KEY = '@plates/workout-presets/v1';
const COMPLETED_KEY = '@plates/workout-completed/v1';
const HAS_COMPLETED_KEY = '@plates/has-completed-workout/v1';

function scopedKey(base: string, userId?: string | null): string {
    return userId ? `${base}:${userId}` : base;
}

function formatCompletedDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'recently';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function workoutToTemplateExercises(workout: Workout): MockExerciseTemplate[] {
    return workout.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        restSeconds: exercise.restSeconds,
        sets: exercise.sets.map((set) => ({
            type: set.type,
            previous: {
                weight: parseFloat(set.weight) || set.previous?.weight || 0,
                reps: parseInt(set.reps, 10) || set.previous?.reps || 0,
            },
        })),
    }));
}

export async function hasCompletedWorkout(userId?: string | null): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(scopedKey(HAS_COMPLETED_KEY, userId));
        return value === 'true';
    } catch {
        return false;
    }
}

export async function markWorkoutCompleted(userId?: string | null): Promise<void> {
    try {
        await AsyncStorage.setItem(scopedKey(HAS_COMPLETED_KEY, userId), 'true');
    } catch (error) {
        console.warn('[workoutHistoryService] Failed to mark workout completed', error);
    }
}

async function loadPresets(userId?: string | null): Promise<StoredWorkoutPreset[]> {
    try {
        const raw = await AsyncStorage.getItem(scopedKey(PRESETS_KEY, userId));
        if (!raw) return [];
        return JSON.parse(raw) as StoredWorkoutPreset[];
    } catch {
        return [];
    }
}

async function loadCompleted(userId?: string | null): Promise<StoredCompletedWorkout[]> {
    try {
        const raw = await AsyncStorage.getItem(scopedKey(COMPLETED_KEY, userId));
        if (!raw) return [];
        return JSON.parse(raw) as StoredCompletedWorkout[];
    } catch {
        return [];
    }
}

export async function getSelectableWorkouts(userId?: string | null): Promise<SavedWorkoutSummary[]> {
    const [presets, completed] = await Promise.all([loadPresets(userId), loadCompleted(userId)]);

    const presetSummaries: SavedWorkoutSummary[] = presets.map((preset) => ({
        id: preset.id,
        name: preset.title,
        lastCompleted: 'saved preset',
        exerciseCount: preset.exercises.length,
        duration: '—',
        source: 'preset',
    }));

    const completedSummaries: SavedWorkoutSummary[] = completed.map((workout) => ({
        id: workout.id,
        name: workout.title,
        lastCompleted: formatCompletedDate(workout.completedAt),
        exerciseCount: workout.exerciseCount,
        duration: formatWorkoutDurationShort(workout.durationSeconds),
        source: 'completed',
    }));

    return [...presetSummaries, ...completedSummaries];
}

export async function getWorkoutTemplateExercises(
    workoutId: string,
    userId?: string | null
): Promise<MockExerciseTemplate[] | null> {
    const [presets, completed] = await Promise.all([loadPresets(userId), loadCompleted(userId)]);
    const preset = presets.find((item) => item.id === workoutId);
    if (preset) return preset.exercises;
    const session = completed.find((item) => item.id === workoutId);
    if (session) return session.exercises;
    return null;
}

export async function getWorkoutPresets(userId?: string | null): Promise<StoredWorkoutPreset[]> {
    return loadPresets(userId);
}

export async function getCompletedWorkouts(userId?: string | null): Promise<StoredCompletedWorkout[]> {
    return loadCompleted(userId);
}

/** Most recent completed sets for an exercise, used as the "previous" column. */
export async function getLastExercisePreviousSets(
    exerciseId: string,
    name: string,
    userId?: string | null
): Promise<Array<{ weight: number; reps: number }>> {
    const completed = await loadCompleted(userId);
    const sorted = [...completed].sort(
        (a, b) => Date.parse(b.completedAt) - Date.parse(a.completedAt)
    );
    const normalizedName = name.trim().toLowerCase();

    for (const workout of sorted) {
        const match = workout.exercises.find(
            (exercise) =>
                (exerciseId && exercise.exerciseId === exerciseId) ||
                exercise.name.trim().toLowerCase() === normalizedName
        );
        if (!match?.sets?.length) continue;

        return match.sets.map((set) => ({
            weight: set.previous?.weight ?? 0,
            reps: set.previous?.reps ?? 0,
        }));
    }

    return [];
}

export async function deleteWorkoutPreset(presetId: string, userId?: string | null): Promise<void> {
    try {
        const existing = await loadPresets(userId);
        const next = existing.filter((item) => item.id !== presetId);
        await AsyncStorage.setItem(scopedKey(PRESETS_KEY, userId), JSON.stringify(next));
    } catch (error) {
        console.warn('[workoutHistoryService] Failed to delete preset', error);
    }
}

export async function duplicateWorkoutPreset(
    presetId: string,
    userId?: string | null
): Promise<StoredWorkoutPreset | null> {
    try {
        const existing = await loadPresets(userId);
        const preset = existing.find((item) => item.id === presetId);
        if (!preset) return null;

        const copy: StoredWorkoutPreset = {
            ...preset,
            id: createUniqueId('preset-'),
            title: `${preset.title} copy`,
            createdAt: new Date().toISOString(),
            exercises: preset.exercises.map((exercise) => ({ ...exercise, sets: [...exercise.sets] })),
        };
        const next = [copy, ...existing].slice(0, 20);
        await AsyncStorage.setItem(scopedKey(PRESETS_KEY, userId), JSON.stringify(next));
        return copy;
    } catch (error) {
        console.warn('[workoutHistoryService] Failed to duplicate preset', error);
        return null;
    }
}

export async function saveWorkoutPresetFromExercises(
    title: string,
    exercises: MockExerciseTemplate[],
    userId?: string | null
): Promise<StoredWorkoutPreset | null> {
    try {
        const existing = await loadPresets(userId);
        const entry: StoredWorkoutPreset = {
            id: createUniqueId('preset-'),
            title: title.trim() || 'my workout',
            createdAt: new Date().toISOString(),
            exercises: exercises.map((exercise) => ({
                ...exercise,
                sets: exercise.sets.map((set) => ({ ...set })),
            })),
        };
        const next = [entry, ...existing].slice(0, 20);
        await AsyncStorage.setItem(scopedKey(PRESETS_KEY, userId), JSON.stringify(next));
        return entry;
    } catch (error) {
        console.warn('[workoutHistoryService] Failed to save preset from exercises', error);
        return null;
    }
}

export async function saveCompletedWorkout(
    summary: WorkoutWrapUpSummary,
    userId?: string | null
): Promise<void> {
    try {
        const existing = await loadCompleted(userId);
        const entry: StoredCompletedWorkout = {
            id: createUniqueId('completed-'),
            title: summary.workout.title,
            completedAt: summary.completedAt,
            durationSeconds: summary.elapsedSeconds,
            volume: summary.volume,
            sets: summary.sets,
            exerciseCount: summary.exerciseCount,
            exercises: workoutToTemplateExercises(summary.workout),
        };
        const next = [entry, ...existing].slice(0, 20);
        await AsyncStorage.setItem(scopedKey(COMPLETED_KEY, userId), JSON.stringify(next));
    } catch (error) {
        console.warn('[workoutHistoryService] Failed to save completed workout', error);
    }
}

export async function saveWorkoutPreset(
    summary: WorkoutWrapUpSummary,
    title?: string,
    userId?: string | null
): Promise<void> {
    try {
        const existing = await loadPresets(userId);
        const entry: StoredWorkoutPreset = {
            id: createUniqueId('preset-'),
            title: title?.trim() || summary.workout.title || 'my workout',
            createdAt: new Date().toISOString(),
            exercises: workoutToTemplateExercises(summary.workout),
        };
        const next = [entry, ...existing].slice(0, 20);
        await AsyncStorage.setItem(scopedKey(PRESETS_KEY, userId), JSON.stringify(next));
    } catch (error) {
        console.warn('[workoutHistoryService] Failed to save workout preset', error);
    }
}
