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
import { buildWrapUpSummary } from '../workout/workoutSelectors';
import {
    clearPersistedWorkoutState,
    loadPersistedWorkoutState,
    persistWorkoutState,
} from '../workout/workoutPersistence';
import { getLastExercisePreviousSets, saveCompletedWorkout } from '../services/workoutHistoryService';
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
    const { user } = useAuth();
    const [state, dispatch] = useReducer(activeWorkoutReducer, undefined, getInitialStoreState);
    const [wrapUpSummary, setWrapUpSummary] = useState<WorkoutWrapUpSummary | null>(null);
    const hydratedRef = useRef(false);
    const lastPersistedRef = useRef<string>('');
    const prevUserIdRef = useRef<string | null>(user?.id ?? null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            const persisted = await loadPersistedWorkoutState();
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
                dispatch({ type: 'HYDRATE', payload: {} });
            }
            hydratedRef.current = true;
        })();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!state.isHydrated) return;

        const payload = {
            workout: state.workout,
            presentation: state.presentation,
            restTimer: state.restTimer,
            settings: state.settings,
        };
        const serialized = JSON.stringify(payload);
        if (serialized === lastPersistedRef.current) return;
        lastPersistedRef.current = serialized;
        persistWorkoutState(state);
    }, [
        state.isHydrated,
        state.workout,
        state.presentation,
        state.restTimer,
        state.settings,
    ]);

    // The active workout belongs to the logged-in session only. Keep it running for
    // the whole session, but once the user logs out clear it (and its persisted copy)
    // so the minimized widget doesn't linger over the login screen or into another account.
    useEffect(() => {
        const currentUserId = user?.id ?? null;
        const previousUserId = prevUserIdRef.current;
        prevUserIdRef.current = currentUserId;

        const loggedOut = !!previousUserId && !currentUserId;
        if (!loggedOut) return;

        dispatch({ type: 'DISCARD_WORKOUT' });
        setWrapUpSummary(null);
        lastPersistedRef.current = '';
        void clearPersistedWorkoutState();
    }, [user?.id]);

    const startWorkout = useCallback(
        (options?: { title?: string; exercises?: WorkoutExercise[] }) => {
            dispatch({ type: 'START_WORKOUT', payload: options ?? {} });
        },
        []
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
            await clearPersistedWorkoutState();
            return;
        }

        dispatch({ type: 'FINISH_WORKOUT' });
        setWrapUpSummary(null);
        lastPersistedRef.current = '';
        await clearPersistedWorkoutState();
    }, [state.workout]);

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
        await clearPersistedWorkoutState();
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
        await clearPersistedWorkoutState();
    }, []);

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
            updateSet,
            toggleSetComplete,
            removeSet,
            changeSetType,
            applyPreviousSet,
            addToSuperset,
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
            updateSet,
            toggleSetComplete,
            removeSet,
            changeSetType,
            applyPreviousSet,
            addToSuperset,
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
