import { Exercise, getExercisesList } from './exerciseService';
import { getCompletedWorkouts } from './workoutHistoryService';
import { mapBodyPartToMuscleGroup, MuscleGroup } from '../workout/muscleGroups';
import { buildWorkoutTitleFromGroups } from '../workout/muscleSelectSelectors';
import { MOCK_EXERCISES } from '../workout/mockWorkoutData';
import { MockExerciseTemplate } from '../workout/mockWorkoutData';
import { buildWorkoutExercisesFromExerciseTemplates } from '../workout/mockWorkoutData';
import { WorkoutExercise } from '../workout/types';

const MAX_EXERCISES = 6;

type ExerciseCandidate = {
    exerciseId: string;
    name: string;
    muscle: MuscleGroup;
    frequency: number;
    template?: MockExerciseTemplate;
};

function templateFromHistory(
    exerciseId: string,
    name: string,
    historyTemplate?: MockExerciseTemplate
): MockExerciseTemplate {
    if (historyTemplate) {
        return {
            exerciseId: historyTemplate.exerciseId,
            name: historyTemplate.name,
            bodyPart: historyTemplate.bodyPart,
            restSeconds: historyTemplate.restSeconds ?? 60,
            sets: historyTemplate.sets.map((set) => ({ ...set })),
        };
    }

    return {
        exerciseId,
        name,
        restSeconds: 60,
        sets: [
            { type: 'normal', previous: { weight: 0, reps: 8 } },
            { type: 'normal', previous: { weight: 0, reps: 8 } },
            { type: 'normal', previous: { weight: 0, reps: 8 } },
        ],
    };
}

async function buildExerciseFrequency(userId?: string | null): Promise<Map<string, ExerciseCandidate>> {
    const completed = await getCompletedWorkouts(userId);
    const frequency = new Map<string, ExerciseCandidate>();

    for (const workout of completed) {
        for (const exercise of workout.exercises) {
            const muscle = mapBodyPartToMuscleGroup(exercise.bodyPart, exercise.name);
            if (!muscle) continue;

            const key = exercise.exerciseId || exercise.name;
            const existing = frequency.get(key);
            if (existing) {
                existing.frequency += 1;
                if (!existing.template && exercise.sets?.length) {
                    existing.template = exercise;
                }
            } else {
                frequency.set(key, {
                    exerciseId: exercise.exerciseId,
                    name: exercise.name,
                    muscle,
                    frequency: 1,
                    template: exercise,
                });
            }
        }
    }

    return frequency;
}

function libraryForMuscle(muscle: MuscleGroup, library: Exercise[]): Exercise[] {
    return library.filter((exercise) => mapBodyPartToMuscleGroup(exercise.bodyPart, exercise.name) === muscle);
}

export async function countExercisesForMuscleGroups(
    selectedGroups: MuscleGroup[],
    userId?: string | null
): Promise<number> {
    const assembled = await assembleExerciseTemplates(selectedGroups, userId);
    return assembled.length;
}

export async function assembleExerciseTemplates(
    selectedGroups: MuscleGroup[],
    userId?: string | null
): Promise<MockExerciseTemplate[]> {
    if (selectedGroups.length === 0) return [];

    const frequency = await buildExerciseFrequency(userId);
    const remoteLibrary = await getExercisesList(100, 0);
    const library = remoteLibrary.length > 0 ? remoteLibrary : MOCK_EXERCISES;

    const picked: MockExerciseTemplate[] = [];
    const pickedIds = new Set<string>();

    for (const group of selectedGroups) {
        const groupCandidates = [...frequency.values()]
            .filter((item) => item.muscle === group)
            .sort((a, b) => b.frequency - a.frequency);

        const top = groupCandidates.find((item) => !pickedIds.has(item.exerciseId));
        if (top) {
            pickedIds.add(top.exerciseId);
            picked.push(templateFromHistory(top.exerciseId, top.name, top.template));
        }
    }

    for (const group of selectedGroups) {
        if (picked.length >= MAX_EXERCISES) break;
        if (picked.some((item) => mapBodyPartToMuscleGroup(item.bodyPart, item.name) === group)) {
            continue;
        }

        const fallback = libraryForMuscle(group, library).find((item) => !pickedIds.has(item.id));
        if (fallback) {
            pickedIds.add(fallback.id);
            picked.push(
                templateFromHistory(fallback.id, fallback.name, {
                    exerciseId: fallback.id,
                    name: fallback.name,
                    bodyPart: fallback.bodyPart,
                    restSeconds: 60,
                    sets: [
                        { type: 'normal', previous: { weight: 0, reps: 10 } },
                        { type: 'normal', previous: { weight: 0, reps: 10 } },
                    ],
                })
            );
        }
    }

    while (picked.length < MAX_EXERCISES) {
        let added = false;
        for (const group of selectedGroups) {
            if (picked.length >= MAX_EXERCISES) break;
            const next = libraryForMuscle(group, library).find((item) => !pickedIds.has(item.id));
            if (!next) continue;
            pickedIds.add(next.id);
            picked.push(
                templateFromHistory(next.id, next.name, {
                    exerciseId: next.id,
                    name: next.name,
                    bodyPart: next.bodyPart,
                    restSeconds: 60,
                    sets: [{ type: 'normal', previous: { weight: 0, reps: 10 } }],
                })
            );
            added = true;
        }
        if (!added) break;
    }

    return picked.slice(0, MAX_EXERCISES);
}

export async function assembleWorkoutFromMuscleGroups(
    selectedGroups: MuscleGroup[],
    userId?: string | null
): Promise<{ title: string; exercises: WorkoutExercise[] }> {
    const templates = await assembleExerciseTemplates(selectedGroups, userId);
    return {
        title: buildWorkoutTitleFromGroups(selectedGroups),
        exercises: buildWorkoutExercisesFromExerciseTemplates(templates),
    };
}
