/**
 * Food Database Service
 * Connects to Supabase `food_data` table for search and quick add
 */

import { supabase } from './supabase';

export interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein: number; // grams
    carbs: number; // grams
    fats: number; // grams
}

// Shape of the subset of columns we care about from public.food_data
type FoodDataRow = {
    food: string;
    Calories: number | null;
    Protein: number | null;
    Carbohydrates: number | null;
    Fat: number | null;
};

// Fallback database used if Supabase is unavailable
const FALLBACK_FOOD_DATABASE: FoodItem[] = [
    // Breakfast items
    { id: 'scrambled eggs', name: 'scrambled eggs', calories: 140, protein: 12, carbs: 1, fats: 10 },
    { id: 'whole wheat toast', name: 'whole wheat toast', calories: 80, protein: 3, carbs: 15, fats: 1 },
    { id: 'banana', name: 'banana', calories: 105, protein: 1, carbs: 27, fats: 0 },
    { id: 'greek yogurt', name: 'greek yogurt', calories: 100, protein: 17, carbs: 6, fats: 0 },
    { id: 'oatmeal', name: 'oatmeal', calories: 150, protein: 5, carbs: 27, fats: 3 },
    { id: 'coffee', name: 'coffee', calories: 5, protein: 0, carbs: 0, fats: 0 },

    // Malaysian foods
    { id: 'nasi lemak', name: 'nasi lemak', calories: 544, protein: 12, carbs: 65, fats: 24 },
    { id: 'roti canai', name: 'roti canai', calories: 300, protein: 8, carbs: 40, fats: 12 },
    { id: 'teh tarik', name: 'teh tarik', calories: 130, protein: 2, carbs: 25, fats: 2 },
    { id: 'kaya toast', name: 'kaya toast', calories: 230, protein: 5, carbs: 35, fats: 8 },
    { id: 'chicken rice', name: 'chicken rice', calories: 605, protein: 35, carbs: 65, fats: 18 },
    { id: 'char kway teow', name: 'char kway teow', calories: 744, protein: 15, carbs: 85, fats: 35 },

    // Protein sources
    { id: 'grilled chicken breast', name: 'grilled chicken breast', calories: 165, protein: 31, carbs: 0, fats: 3.6 },
    { id: 'salmon fillet', name: 'salmon fillet', calories: 206, protein: 22, carbs: 0, fats: 12 },
    { id: 'tofu', name: 'tofu', calories: 76, protein: 8, carbs: 2, fats: 4 },
    { id: 'chicken thigh', name: 'chicken thigh', calories: 209, protein: 26, carbs: 0, fats: 10 },

    // Carbs
    { id: 'white rice', name: 'white rice', calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
    { id: 'brown rice', name: 'brown rice', calories: 112, protein: 2.6, carbs: 23, fats: 0.9 },
    { id: 'sweet potato', name: 'sweet potato', calories: 103, protein: 2, carbs: 24, fats: 0 },
    { id: 'quinoa', name: 'quinoa', calories: 120, protein: 4.4, carbs: 22, fats: 1.9 },

    // Vegetables
    { id: 'broccoli', name: 'broccoli', calories: 55, protein: 3, carbs: 11, fats: 0.6 },
    { id: 'spinach', name: 'spinach', calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4 },
    { id: 'carrots', name: 'carrots', calories: 41, protein: 0.9, carbs: 10, fats: 0.2 },

    // Fruits
    { id: 'apple', name: 'apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3 },
    { id: 'orange', name: 'orange', calories: 62, protein: 1.2, carbs: 15, fats: 0.2 },
    { id: 'strawberries', name: 'strawberries', calories: 49, protein: 1, carbs: 12, fats: 0.5 },

    // Snacks
    { id: 'almonds', name: 'almonds', calories: 164, protein: 6, carbs: 6, fats: 14 },
    { id: 'protein bar', name: 'protein bar', calories: 200, protein: 20, carbs: 20, fats: 6 },
    { id: 'trail mix', name: 'trail mix', calories: 150, protein: 4, carbs: 12, fats: 10 },
];

const mapRowToFoodItem = (row: FoodDataRow): FoodItem => ({
    id: row.food,
    name: row.food,
    calories: Number(row.Calories) || 0,
    protein: Number(row.Protein) || 0,
    carbs: Number(row.Carbohydrates) || 0,
    fats: Number(row.Fat) || 0,
});

/**
 * Get quick add items (suggested/common foods) from Supabase `food_data`.
 * Falls back to a small in-memory list if the query fails.
 */
export const getQuickAddItems = async (): Promise<FoodItem[]> => {
    // Names we want to show as quick-add if available in the table
    const commonFoods = [
        'scrambled eggs',
        'banana',
        'greek yogurt',
        'grilled chicken breast',
        'white rice',
        'broccoli',
        'apple',
        'almonds',
    ];

    try {
        const { data, error } = await supabase
            .from('food_data')
            .select('food, Calories, Protein, Carbohydrates, Fat')
            .in('food', commonFoods)
            .limit(commonFoods.length);

        if (error || !data) {
            throw error;
        }

        // Keep the order defined in commonFoods
        const mapped = (data as FoodDataRow[]).map(mapRowToFoodItem);
        const byName = new Map(mapped.map((item) => [item.name.toLowerCase(), item]));

        return commonFoods
            .map((name) => byName.get(name.toLowerCase()))
            .filter((item): item is FoodItem => !!item);
    } catch {
        // Fallback to local list if Supabase is unavailable
        return FALLBACK_FOOD_DATABASE.filter((item) =>
            commonFoods.includes(item.name.toLowerCase())
        );
    }
};

/**
 * Search food database in Supabase `food_data` table.
 * Uses `ilike` on the `food` column to support case-insensitive search.
 * Falls back to searching the local in-memory list on error.
 */
export const searchFoods = async (query: string): Promise<FoodItem[]> => {
    const trimmed = query.trim();
    if (!trimmed) {
        return [];
    }

    const searchTerm = `%${trimmed}%`;

    try {
        const { data, error } = await supabase
            .from('food_data')
            .select('food, Calories, Protein, Carbohydrates, Fat')
            .ilike('food', searchTerm)
            .limit(50);

        if (error || !data) {
            throw error;
        }

        return (data as FoodDataRow[]).map(mapRowToFoodItem);
    } catch {
        const lower = trimmed.toLowerCase();
        return FALLBACK_FOOD_DATABASE.filter((food) =>
            food.name.toLowerCase().includes(lower)
        ).slice(0, 20);
    }
};

/**
 * Get food by ID (food name) from Supabase, with local fallback.
 */
export const getFoodById = async (id: string): Promise<FoodItem | undefined> => {
    const trimmed = id.trim();
    if (!trimmed) {
        return undefined;
    }

    try {
        const { data, error } = await supabase
            .from('food_data')
            .select('food, Calories, Protein, Carbohydrates, Fat')
            .eq('food', trimmed)
            .single();

        if (error || !data) {
            throw error;
        }

        return mapRowToFoodItem(data as FoodDataRow);
    } catch {
        const lower = trimmed.toLowerCase();
        return FALLBACK_FOOD_DATABASE.find(
            (food) => food.id.toLowerCase() === lower || food.name.toLowerCase() === lower
        );
    }
};
