import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useReducer,
    useRef,
    useState,
} from 'react';
import {
    ActiveWorkoutAction,
    ActiveWorkoutStoreState,
    CatalogExercise,
    OverlayPresentation,
    WorkoutExercise,
    WorkoutSetType,
} from '../workout/types';
import { WorkoutWrapUpSummary } from '../workout/workoutHistoryTypes';
import { activeWorkoutReducer, getInitialStoreState } from '../workout/workoutReducer';
import { buildWrapUpSummary, createManualRestTimer, getCurrentExercise } from '../workout/workoutSelectors';
import {
    clearPersistedWorkoutState,
    loadPersistedWorkoutState,
    persistWorkoutState,
} from '../workout/workoutPersistence';
import { getLastExercisePreviousSets, saveCompletedWorkout, withLastPerformance } from '../services/workoutHistoryService';
import { useAuth } from '../context/AuthContext';

interface ActiveWorkoutContextValue {
    state: ActiveWorkoutStoreState;
    dispatch: React.Dispatch<ActiveWorkoutAction>;
    startWorkout: (options?: { title?: string; exercises?: WorkoutExercise[] }) => void;
    setPresentation: (presentation: OverlayPresentation) => void;
    minimize: () => void;
    expand: () => void;
    dismiss: () => void;
    updateTitle: (title: string) => void;
    addExercises: (items: CatalogExercise[]) => Promise<void>;
    removeExercise: (exerciseId: string) => void;
    updateExerciseNote: (exerciseId: string, note: string) => void;
    updateRestSeconds: (exerciseId: string, restSeconds: number) => void;
    addSet: (exerciseId: string) => void;
    addWarmupSets: (exerciseId: string) => void;
    updateSet: (
        exerciseId: string,
        setId: string,
        patch: Partial<{ weight: string; reps: string; rpe: string }>
    ) => void;
    toggleSetComplete: (exerciseId: string, setId: string) => void;
    removeSet: (exerciseId: string, setId: string) => void;
    changeSetType: (exerciseId: string, setId: string, setType: WorkoutSetType) => void;
    applyPreviousSet: (exerciseId: string, setId: string) => void;
    addToSuperset: (exerciseIds: string[]) => void;
    startRestTimer: (durationSeconds?: number) => boolean;
    setDefaultRestSeconds: (restSeconds: number) => void;
    adjustRestTimer: (deltaSeconds: number) => void;
    skipRestTimer: () => void;
    clearScrollTarget: () => void;
    finishWorkout: () => Promise<void>;
    endActiveWorkout: () => Promise<void>;
    wrapUpSummary: WorkoutWrapUpSummary | null;
    requestWrapUp: () => WorkoutWrapUpSummary | null;
    commitFinishWorkout: () => Promise<void>;
    clearWrapUp: () => void;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(null);

export const ActiveWorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, loading: authLoading } = useAuth();
    const [state, dispatch] = useReducer(activeWorkoutReducer, undefined, getInitialStoreState);
    const [wrapUpSummary, setWrapUpSummary] = useState<WorkoutWrapUpSummary | null>(null);
    const hydratedRef = useRef(false);
    const lastPersistedRef = useRef<string>('');
    const ownerRef = useRef<string | null>(null);

    useEffect(() => {
        if (authLoading) return;
        ownerRef.current = null;
        lastPersistedRef.current = '';
        let cancelled = false;

        (async () => {
            if (!user?.id) {
                dispatch({ type: 'DISCARD_WORKOUT' });
                setWrapUpSummary(null);
                hydratedRef.current = true;
                return;
            }

            const persisted = await loadPersistedWorkoutState(user.id);
            if (cancelled) return;
            if (persisted?.workout) {
                dispatch({
                    type: 'HYDRATE',
                    payload: {
                        ...persisted,
                        presentation: 'minimized',
                        scrollTargetExerciseId: null,
                    },
                });
            } else {
                dispatch({ type: 'DISCARD_WORKOUT' });
            }
            ownerRef.current = user.id;
            hydratedRef.current = true;
        })();

        return () => {
            cancelled = true;
        };
    }, [authLoading, user?.id]);

    useEffect(() => {
        if (!state.isHydrated || !user?.id || ownerRef.current !== user.id) return;

        const payload = {
            workout: state.workout,
            presentation: state.presentation,
            restTimer: state.restTimer,
            settings: state.settings,
        };
        const serialized = JSON.stringify(payload);
        if (serialized === lastPersistedRef.current) return;
        lastPersistedRef.current = serialized;
        persistWorkoutState(state, user.id);
    }, [
        state.isHydrated,
        state.workout,
        state.presentation,
        state.restTimer,
        state.settings,
        user?.id,
    ]);

    const startWorkout = useCallback(
        (options?: { title?: string; exercises?: WorkoutExercise[] }) => {
            void (async () => {
                const exercises = options?.exercises?.length
                    ? await withLastPerformance(options.exercises, user?.id)
                    : options?.exercises;
                dispatch({
                    type: 'START_WORKOUT',
                    payload: { ...options, exercises },
                });
            })();
        },
        [user?.id]
    );

    const setPresentation = useCallback((presentation: OverlayPresentation) => {
        dispatch({ type: 'SET_PRESENTATION', payload: presentation });
    }, []);

    const minimize = useCallback(() => setPresentation('minimized'), [setPresentation]);
    const expand = useCallback(() => setPresentation('fullscreen'), [setPresentation]);
    const dismiss = useCallback(() => setPresentation('dismissed'), [setPresentation]);

    const updateTitle = useCallback((title: string) => {
        dispatch({ type: 'UPDATE_TITLE', payload: title });
    }, []);

    const addExercises = useCallback(
        async (items: CatalogExercise[]) => {
            const enriched = await Promise.all(
                items.map(async (item) => ({
                    ...item,
                    previousSets:
                        item.previousSets ??
                        (await getLastExercisePreviousSets(item.exerciseId, item.name, user?.id)),
                }))
            );
            dispatch({ type: 'ADD_EXERCISES', payload: enriched });
        },
        [user?.id]
    );

    const removeExercise = useCallback((exerciseId: string) => {
        dispatch({ type: 'REMOVE_EXERCISE', payload: { exerciseId } });
    }, []);

    const updateExerciseNote = useCallback((exerciseId: string, note: string) => {
        dispatch({ type: 'UPDATE_EXERCISE_NOTE', payload: { exerciseId, note } });
    }, []);

    const updateRestSeconds = useCallback((exerciseId: string, restSeconds: number) => {
        dispatch({ type: 'UPDATE_REST_SECONDS', payload: { exerciseId, restSeconds } });
    }, []);

    const addSet = useCallback((exerciseId: string) => {
        dispatch({ type: 'ADD_SET', payload: { exerciseId } });
    }, []);

    const addWarmupSets = useCallback((exerciseId: string) => {
        dispatch({ type: 'ADD_WARMUP_SETS', payload: { exerciseId } });
    }, []);

    const updateSet = useCallback(
        (
            exerciseId: string,
            setId: string,
            patch: Partial<{ weight: string; reps: string; rpe: string }>
        ) => {
            dispatch({ type: 'UPDATE_SET', payload: { exerciseId, setId, patch } });
        },
        []
    );

    const toggleSetComplete = useCallback((exerciseId: string, setId: string) => {
        dispatch({ type: 'TOGGLE_SET_COMPLETE', payload: { exerciseId, setId, now: Date.now() } });
    }, []);

    const removeSet = useCallback((exerciseId: string, setId: string) => {
        dispatch({ type: 'REMOVE_SET', payload: { exerciseId, setId } });
    }, []);

    const changeSetType = useCallback((exerciseId: string, setId: string, setType: WorkoutSetType) => {
        dispatch({ type: 'CHANGE_SET_TYPE', payload: { exerciseId, setId, setType } });
    }, []);

    const applyPreviousSet = useCallback((exerciseId: string, setId: string) => {
        dispatch({ type: 'APPLY_PREVIOUS_SET', payload: { exerciseId, setId } });
    }, []);

    const addToSuperset = useCallback((exerciseIds: string[]) => {
        dispatch({ type: 'ADD_TO_SUPERSET', payload: { exerciseIds } });
    }, []);

    const setDefaultRestSeconds = useCallback((restSeconds: number) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { defaultRestSeconds: restSeconds } });
        if (restSeconds <= 0) {
            dispatch({ type: 'CLEAR_REST_TIMER' });
        }
    }, []);

    const startRestTimer = useCallback((durationSeconds?: number) => {
        if (!state.settings.restTimerEnabled) return false;
        const seconds = durationSeconds ?? state.settings.defaultRestSeconds ?? 60;
        if (seconds <= 0) return false;
        const current = state.workout ? getCurrentExercise(state.workout) : null;
        dispatch({
            type: 'START_REST_TIMER',
            payload: createManualRestTimer(seconds, current?.id ?? 'manual'),
        });
        return true;
    }, [state.settings.defaultRestSeconds, state.settings.restTimerEnabled, state.workout]);

    const adjustRestTimer = useCallback((deltaSeconds: number) => {
        dispatch({ type: 'ADJUST_REST_TIMER', payload: { deltaSeconds, now: Date.now() } });
    }, []);

    const skipRestTimer = useCallback(() => {
        dispatch({ type: 'SKIP_REST_TIMER' });
    }, []);

    const clearScrollTarget = useCallback(() => {
        dispatch({ type: 'CLEAR_SCROLL_TARGET' });
    }, []);

    const finishWorkout = useCallback(async () => {
        const workout = state.workout;
        const hasExercises = (workout?.exercises.length ?? 0) > 0;

        if (!hasExercises) {
            dispatch({ type: 'DISCARD_WORKOUT' });
            setWrapUpSummary(null);
            lastPersistedRef.current = '';
            await clearPersistedWorkoutState(user?.id);
            return;
        }

        dispatch({ type: 'FINISH_WORKOUT' });
        setWrapUpSummary(null);
        lastPersistedRef.current = '';
        await clearPersistedWorkoutState(user?.id);
    }, [state.workout, user?.id]);

    // Ends the current workout immediately (e.g. on logout). A workout that has
    // exercises is saved to history; an empty workout is discarded so it never
    // shows up in the completed-workouts list.
    const endActiveWorkout = useCallback(async () => {
        const workout = state.workout;
        const hasExercises = (workout?.exercises.length ?? 0) > 0;

        if (workout && hasExercises) {
            try {
                const summary = buildWrapUpSummary(workout, state.settings);
                await saveCompletedWorkout(summary, user?.id);
            } catch (error) {
                console.warn('[ActiveWorkout] Failed to save workout while ending', error);
            }
        }

        dispatch({ type: hasExercises ? 'FINISH_WORKOUT' : 'DISCARD_WORKOUT' });
        setWrapUpSummary(null);
        lastPersistedRef.current = '';
        await clearPersistedWorkoutState(user?.id);
    }, [state.workout, state.settings, user?.id]);

    const requestWrapUp = useCallback(() => {
        const workout = state.workout;
        if (!workout || workout.exercises.length === 0) return null;

        const summary = buildWrapUpSummary(workout, state.settings);
        setWrapUpSummary(summary);
        dispatch({ type: 'SET_PRESENTATION', payload: 'dismissed' });
        return summary;
    }, [state.workout, state.settings]);

    const commitFinishWorkout = useCallback(async () => {
        dispatch({ type: 'FINISH_WORKOUT' });
        setWrapUpSummary(null);
        lastPersistedRef.current = '';
        await clearPersistedWorkoutState(user?.id);
    }, [user?.id]);

    const clearWrapUp = useCallback(() => {
        setWrapUpSummary(null);
    }, []);

    const value = useMemo<ActiveWorkoutContextValue>(
        () => ({
            state,
            dispatch,
            startWorkout,
            setPresentation,
            minimize,
            expand,
            dismiss,
            updateTitle,
            addExercises,
            removeExercise,
            updateExerciseNote,
            updateRestSeconds,
            addSet,
            addWarmupSets,
            updateSet,
            toggleSetComplete,
            removeSet,
            changeSetType,
            applyPreviousSet,
            addToSuperset,
            startRestTimer,
            setDefaultRestSeconds,
            adjustRestTimer,
            skipRestTimer,
            clearScrollTarget,
            finishWorkout,
            endActiveWorkout,
            wrapUpSummary,
            requestWrapUp,
            commitFinishWorkout,
            clearWrapUp,
        }),
        [
            state,
            startWorkout,
            setPresentation,
            minimize,
            expand,
            dismiss,
            updateTitle,
            addExercises,
            removeExercise,
            updateExerciseNote,
            updateRestSeconds,
            addSet,
            addWarmupSets,
            updateSet,
            toggleSetComplete,
            removeSet,
            changeSetType,
            applyPreviousSet,
            addToSuperset,
            startRestTimer,
            setDefaultRestSeconds,
            adjustRestTimer,
            skipRestTimer,
            clearScrollTarget,
            finishWorkout,
            endActiveWorkout,
            wrapUpSummary,
            requestWrapUp,
            commitFinishWorkout,
            clearWrapUp,
        ]
    );

    return <ActiveWorkoutContext.Provider value={value}>{children}</ActiveWorkoutContext.Provider>;
};

export function useActiveWorkout(): ActiveWorkoutContextValue {
    const ctx = useContext(ActiveWorkoutContext);
    if (!ctx) {
        throw new Error('useActiveWorkout must be used within ActiveWorkoutProvider');
    }
    return ctx;
}
