import { Exercise, ExerciseDetails } from '../services/exerciseService';
import { WorkoutExercise, WorkoutSet, WorkoutSetType } from './types';
import { createUniqueId } from './workoutSelectors';

export interface MockSetTemplate {
    type?: WorkoutSetType;
    previous?: { weight: number; reps: number };
}

export interface MockExerciseTemplate {
    exerciseId: string;
    name: string;
    bodyPart?: string;
    restSeconds?: number;
    sets: MockSetTemplate[];
}

export interface MockWorkoutTemplate {
    id: string;
    title: string;
    description: string;
    exerciseCount: number;
    durationLabel: string;
    exercises: MockExerciseTemplate[];
}

export const MOCK_EXERCISES: Exercise[] = [
    { id: 'mock-bench-press', name: 'bench press', bodyPart: 'chest' },
    { id: 'mock-incline-db', name: 'incline dumbbell press', bodyPart: 'chest' },
    { id: 'mock-shoulder-press', name: 'shoulder press', bodyPart: 'shoulders' },
    { id: 'mock-tricep-dip', name: 'tricep dip', bodyPart: 'arms' },
    { id: 'mock-pull-up', name: 'pull up', bodyPart: 'back' },
    { id: 'mock-barbell-row', name: 'barbell row', bodyPart: 'back' },
    { id: 'mock-lat-pulldown', name: 'lat pulldown', bodyPart: 'back' },
    { id: 'mock-barbell-curl', name: 'barbell curl', bodyPart: 'arms' },
    { id: 'mock-squat', name: 'barbell squat', bodyPart: 'legs' },
    { id: 'mock-rdl', name: 'romanian deadlift', bodyPart: 'legs' },
    { id: 'mock-leg-press', name: 'leg press', bodyPart: 'legs' },
    { id: 'mock-calf-raise', name: 'calf raise', bodyPart: 'legs' },
    { id: 'mock-plank', name: 'plank', bodyPart: 'core' },
];

export const MOCK_WORKOUT_TEMPLATES: MockWorkoutTemplate[] = [
    {
        id: 'mock-push',
        title: 'push day',
        description: 'chest, shoulders, triceps',
        exerciseCount: 4,
        durationLabel: '55m',
        exercises: [
            {
                exerciseId: 'mock-bench-press',
                name: 'bench press',
                restSeconds: 150,
                sets: [
                    { type: 'warmup', previous: { weight: 40, reps: 10 } },
                    { type: 'normal', previous: { weight: 80, reps: 8 } },
                    { type: 'normal', previous: { weight: 85, reps: 6 } },
                ],
            },
            {
                exerciseId: 'mock-incline-db',
                name: 'incline dumbbell press',
                restSeconds: 120,
                sets: [
                    { type: 'normal', previous: { weight: 28, reps: 10 } },
                    { type: 'normal', previous: { weight: 30, reps: 8 } },
                ],
            },
            {
                exerciseId: 'mock-shoulder-press',
                name: 'shoulder press',
                restSeconds: 120,
                sets: [
                    { type: 'normal', previous: { weight: 45, reps: 8 } },
                    { type: 'normal', previous: { weight: 50, reps: 6 } },
                ],
            },
            {
                exerciseId: 'mock-tricep-dip',
                name: 'tricep dip',
                restSeconds: 90,
                sets: [
                    { type: 'normal', previous: { weight: 0, reps: 12 } },
                    { type: 'failure', previous: { weight: 0, reps: 10 } },
                ],
            },
        ],
    },
    {
        id: 'mock-pull',
        title: 'pull day',
        description: 'back and biceps',
        exerciseCount: 4,
        durationLabel: '50m',
        exercises: [
            {
                exerciseId: 'mock-pull-up',
                name: 'pull up',
                restSeconds: 120,
                sets: [
                    { type: 'normal', previous: { weight: 0, reps: 8 } },
                    { type: 'normal', previous: { weight: 0, reps: 7 } },
                    { type: 'normal', previous: { weight: 0, reps: 6 } },
                ],
            },
            {
                exerciseId: 'mock-barbell-row',
                name: 'barbell row',
                restSeconds: 120,
                sets: [
                    { type: 'normal', previous: { weight: 70, reps: 8 } },
                    { type: 'normal', previous: { weight: 75, reps: 8 } },
                ],
            },
            {
                exerciseId: 'mock-lat-pulldown',
                name: 'lat pulldown',
                restSeconds: 90,
                sets: [
                    { type: 'normal', previous: { weight: 55, reps: 10 } },
                    { type: 'drop', previous: { weight: 45, reps: 12 } },
                ],
            },
            {
                exerciseId: 'mock-barbell-curl',
                name: 'barbell curl',
                restSeconds: 75,
                sets: [
                    { type: 'normal', previous: { weight: 25, reps: 12 } },
                    { type: 'normal', previous: { weight: 27.5, reps: 10 } },
                ],
            },
        ],
    },
    {
        id: 'mock-legs',
        title: 'leg day',
        description: 'quads, hamstrings, calves',
        exerciseCount: 4,
        durationLabel: '60m',
        exercises: [
            {
                exerciseId: 'mock-squat',
                name: 'barbell squat',
                restSeconds: 180,
                sets: [
                    { type: 'warmup', previous: { weight: 60, reps: 8 } },
                    { type: 'normal', previous: { weight: 100, reps: 5 } },
                    { type: 'normal', previous: { weight: 105, reps: 5 } },
                ],
            },
            {
                exerciseId: 'mock-rdl',
                name: 'romanian deadlift',
                restSeconds: 150,
                sets: [
                    { type: 'normal', previous: { weight: 80, reps: 8 } },
                    { type: 'normal', previous: { weight: 85, reps: 8 } },
                ],
            },
            {
                exerciseId: 'mock-leg-press',
                name: 'leg press',
                restSeconds: 120,
                sets: [
                    { type: 'normal', previous: { weight: 140, reps: 12 } },
                    { type: 'normal', previous: { weight: 150, reps: 10 } },
                ],
            },
            {
                exerciseId: 'mock-calf-raise',
                name: 'calf raise',
                restSeconds: 60,
                sets: [
                    { type: 'normal', previous: { weight: 40, reps: 15 } },
                    { type: 'normal', previous: { weight: 45, reps: 12 } },
                ],
            },
        ],
    },
    {
        id: 'mock-full-body',
        title: 'full body',
        description: 'quick full-body session',
        exerciseCount: 4,
        durationLabel: '45m',
        exercises: [
            {
                exerciseId: 'mock-squat',
                name: 'barbell squat',
                restSeconds: 150,
                sets: [
                    { type: 'normal', previous: { weight: 80, reps: 5 } },
                    { type: 'normal', previous: { weight: 85, reps: 5 } },
                ],
            },
            {
                exerciseId: 'mock-bench-press',
                name: 'bench press',
                restSeconds: 150,
                sets: [
                    { type: 'normal', previous: { weight: 70, reps: 8 } },
                    { type: 'normal', previous: { weight: 75, reps: 6 } },
                ],
            },
            {
                exerciseId: 'mock-barbell-row',
                name: 'barbell row',
                restSeconds: 120,
                sets: [
                    { type: 'normal', previous: { weight: 60, reps: 8 } },
                    { type: 'normal', previous: { weight: 65, reps: 8 } },
                ],
            },
            {
                exerciseId: 'mock-plank',
                name: 'plank',
                restSeconds: 60,
                sets: [
                    { type: 'normal', previous: { weight: 0, reps: 45 } },
                    { type: 'normal', previous: { weight: 0, reps: 60 } },
                ],
            },
        ],
    },
];

