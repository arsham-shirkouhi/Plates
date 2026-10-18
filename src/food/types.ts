import { FoodItem } from '../services/foodService';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export const MEAL_CHIP_FILL = '#526EFF';
export const MEAL_CHIP_WASH = '#EAEEFF';

export const MEAL_TAG_ICONS: Record<MealType, 'sunny-outline' | 'partly-sunny-outline' | 'moon-outline' | 'cafe-outline'> = {
    breakfast: 'sunny-outline',
    lunch: 'partly-sunny-outline',
    dinner: 'moon-outline',
    snack: 'cafe-outline',
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
