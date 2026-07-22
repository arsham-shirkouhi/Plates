import {
    ActiveWorkoutAction,
    ActiveWorkoutStoreState,
    RestTimerState,
    WorkoutExercise,
} from './types';
import {
    createDefaultSet,
    createUniqueId,
    createWorkoutExercise,
    getInitialStoreState,
    getNextSetInExercise,
    getNextSupersetExercise,
} from './workoutSelectors';

function mapExercise(
    workout: ActiveWorkoutStoreState['workout'],
    exerciseId: string,
    updater: (exercise: WorkoutExercise) => WorkoutExercise
): ActiveWorkoutStoreState['workout'] {
    if (!workout) return workout;
    return {
        ...workout,
        exercises: workout.exercises.map((exercise) =>
            exercise.id === exerciseId ? updater(exercise) : exercise
        ),
    };
}

function shouldStartRestTimer(
    exercise: WorkoutExercise,
    setId: string,
    restSeconds: number
): RestTimerState | null {
    if (restSeconds <= 0) return null;
    const nextSet = getNextSetInExercise(exercise, setId);
    if (nextSet?.type === 'drop') return null;
    const now = Date.now();
    return {
        exerciseId: exercise.id,
        setId,
        startedAt: now,
        endsAt: now + restSeconds * 1000,
        durationSeconds: restSeconds,
    };
}