/** Maps browse-workout card ids to mock templates */
export const BROWSE_WORKOUT_ID_MAP: Record<string, string> = {
    p1: 'mock-full-body',
    p2: 'mock-push',
    p3: 'mock-pull',
    p4: 'mock-legs',
    p5: 'mock-full-body',
    c1: 'mock-legs',
    c2: 'mock-full-body',
    c3: 'mock-push',
    c4: 'mock-pull',
};

export function resolveMockTemplateId(workoutId: string): string | undefined {
    if (MOCK_WORKOUT_TEMPLATES.some((template) => template.id === workoutId)) {
        return workoutId;
    }
    return BROWSE_WORKOUT_ID_MAP[workoutId];
}

export function getMockWorkoutTemplate(workoutId: string): MockWorkoutTemplate | undefined {
    const resolvedId = resolveMockTemplateId(workoutId);
    if (!resolvedId) return undefined;
    return MOCK_WORKOUT_TEMPLATES.find((template) => template.id === resolvedId);
}

export function buildWorkoutExercisesFromTemplate(template: MockWorkoutTemplate): WorkoutExercise[] {
    return buildWorkoutExercisesFromExerciseTemplates(template.exercises);
}

export function buildWorkoutExercisesFromExerciseTemplates(
    exerciseTemplates: MockExerciseTemplate[]
): WorkoutExercise[] {
    return exerciseTemplates.map((exerciseTemplate) => ({
        id: createUniqueId('wx-'),
        exerciseId: exerciseTemplate.exerciseId,
        name: exerciseTemplate.name,
        note: '',
        restSeconds: exerciseTemplate.restSeconds ?? 60,
        sets: exerciseTemplate.sets.map((setTemplate): WorkoutSet => ({
            id: createUniqueId('set-'),
            type: setTemplate.type ?? 'normal',
            weight: '',
            reps: '',
            completed: false,
            previous: setTemplate.previous,
        })),
    }));
}

export function getMockExercisesPage(limit: number, offset: number): Exercise[] {
    return MOCK_EXERCISES.slice(offset, offset + limit);
}

export function searchMockExercises(query: string, limit = 100): Exercise[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return MOCK_EXERCISES.slice(0, limit);
    return MOCK_EXERCISES.filter(
        (exercise) =>
            exercise.name.toLowerCase().includes(normalized) ||
            exercise.bodyPart?.toLowerCase().includes(normalized)
    ).slice(0, limit);
}

export function getMockExerciseDetails(exerciseId: string): ExerciseDetails | null {
    const exercise = MOCK_EXERCISES.find((item) => item.id === exerciseId);
    if (!exercise) return null;
    return {
        id: exercise.id,
        Title: exercise.name,
        Desc: 'Offline placeholder exercise while the database is unavailable.',
        BodyPart: exercise.bodyPart ?? '',
        Equipment: 'barbell',
        Level: 'intermediate',
    };
}

export function getMockSavedWorkoutSummaries() {
    return MOCK_WORKOUT_TEMPLATES.map((template) => ({
        id: template.id,
        name: template.title,
        lastCompleted: 'offline template',
        exerciseCount: template.exerciseCount,
        duration: template.durationLabel,
    }));
}
