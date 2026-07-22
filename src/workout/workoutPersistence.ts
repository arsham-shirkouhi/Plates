import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveWorkoutStoreState } from './types';
import { WORKOUT_STORAGE_KEY } from './constants';

export async function loadPersistedWorkoutState(): Promise<Partial<ActiveWorkoutStoreState> | null> {
    try {
        const raw = await AsyncStorage.getItem(WORKOUT_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw) as Partial<ActiveWorkoutStoreState>;
    } catch (error) {
        console.warn('[workoutPersistence] Failed to load active workout', error);
        return null;
    }
}

export async function persistWorkoutState(state: ActiveWorkoutStoreState): Promise<void> {
    try {
        if (!state.workout) {
            await AsyncStorage.removeItem(WORKOUT_STORAGE_KEY);
            return;
        }
        const payload: Partial<ActiveWorkoutStoreState> = {
            workout: state.workout,
            presentation: state.presentation,
            restTimer: state.restTimer,
            settings: state.settings,
        };
        await AsyncStorage.setItem(WORKOUT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
        console.warn('[workoutPersistence] Failed to persist active workout', error);
    }
}

export async function clearPersistedWorkoutState(): Promise<void> {
    try {
        await AsyncStorage.removeItem(WORKOUT_STORAGE_KEY);
    } catch (error) {
        console.warn('[workoutPersistence] Failed to clear active workout', error);
    }
}
