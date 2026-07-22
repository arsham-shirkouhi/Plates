import {
    ActiveWorkoutStoreState,
    OverlayPresentation,
    RestTimerState,
    Workout,
    WorkoutExercise,
    WorkoutSet,
    WorkoutSettings,
} from './types';
import { WorkoutWrapUpSummary } from './workoutHistoryTypes';

export function createUniqueId(prefix = ''): string {
    return `${prefix}${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getElapsedSeconds(startedAt: string, now = Date.now()): number {
    return Math.max(0, Math.floor((now - Date.parse(startedAt)) / 1000));
}

export function formatWorkoutClock(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    if (hours > 0) {
        return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatWorkoutDurationShort(totalSeconds: number): string {
    const t = Math.max(0, Math.floor(totalSeconds));
    if (t < 60) return `${t}s`;
    if (t < 3600) {
        const m = Math.floor(t / 60);
        const s = t % 60;
        return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    const h = Math.floor(t / 3600);
    const rem = t % 3600;
    const m = Math.floor(rem / 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function formatRestDuration(seconds: number): string {
    if (seconds <= 0) return 'Off';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatPreviousSet(previous?: { weight: number; reps: number }): string {
    if (!previous) return '—';
    return `${previous.weight}kg × ${previous.reps}`;
}

export function shouldCountSetForStats(set: WorkoutSet, settings: WorkoutSettings): boolean {
    if (settings.excludeWarmupFromSetCount && set.type === 'warmup') return false;
    return true;
}

export function shouldCountSetForVolume(set: WorkoutSet, settings: WorkoutSettings): boolean {
    if (!set.completed) return false;
    if (settings.excludeWarmupFromVolume && set.type === 'warmup') return false;
    return true;
}

export function getCompletedVolume(workout: Workout, settings: WorkoutSettings): number {
    return workout.exercises.reduce((total, exercise) => {
        return (
            total +
            exercise.sets.reduce((exerciseTotal, set) => {
                if (!shouldCountSetForVolume(set, settings)) return exerciseTotal;
                const weight = parseFloat(set.weight) || 0;
                const reps = parseInt(set.reps, 10) || 0;
                return exerciseTotal + weight * reps;
            }, 0)
        );
    }, 0);
}

export function getCompletedSetCount(workout: Workout, settings: WorkoutSettings): number {
    return workout.exercises.reduce((total, exercise) => {
        return (
            total +
            exercise.sets.filter((set) => set.completed && shouldCountSetForStats(set, settings)).length
        );
    }, 0);
}

export function getCurrentExercise(workout: Workout): WorkoutExercise | null {
    if (workout.exercises.length === 0) return null;
    const incomplete = workout.exercises.find(
        (exercise) => exercise.sets.length === 0 || !exercise.sets.every((set) => set.completed)
    );
    return incomplete ?? workout.exercises[workout.exercises.length - 1];
}

export function getExerciseSetProgress(exercise: WorkoutExercise): { completed: number; total: number } {
    const completed = exercise.sets.filter((set) => set.completed).length;
    return { completed, total: exercise.sets.length };
}

export function getRestRemainingSeconds(restTimer: RestTimerState | null, now = Date.now()): number {
    if (!restTimer) return 0;
    return Math.max(0, Math.ceil((restTimer.endsAt - now) / 1000));
}

export function getRestProgress(restTimer: RestTimerState | null, now = Date.now()): number {
    if (!restTimer) return 0;
    const elapsed = now - restTimer.startedAt;
    const total = restTimer.durationSeconds * 1000;
    if (total <= 0) return 1;
    return Math.min(1, Math.max(0, elapsed / total));
}

export function getNextSetInExercise(exercise: WorkoutExercise, setId: string): WorkoutSet | null {
    const index = exercise.sets.findIndex((set) => set.id === setId);
    if (index < 0) return null;
    return exercise.sets[index + 1] ?? null;
}

export function getNextSupersetExercise(workout: Workout, exerciseId: string): WorkoutExercise | null {
    const current = workout.exercises.find((exercise) => exercise.id === exerciseId);
    if (!current?.supersetId) return null;
    const group = workout.exercises.filter((exercise) => exercise.supersetId === current.supersetId);
    const index = group.findIndex((exercise) => exercise.id === exerciseId);
    if (index < 0) return null;
    return group[index + 1] ?? group[0] ?? null;
}

export function createDefaultSet(previousSet?: WorkoutSet): WorkoutSet {
    return {
        id: createUniqueId('set-'),
        type: 'normal',
        weight: previousSet?.weight ?? '',
        reps: previousSet?.reps ?? '',
        rpe: previousSet?.rpe,
        completed: false,
        previous: previousSet?.previous,
    };
}

export function createWorkoutExercise(input: {
    exerciseId: string;
    name: string;
    thumbnailUrl?: string;
}): WorkoutExercise {
    return {
        id: createUniqueId('wx-'),
        exerciseId: input.exerciseId,
        name: input.name,
        thumbnailUrl: input.thumbnailUrl,
        note: '',
        restSeconds: 120,
        sets: [{
            ...createDefaultSet(),
            previous: { weight: 60, reps: 10 },
        }],
    };
}

export function isOverlayVisible(presentation: OverlayPresentation): boolean {
    return presentation === 'fullscreen' || presentation === 'minimized';
}

export function buildWrapUpSummary(
    workout: Workout,
    settings: WorkoutSettings,
    completedAt = new Date().toISOString()
): WorkoutWrapUpSummary {
    return {
        workout,
        elapsedSeconds: getElapsedSeconds(workout.startedAt, Date.parse(completedAt)),
        volume: getCompletedVolume(workout, settings),
        sets: getCompletedSetCount(workout, settings),
        exerciseCount: workout.exercises.length,
        completedAt,
    };
}

export function getInitialStoreState(): ActiveWorkoutStoreState {
    return {
        workout: null,
        presentation: 'dismissed',
        restTimer: null,
        settings: {
            excludeWarmupFromVolume: true,
            excludeWarmupFromSetCount: true,
            showRpeColumn: false,
            restTimerSoundEnabled: false,
        },
        scrollTargetExerciseId: null,
        isHydrated: false,
    };
}