export function activeWorkoutReducer(
    state: ActiveWorkoutStoreState,
    action: ActiveWorkoutAction
): ActiveWorkoutStoreState {
    switch (action.type) {
        case 'HYDRATE':
            return {
                ...state,
                ...action.payload,
                isHydrated: true,
            };

        case 'START_WORKOUT': {
            const workout = {
                id: createUniqueId('workout-'),
                title: action.payload.title?.trim() || 'workout',
                startedAt: new Date().toISOString(),
                notes: '',
                exercises: action.payload.exercises ?? [],
            };
            return {
                ...state,
                workout,
                presentation: 'fullscreen',
                restTimer: null,
                scrollTargetExerciseId: null,
            };
        }

        case 'RESTORE_WORKOUT':
            return {
                ...state,
                workout: action.payload,
                presentation: 'minimized',
                restTimer: null,
                scrollTargetExerciseId: null,
            };

        case 'SET_PRESENTATION':
            if (!state.workout && action.payload !== 'dismissed') return state;
            return { ...state, presentation: action.payload };

        case 'UPDATE_TITLE':
            if (!state.workout) return state;
            return {
                ...state,
                workout: { ...state.workout, title: action.payload },
            };

        case 'UPDATE_WORKOUT_NOTES':
            if (!state.workout) return state;
            return {
                ...state,
                workout: { ...state.workout, notes: action.payload },
            };

        case 'ADD_EXERCISES': {
            if (!state.workout) return state;
            const additions = action.payload.map((item) => createWorkoutExercise(item));
            return {
                ...state,
                workout: {
                    ...state.workout,
                    exercises: [...state.workout.exercises, ...additions],
                },
            };
        }

        case 'REMOVE_EXERCISE':
            if (!state.workout) return state;
            return {
                ...state,
                workout: {
                    ...state.workout,
                    exercises: state.workout.exercises.filter((exercise) => exercise.id !== action.payload.exerciseId),
                },
                restTimer:
                    state.restTimer?.exerciseId === action.payload.exerciseId ? null : state.restTimer,
            };

        case 'UPDATE_EXERCISE_NOTE':
            if (!state.workout) return state;
            return {
                ...state,
                workout: mapExercise(state.workout, action.payload.exerciseId, (exercise) => ({
                    ...exercise,
                    note: action.payload.note,
                })),
            };

        case 'UPDATE_REST_SECONDS':
            if (!state.workout) return state;
            return {
                ...state,
                workout: mapExercise(state.workout, action.payload.exerciseId, (exercise) => ({
                    ...exercise,
                    restSeconds: action.payload.restSeconds,
                })),
            };

        case 'ADD_SET':
            if (!state.workout) return state;
            return {
                ...state,
                workout: mapExercise(state.workout, action.payload.exerciseId, (exercise) => {
                    const lastSet = exercise.sets[exercise.sets.length - 1];
                    return {
                        ...exercise,
                        sets: [...exercise.sets, createDefaultSet(lastSet)],
                    };
                }),
            };

        case 'UPDATE_SET':
            if (!state.workout) return state;
            return {
                ...state,
                workout: mapExercise(state.workout, action.payload.exerciseId, (exercise) => ({
                    ...exercise,
                    sets: exercise.sets.map((set) =>
                        set.id === action.payload.setId ? { ...set, ...action.payload.patch } : set
                    ),
                })),
            };

        case 'TOGGLE_SET_COMPLETE': {
            if (!state.workout) return state;
            let nextRestTimer: RestTimerState | null = state.restTimer;
            let scrollTargetExerciseId: string | null = null;
            const workout = mapExercise(state.workout, action.payload.exerciseId, (exercise) => {
                const sets = exercise.sets.map((set) => {
                    if (set.id !== action.payload.setId) return set;
                    const completed = !set.completed;
                    let weight = set.weight;
                    let reps = set.reps;
                    if (completed) {
                        if (!weight && set.previous) weight = String(set.previous.weight);
                        if (!reps && set.previous) reps = String(set.previous.reps);
                    }
                    return { ...set, completed, weight, reps };
                });
                const toggled = sets.find((set) => set.id === action.payload.setId);
                if (toggled?.completed) {
                    nextRestTimer = shouldStartRestTimer({ ...exercise, sets }, action.payload.setId, exercise.restSeconds);
                    const nextSupersetExercise = getNextSupersetExercise(
                        { ...state.workout, exercises: state.workout.exercises },
                        exercise.id
                    );
                    if (nextSupersetExercise && nextSupersetExercise.id !== exercise.id) {
                        scrollTargetExerciseId = nextSupersetExercise.id;
                    }
                } else if (state.restTimer?.setId === action.payload.setId) {
                    nextRestTimer = null;
                }
                return { ...exercise, sets };
            });
            return {
                ...state,
                workout,
                restTimer: nextRestTimer,
                scrollTargetExerciseId,
            };
        }

        case 'REMOVE_SET':
            if (!state.workout) return state;
            return {
                ...state,
                workout: mapExercise(state.workout, action.payload.exerciseId, (exercise) => ({
                    ...exercise,
                    sets: exercise.sets.filter((set) => set.id !== action.payload.setId),
                })),
                restTimer:
                    state.restTimer?.setId === action.payload.setId ? null : state.restTimer,
            };

        case 'CHANGE_SET_TYPE':
            if (!state.workout) return state;
            return {
                ...state,
                workout: mapExercise(state.workout, action.payload.exerciseId, (exercise) => ({
                    ...exercise,
                    sets: exercise.sets.map((set) =>
                        set.id === action.payload.setId ? { ...set, type: action.payload.setType } : set
                    ),
                })),
            };

        case 'APPLY_PREVIOUS_SET':
            if (!state.workout) return state;
            return {
                ...state,
                workout: mapExercise(state.workout, action.payload.exerciseId, (exercise) => ({
                    ...exercise,
                    sets: exercise.sets.map((set) => {
                        if (set.id !== action.payload.setId || !set.previous) return set;
                        return {
                            ...set,
                            weight: String(set.previous.weight),
                            reps: String(set.previous.reps),
                        };
                    }),
                })),
            };

        case 'ADD_TO_SUPERSET': {
            if (!state.workout) return state;
            const supersetId = action.payload.supersetId ?? createUniqueId('ss-');
            const ids = new Set(action.payload.exerciseIds);
            return {
                ...state,
                workout: {
                    ...state.workout,
                    exercises: state.workout.exercises.map((exercise) =>
                        ids.has(exercise.id) ? { ...exercise, supersetId } : exercise
                    ),
                },
            };
        }

        case 'START_REST_TIMER':
            return { ...state, restTimer: action.payload };

        case 'ADJUST_REST_TIMER': {
            if (!state.restTimer) return state;
            const remaining = Math.max(
                0,
                Math.ceil((state.restTimer.endsAt - action.payload.now) / 1000) + action.payload.deltaSeconds
            );
            if (remaining === 0) {
                return { ...state, restTimer: null };
            }
            return {
                ...state,
                restTimer: {
                    ...state.restTimer,
                    endsAt: action.payload.now + remaining * 1000,
                    durationSeconds: Math.max(
                        state.restTimer.durationSeconds,
                        Math.ceil((action.payload.now + remaining * 1000 - state.restTimer.startedAt) / 1000)
                    ),
                },
            };
        }

        case 'SKIP_REST_TIMER':
        case 'CLEAR_REST_TIMER':
            return { ...state, restTimer: null };

        case 'CLEAR_SCROLL_TARGET':
            return { ...state, scrollTargetExerciseId: null };

        case 'FINISH_WORKOUT':
        case 'DISCARD_WORKOUT':
            return {
                ...getInitialStoreState(),
                settings: state.settings,
                isHydrated: true,
            };

        default:
            return state;
    }
}

export { getInitialStoreState };
