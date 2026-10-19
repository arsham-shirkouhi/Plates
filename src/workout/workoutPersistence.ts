import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActiveWorkoutStoreState } from './types';
import { WORKOUT_STORAGE_KEY } from './constants';

function storageKey(userId: string): string {
    return `${WORKOUT_STORAGE_KEY}:${userId}`;
}

export async function loadPersistedWorkoutState(
    userId: string
): Promise<Partial<ActiveWorkoutStoreState> | null> {
    try {
        const scoped = await AsyncStorage.getItem(storageKey(userId));
        if (scoped) return JSON.parse(scoped) as Partial<ActiveWorkoutStoreState>;

        // Older builds stored one workout for the whole phone. Claim it for this account.
        const legacy = await AsyncStorage.getItem(WORKOUT_STORAGE_KEY);
        if (!legacy) return null;
        await AsyncStorage.setItem(storageKey(userId), legacy);
        await AsyncStorage.removeItem(WORKOUT_STORAGE_KEY);
        return JSON.parse(legacy) as Partial<ActiveWorkoutStoreState>;
    } catch (error) {
        console.warn('[workoutPersistence] Failed to load active workout', error);
        return null;
    }
}

export async function persistWorkoutState(
    state: ActiveWorkoutStoreState,
    userId: string
): Promise<void> {
    try {
        if (!state.workout) {
            await AsyncStorage.removeItem(storageKey(userId));
            return;
        }
        const payload: Partial<ActiveWorkoutStoreState> = {
            workout: state.workout,
            presentation: state.presentation,
            restTimer: state.restTimer,
            settings: state.settings,
        };
        await AsyncStorage.setItem(storageKey(userId), JSON.stringify(payload));
    } catch (error) {
        console.warn('[workoutPersistence] Failed to persist active workout', error);
    }
}

export async function clearPersistedWorkoutState(userId?: string | null): Promise<void> {
    try {
        const keys = [WORKOUT_STORAGE_KEY];
        if (userId) keys.push(storageKey(userId));
        await AsyncStorage.multiRemove(keys);
    } catch (error) {
        console.warn('[workoutPersistence] Failed to clear active workout', error);
    }
}
