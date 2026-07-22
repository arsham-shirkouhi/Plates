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

interface ActiveWorkoutContextValue {
    state: ActiveWorkoutStoreState;
    dispatch: React.Dispatch<ActiveWorkoutAction>;
    startWorkout: (options?: { title?: string; exercises?: WorkoutExercise[] }) => void;
    setPresentation: (presentation: OverlayPresentation) => void;
    minimize: () => void;
    expand: () => void;
    dismiss: () => void;
    updateTitle: (title: string) => void;
    addExercises: (items: CatalogExercise[]) => void;
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
    wrapUpSummary: WorkoutWrapUpSummary | null;
    requestWrapUp: () => WorkoutWrapUpSummary | null;
    commitFinishWorkout: () => Promise<void>;
    clearWrapUp: () => void;
}

const ActiveWorkoutContext = createContext<ActiveWorkoutContextValue | null>(null);

export const ActiveWorkoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [state, dispatch] = useReducer(activeWorkoutReducer, undefined, getInitialStoreState);
    const [wrapUpSummary, setWrapUpSummary] = useState<WorkoutWrapUpSummary | null>(null);
    const hydratedRef = useRef(false);
    const lastPersistedRef = useRef<string>('');

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

    const addExercises = useCallback((items: CatalogExercise[]) => {
        dispatch({ type: 'ADD_EXERCISES', payload: items });
    }, []);

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
