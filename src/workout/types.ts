export type WorkoutSetType = 'normal' | 'warmup' | 'failure' | 'drop';

export type OverlayPresentation = 'fullscreen' | 'minimized' | 'dismissed';

export interface PreviousSetSnapshot {
    weight: number;
    reps: number;
}

export interface WorkoutSet {
    id: string;
    type: WorkoutSetType;
    weight: string;
    reps: string;
    rpe?: string;
    completed: boolean;
    previous?: PreviousSetSnapshot;
}

export interface WorkoutExercise {
    id: string;
    exerciseId: string;
    name: string;
    thumbnailUrl?: string;
    supersetId?: string;
    note: string;
    restSeconds: number;
    sets: WorkoutSet[];
}

export interface Workout {
    id: string;
    title: string;
    startedAt: string;
    notes: string;
    exercises: WorkoutExercise[];
}

export interface RestTimerState {
    exerciseId: string;
    setId: string;
    startedAt: number;
    endsAt: number;
    durationSeconds: number;
}

export interface WorkoutSettings {
    excludeWarmupFromVolume: boolean;
    excludeWarmupFromSetCount: boolean;
    showRpeColumn: boolean;
    restTimerSoundEnabled: boolean;
}

export interface ActiveWorkoutStoreState {
    workout: Workout | null;
    presentation: OverlayPresentation;
    restTimer: RestTimerState | null;
    settings: WorkoutSettings;
    scrollTargetExerciseId: string | null;
    isHydrated: boolean;
}

export type ActiveWorkoutAction =
    | { type: 'HYDRATE'; payload: Partial<ActiveWorkoutStoreState> }
    | { type: 'START_WORKOUT'; payload: { title?: string; exercises?: WorkoutExercise[] } }
    | { type: 'RESTORE_WORKOUT'; payload: Workout }
    | { type: 'SET_PRESENTATION'; payload: OverlayPresentation }
    | { type: 'UPDATE_TITLE'; payload: string }
    | { type: 'UPDATE_WORKOUT_NOTES'; payload: string }
    | { type: 'ADD_EXERCISES'; payload: CatalogExercise[] }
    | { type: 'REMOVE_EXERCISE'; payload: { exerciseId: string } }
    | { type: 'UPDATE_EXERCISE_NOTE'; payload: { exerciseId: string; note: string } }
    | { type: 'UPDATE_REST_SECONDS'; payload: { exerciseId: string; restSeconds: number } }
    | { type: 'ADD_SET'; payload: { exerciseId: string } }
    | { type: 'UPDATE_SET'; payload: { exerciseId: string; setId: string; patch: Partial<Pick<WorkoutSet, 'weight' | 'reps' | 'rpe'>> } }
    | { type: 'TOGGLE_SET_COMPLETE'; payload: { exerciseId: string; setId: string; now: number } }
    | { type: 'REMOVE_SET'; payload: { exerciseId: string; setId: string } }
    | { type: 'CHANGE_SET_TYPE'; payload: { exerciseId: string; setId: string; setType: WorkoutSetType } }
    | { type: 'APPLY_PREVIOUS_SET'; payload: { exerciseId: string; setId: string } }
    | { type: 'ADD_TO_SUPERSET'; payload: { exerciseIds: string[]; supersetId?: string } }
    | { type: 'START_REST_TIMER'; payload: RestTimerState }
    | { type: 'ADJUST_REST_TIMER'; payload: { deltaSeconds: number; now: number } }
    | { type: 'SKIP_REST_TIMER' }
    | { type: 'CLEAR_REST_TIMER' }
    | { type: 'CLEAR_SCROLL_TARGET' }
    | { type: 'FINISH_WORKOUT' }
    | { type: 'DISCARD_WORKOUT' }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<WorkoutSettings> };

export interface CatalogExercise {
    exerciseId: string;
    name: string;
    thumbnailUrl?: string;
    previousSets?: PreviousSetSnapshot[];
}
