import { FoodItem } from '../services/foodService';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface LoggedFoodEntry {
    id: string;
    food: FoodItem;
    loggedAt: Date;
    meal: MealType;
    portion?: string;
}

export interface MacroTotals {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
}

export const EMPTY_MACRO_TOTALS: MacroTotals = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
};

export interface SerializedLoggedFoodEntry {
    id: string;
    food: FoodItem;
    loggedAt: string;
    meal: MealType;
    portion?: string;
}

export interface DashboardFoodItem {
    name: string;
    calories: number;
    time: string;
}
