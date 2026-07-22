import { MockExerciseTemplate, MockWorkoutTemplate } from './mockWorkoutData';
import { mapBodyPartToMuscleGroup, MuscleGroup } from './muscleGroups';
import { StoredWorkoutPreset } from './workoutHistoryTypes';

export type RoutineSource = 'user' | 'preset';

export interface StartWorkoutRoutine {
    id: string;
    name: string;
    source: RoutineSource;
    exerciseCount: number;
    durationLabel: string;
    exercises: MockExerciseTemplate[];
    muscleGroups: MuscleGroup[];
    createdAt?: string;
    template?: MockWorkoutTemplate;
}

export interface SuggestedWorkout {
    routine: StartWorkoutRoutine;
    reason: string;
    isFirstTimePreset?: boolean;
}

export interface StartWorkoutFilters {
    muscleGroup: MuscleGroup | null;
    showUserRoutines: boolean;
    showPresets: boolean;
    searchQuery: string;
}

export const DEFAULT_START_WORKOUT_FILTERS: StartWorkoutFilters = {
    muscleGroup: null,
    showUserRoutines: true,
    showPresets: true,
    searchQuery: '',
};

export function routineFromUserPreset(preset: StoredWorkoutPreset, durationLabel = '—'): StartWorkoutRoutine {
    return {
        id: preset.id,
        name: preset.title,
        source: 'user',
        exerciseCount: preset.exercises.length,
        durationLabel,
        exercises: preset.exercises,
        muscleGroups: inferMuscleGroupsFromExercises(preset.exercises),
        createdAt: preset.createdAt,
    };
}

export function routineFromMockTemplate(template: MockWorkoutTemplate): StartWorkoutRoutine {
    return {
        id: template.id,
        name: template.title,
        source: 'preset',
        exerciseCount: template.exerciseCount,
        durationLabel: template.durationLabel,
        exercises: template.exercises,
        muscleGroups: inferMuscleGroupsFromExercises(template.exercises),
        template,
    };
}

function inferMuscleGroupsFromExercises(exercises: MockExerciseTemplate[]): MuscleGroup[] {
    const groups = new Set<MuscleGroup>();
    for (const exercise of exercises) {
        const group = mapBodyPartToMuscleGroup(exercise.bodyPart, exercise.name);
        if (group) groups.add(group);
    }
    return [...groups];
}
