import { MockExerciseTemplate } from './mockWorkoutData';
import { Workout } from './types';

export interface SavedWorkoutSummary {
    id: string;
    name: string;
    lastCompleted: string;
    exerciseCount: number;
    duration: string;
    source: 'preset' | 'completed';
}

export interface StoredWorkoutPreset {
    id: string;
    title: string;
    createdAt: string;
    exercises: MockExerciseTemplate[];
}

export interface StoredCompletedWorkout {
    id: string;
    title: string;
    completedAt: string;
    durationSeconds: number;
    volume: number;
    sets: number;
    exerciseCount: number;
    exercises: MockExerciseTemplate[];
}

export interface WorkoutWrapUpSummary {
    workout: Workout;
    elapsedSeconds: number;
    volume: number;
    sets: number;
    exerciseCount: number;
    completedAt: string;
}
