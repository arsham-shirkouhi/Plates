import AsyncStorage from '@react-native-async-storage/async-storage';
import { SerializedLoggedFoodEntry } from './types';

export const FOOD_LOG_STORAGE_PREFIX = '@plates/food-log/v1';

export function foodLogStorageKey(userId: string, date: string): string {
    return `${FOOD_LOG_STORAGE_PREFIX}/${userId}/${date}`;
}

/**
 * Local persistence for today's food log.
 * Swap this module for a Supabase-backed implementation later
 * without changing FoodLogContext callers.
 */
export async function loadFoodLog(
    userId: string,
    date: string
): Promise<SerializedLoggedFoodEntry[]> {
    try {
        const raw = await AsyncStorage.getItem(foodLogStorageKey(userId, date));
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        console.warn('[foodLogPersistence] Failed to load food log', error);
        return [];
    }
}

export async function persistFoodLog(
    userId: string,
    date: string,
    entries: SerializedLoggedFoodEntry[]
): Promise<void> {
    try {
        await AsyncStorage.setItem(foodLogStorageKey(userId, date), JSON.stringify(entries));
    } catch (error) {
        console.warn('[foodLogPersistence] Failed to persist food log', error);
    }
}

export async function clearFoodLog(userId: string, date: string): Promise<void> {
    try {
        await AsyncStorage.removeItem(foodLogStorageKey(userId, date));
    } catch (error) {
        console.warn('[foodLogPersistence] Failed to clear food log', error);
    }
}
