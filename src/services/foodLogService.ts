import { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { FoodItem } from './foodService';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodLogEntry {
    id: string;
    user_id: string;
    log_date: string;
    meal: MealType | string;
    food_id: string | null;
    food_name: string;
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    portion: string | null;
    created_at: string;
    updated_at: string;
}

const getTodayDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export const getFoodLogEntriesForDate = async (user: User, date?: string): Promise<FoodLogEntry[]> => {
    const logDate = date || getTodayDateString();
    const { data, error } = await supabase
        .from('food_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('log_date', logDate)
        .order('created_at', { ascending: false });

    if (error) {
        throw error;
    }

    return (data || []) as FoodLogEntry[];
};

export const createFoodLogEntry = async (
    user: User,
    params: {
        meal: MealType;
        food: FoodItem;
        portion?: string;
        loggedAt?: string;
        date?: string;
    }
): Promise<FoodLogEntry> => {
    const logDate = params.date || getTodayDateString();
    const createdAt = params.loggedAt || new Date().toISOString();

    const { data, error } = await supabase
        .from('food_logs')
        .insert({
            user_id: user.id,
            log_date: logDate,
            meal: params.meal,
            food_id: params.food.id,
            food_name: params.food.name,
            calories: params.food.calories,
            protein: params.food.protein,
            carbs: params.food.carbs,
            fats: params.food.fats,
            portion: params.portion || '1 serving',
            created_at: createdAt,
        })
        .select('*')
        .single();

    if (error) {
        throw error;
    }

    return data as FoodLogEntry;
};

export const deleteFoodLogEntry = async (user: User, entryId: string): Promise<void> => {
    const { error } = await supabase
        .from('food_logs')
        .delete()
        .eq('id', entryId)
        .eq('user_id', user.id);

    if (error) {
        throw error;
    }
};
