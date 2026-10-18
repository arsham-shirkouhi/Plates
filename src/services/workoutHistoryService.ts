import AsyncStorage from '@react-native-async-storage/async-storage';
import { MockExerciseTemplate, MockSetTemplate } from '../workout/mockWorkoutData';
import {
    SavedWorkoutSummary,
    StoredCompletedWorkout,
    StoredWorkoutPreset,
    WorkoutWrapUpSummary,
} from '../workout/workoutHistoryTypes';
import { Workout, WorkoutSetType } from '../workout/types';
import { createUniqueId, formatWorkoutDurationShort } from '../workout/workoutSelectors';
import { supabase } from './supabase';

const PRESETS_KEY = '@plates/workout-presets/v1';
const COMPLETED_KEY = '@plates/workout-completed/v1';
const HAS_COMPLETED_KEY = '@plates/has-completed-workout/v1';
const HISTORY_LIMIT = 50;

const SET_TYPES = new Set<WorkoutSetType>(['normal', 'warmup', 'failure', 'drop']);

type SetPayload = {
    set_type: WorkoutSetType;
    weight: number;
    reps: number;
    rpe?: number | null;
    completed?: boolean;
};

type ExercisePayload = {
    exercise_id: string;
    name: string;
    body_part?: string | null;
    note?: string | null;
    rest_seconds: number;
    sets: SetPayload[];
};

const localMigration = new Map<string, Promise<void>>();

function scopedKey(base: string, userId?: string | null): string {
    return userId ? `${base}:${userId}` : base;
}

