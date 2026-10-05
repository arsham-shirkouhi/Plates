import { FoodItem } from '../services/foodService';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Fill / wash / selected text — same hues as the food-log meal cards. */
export const MEAL_TAG_COLORS: Record<
    MealType,
    { fill: string; wash: string; ink: string }
> = {
    breakfast: { fill: '#F9C117', wash: '#FFF6C8', ink: '#252525' },
    lunch: { fill: '#FF8C42', wash: '#FFE6D4', ink: '#FFFFFF' },
    dinner: { fill: '#526EFF', wash: '#EAEEFF', ink: '#FFFFFF' },
    snack: { fill: '#22C55E', wash: '#D8FCE6', ink: '#FFFFFF' },
};

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