function formatCompletedDate(iso: string): string {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'recently';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function asNumber(value: unknown): number {
    const parsed = typeof value === 'number' ? value : parseFloat(String(value ?? ''));
    return Number.isFinite(parsed) ? parsed : 0;
}

function asSetType(value: unknown): WorkoutSetType {
    return SET_TYPES.has(value as WorkoutSetType) ? (value as WorkoutSetType) : 'normal';
}

function sortByPosition<T extends { position?: number }>(rows: T[]): T[] {
    return [...rows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
}

export function workoutToTemplateExercises(workout: Workout): MockExerciseTemplate[] {
    return workout.exercises.map((exercise) => ({
        exerciseId: exercise.exerciseId,
        name: exercise.name,
        bodyPart: exercise.bodyPart,
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

function templateToPayload(exercises: MockExerciseTemplate[]): ExercisePayload[] {
    return exercises.map((exercise) => ({
        exercise_id: exercise.exerciseId,
        name: exercise.name,
        body_part: exercise.bodyPart ?? null,
        rest_seconds: exercise.restSeconds ?? 60,
        sets: exercise.sets.map((set) => ({
            set_type: asSetType(set.type),
            weight: set.previous?.weight ?? 0,
            reps: set.previous?.reps ?? 0,
        })),
    }));
}

function workoutToSessionPayload(summary: WorkoutWrapUpSummary) {
    return {
        title: summary.workout.title,
        started_at: summary.workout.startedAt,
        completed_at: summary.completedAt,
        duration_seconds: summary.elapsedSeconds,
        volume: summary.volume,
        set_count: summary.sets,
        notes: summary.workout.notes || null,
        exercises: summary.workout.exercises.map((exercise) => ({
            exercise_id: exercise.exerciseId,
            name: exercise.name,
            body_part: exercise.bodyPart ?? null,
            note: exercise.note || null,
            rest_seconds: exercise.restSeconds ?? 60,
            sets: exercise.sets.map((set) => ({
                set_type: asSetType(set.type),
                weight: parseFloat(set.weight) || set.previous?.weight || 0,
                reps: parseInt(set.reps, 10) || set.previous?.reps || 0,
                rpe: set.rpe ? asNumber(set.rpe) : null,
                completed: !!set.completed,
            })),
        })),
    };
}

function setsToTemplate(sets: Array<{ set_type?: string; weight?: unknown; reps?: unknown }>): MockSetTemplate[] {
    return sortByPosition(sets as Array<{ position?: number; set_type?: string; weight?: unknown; reps?: unknown }>).map(
        (set) => ({
            type: asSetType(set.set_type),
            previous: {
                weight: asNumber(set.weight),
                reps: Math.round(asNumber(set.reps)),
            },
        })
    );
}

function mapSession(row: {
    id: string;
    title: string;
    completed_at: string;
    duration_seconds: number;
    volume: unknown;
    set_count: number;
    workout_session_exercises?: Array<{
        exercise_id: string;
        name: string;
        body_part?: string | null;
        rest_seconds?: number | null;
        position?: number;
        workout_session_sets?: Array<{ set_type?: string; weight?: unknown; reps?: unknown; position?: number }>;
    }>;
}): StoredCompletedWorkout {
    const exercises = sortByPosition(row.workout_session_exercises ?? []).map((exercise) => ({
        exerciseId: exercise.exercise_id,
        name: exercise.name,
        bodyPart: exercise.body_part ?? undefined,
        restSeconds: exercise.rest_seconds ?? 60,
        sets: setsToTemplate(exercise.workout_session_sets ?? []),
    }));

    return {
        id: row.id,
        title: row.title,
        completedAt: row.completed_at,
        durationSeconds: row.duration_seconds ?? 0,
        volume: asNumber(row.volume),
        sets: row.set_count ?? 0,
        exerciseCount: exercises.length,
        exercises,
    };
}

function mapTemplate(row: {
    id: string;
    title: string;
    created_at: string;
    workout_template_exercises?: Array<{
        exercise_id: string;
        name: string;
        body_part?: string | null;
        rest_seconds?: number | null;
        position?: number;
        workout_template_sets?: Array<{ set_type?: string; weight?: unknown; reps?: unknown; position?: number }>;
    }>;
}): StoredWorkoutPreset {
    return {
        id: row.id,
        title: row.title,
        createdAt: row.created_at,
        exercises: sortByPosition(row.workout_template_exercises ?? []).map((exercise) => ({
            exerciseId: exercise.exercise_id,
            name: exercise.name,
            bodyPart: exercise.body_part ?? undefined,
            restSeconds: exercise.rest_seconds ?? 60,
            sets: setsToTemplate(exercise.workout_template_sets ?? []),
        })),
    };
}

async function loadLocalPresets(userId?: string | null): Promise<StoredWorkoutPreset[]> {
    try {
        const raw = await AsyncStorage.getItem(scopedKey(PRESETS_KEY, userId));
        if (!raw) return [];
        return JSON.parse(raw) as StoredWorkoutPreset[];
    } catch {
        return [];
    }
}

async function loadLocalCompleted(userId?: string | null): Promise<StoredCompletedWorkout[]> {
    try {
        const raw = await AsyncStorage.getItem(scopedKey(COMPLETED_KEY, userId));
        if (!raw) return [];
        return JSON.parse(raw) as StoredCompletedWorkout[];
    } catch {
        return [];
    }
}

async function writeLocalPresets(userId: string | null | undefined, presets: StoredWorkoutPreset[]): Promise<void> {
    await AsyncStorage.setItem(scopedKey(PRESETS_KEY, userId), JSON.stringify(presets));
}

async function writeLocalCompleted(
    userId: string | null | undefined,
    workouts: StoredCompletedWorkout[]
): Promise<void> {
    await AsyncStorage.setItem(scopedKey(COMPLETED_KEY, userId), JSON.stringify(workouts));
}

async function saveLocalCompleted(summary: WorkoutWrapUpSummary, userId?: string | null): Promise<void> {
    const existing = await loadLocalCompleted(userId);
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
    await writeLocalCompleted(userId, [entry, ...existing].slice(0, 20));
    await AsyncStorage.setItem(scopedKey(HAS_COMPLETED_KEY, userId), 'true');
}

async function saveLocalPreset(
    title: string,
    exercises: MockExerciseTemplate[],
    userId?: string | null
): Promise<StoredWorkoutPreset> {
    const existing = await loadLocalPresets(userId);
    const entry: StoredWorkoutPreset = {
        id: createUniqueId('preset-'),
        title: title.trim() || 'my workout',
        createdAt: new Date().toISOString(),
        exercises: exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((set) => ({ ...set })),
        })),
    };
    await writeLocalPresets(userId, [entry, ...existing].slice(0, 20));
    return entry;
}

async function uploadStoredSession(workout: StoredCompletedWorkout): Promise<boolean> {
    const { error } = await supabase.rpc('save_completed_workout', {
        payload: {
            title: workout.title,
            started_at: workout.completedAt,
            completed_at: workout.completedAt,
            duration_seconds: workout.durationSeconds,
            volume: workout.volume,
            set_count: workout.sets,
            exercises: workout.exercises.map((exercise) => ({
                exercise_id: exercise.exerciseId,
                name: exercise.name,
                body_part: exercise.bodyPart ?? null,
                rest_seconds: exercise.restSeconds ?? 60,
                sets: exercise.sets.map((set) => ({
                    set_type: asSetType(set.type),
                    weight: set.previous?.weight ?? 0,
                    reps: set.previous?.reps ?? 0,
                    completed: true,
                })),
            })),
        },
    });
    return !error;
}

async function uploadStoredPreset(preset: StoredWorkoutPreset): Promise<boolean> {
    const { error } = await supabase.rpc('save_workout_template', {
        payload: {
            title: preset.title,
            exercises: templateToPayload(preset.exercises),
        },
    });
    return !error;
}

async function migrateLocalHistory(userId: string): Promise<void> {
    const pending = localMigration.get(userId);
    if (pending) return pending;

    const job = (async () => {
        let completed = await loadLocalCompleted(userId);
        for (const workout of [...completed]) {
            const saved = await uploadStoredSession(workout);
            if (!saved) return;
            completed = completed.filter((item) => item.id !== workout.id);
            await writeLocalCompleted(userId, completed);
        }

        let presets = await loadLocalPresets(userId);
        for (const preset of [...presets]) {
            const saved = await uploadStoredPreset(preset);
            if (!saved) return;
            presets = presets.filter((item) => item.id !== preset.id);
            await writeLocalPresets(userId, presets);
        }
    })()
        .catch((error) => {
            console.warn('[workoutHistoryService] Failed to move on-phone history', error);
        })
        .finally(async () => {
            const [completed, presets] = await Promise.all([
                loadLocalCompleted(userId),
                loadLocalPresets(userId),
            ]);
            if (completed.length > 0 || presets.length > 0) {
                localMigration.delete(userId);
            }
        });

    localMigration.set(userId, job);
    return job;
}

async function fetchRemoteSessions(userId: string): Promise<StoredCompletedWorkout[] | null> {
    const { data, error } = await supabase
        .from('workout_sessions')
        .select(
            `
            id, title, completed_at, duration_seconds, volume, set_count,
            workout_session_exercises (
                exercise_id, name, body_part, rest_seconds, position,
                workout_session_sets (set_type, weight, reps, position)
            )
            `
        )
        .eq('user_id', userId)
        .order('completed_at', { ascending: false })
        .limit(HISTORY_LIMIT);

    if (error) {
        console.warn('[workoutHistoryService] Failed to load sessions', error);
        return null;
    }
    return (data ?? []).map((row) => mapSession(row));
}

async function fetchRemotePresets(userId: string): Promise<StoredWorkoutPreset[] | null> {
    const { data, error } = await supabase
        .from('workout_templates')
        .select(
            `
            id, title, created_at,
            workout_template_exercises (
                exercise_id, name, body_part, rest_seconds, position,
                workout_template_sets (set_type, weight, reps, position)
            )
            `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.warn('[workoutHistoryService] Failed to load templates', error);
        return null;
    }
    return (data ?? []).map((row) => mapTemplate(row));
}

export async function hasCompletedWorkout(userId?: string | null): Promise<boolean> {
    if (userId) {
        const remote = await fetchRemoteSessions(userId);
        if (remote) return remote.length > 0;
    }
    try {
        const value = await AsyncStorage.getItem(scopedKey(HAS_COMPLETED_KEY, userId));
        if (value === 'true') return true;
        const local = await loadLocalCompleted(userId);
        return local.length > 0;
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
    if (!userId) return loadLocalPresets(userId);
    await migrateLocalHistory(userId);
    const remote = await fetchRemotePresets(userId);
    if (remote) return remote;
    return loadLocalPresets(userId);
}

async function loadCompleted(userId?: string | null): Promise<StoredCompletedWorkout[]> {
    if (!userId) return loadLocalCompleted(userId);
    await migrateLocalHistory(userId);
    const remote = await fetchRemoteSessions(userId);
    if (remote) return remote;
    return loadLocalCompleted(userId);
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
        if (userId) {
            const { error } = await supabase
                .from('workout_templates')
                .delete()
                .eq('id', presetId)
                .eq('user_id', userId);
            if (!error) return;
            console.warn('[workoutHistoryService] Failed to delete template', error);
        }

        const existing = await loadLocalPresets(userId);
        await writeLocalPresets(
            userId,
            existing.filter((item) => item.id !== presetId)
        );
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
        return saveWorkoutPresetFromExercises(`${preset.title} copy`, preset.exercises, userId);
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
        if (userId) {
            const { data, error } = await supabase.rpc('save_workout_template', {
                payload: {
                    title: title.trim() || 'my workout',
                    exercises: templateToPayload(exercises),
                },
            });
            if (!error && data) {
                return {
                    id: String(data),
                    title: title.trim() || 'my workout',
                    createdAt: new Date().toISOString(),
                    exercises,
                };
            }
            console.warn('[workoutHistoryService] Failed to save template', error);
        }
        return await saveLocalPreset(title, exercises, userId);
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
        if (userId) {
            const { error } = await supabase.rpc('save_completed_workout', {
                payload: workoutToSessionPayload(summary),
            });
            if (!error) {
                await AsyncStorage.setItem(scopedKey(HAS_COMPLETED_KEY, userId), 'true');
                return;
            }
            console.warn('[workoutHistoryService] Failed to save session', error);
        }
        await saveLocalCompleted(summary, userId);
    } catch (error) {
        console.warn('[workoutHistoryService] Failed to save completed workout', error);
    }
}

export async function saveWorkoutPreset(
    summary: WorkoutWrapUpSummary,
    title?: string,
    userId?: string | null
): Promise<void> {
    await saveWorkoutPresetFromExercises(
        title?.trim() || summary.workout.title || 'my workout',
        workoutToTemplateExercises(summary.workout),
        userId
    );
}
