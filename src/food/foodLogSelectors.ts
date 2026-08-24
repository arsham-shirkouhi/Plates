import {
    DashboardFoodItem,
    EMPTY_MACRO_TOTALS,
    LoggedFoodEntry,
    MacroTotals,
    MealType,
    MEAL_TYPES,
    SerializedLoggedFoodEntry,
} from './types';

export function serializeFoodEntry(entry: LoggedFoodEntry): SerializedLoggedFoodEntry {
    return {
        ...entry,
        loggedAt: entry.loggedAt.toISOString(),
    };
}

export function deserializeFoodEntry(entry: SerializedLoggedFoodEntry): LoggedFoodEntry {
    return {
        ...entry,
        loggedAt: new Date(entry.loggedAt),
    };
}

export function sumMacros(entries: LoggedFoodEntry[]): MacroTotals {
    return entries.reduce(
        (acc, entry) => ({
            calories: acc.calories + (entry.food.calories || 0),
            protein: acc.protein + (entry.food.protein || 0),
            carbs: acc.carbs + (entry.food.carbs || 0),
            fats: acc.fats + (entry.food.fats || 0),
        }),
        { ...EMPTY_MACRO_TOTALS }
    );
}

export function groupFoodsByMeal(entries: LoggedFoodEntry[]): Record<MealType, LoggedFoodEntry[]> {
    return MEAL_TYPES.reduce((acc, meal) => {
        acc[meal] = entries
            .filter((entry) => entry.meal === meal)
            .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime());
        return acc;
    }, {} as Record<MealType, LoggedFoodEntry[]>);
}

export function formatTimeAgo(date: Date, now: number = Date.now()): string {
    const loggedAt = date instanceof Date ? date.getTime() : new Date(date).getTime();
    const diffMins = Math.max(0, Math.floor((now - loggedAt) / 60000));
    if (diffMins < 1) return '0m';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    return `${Math.floor(diffHours / 24)}d`;
}

export function toDashboardItems(
    entries: LoggedFoodEntry[],
    limit = 3,
    now: number = Date.now()
): DashboardFoodItem[] {
    return [...entries]
        .sort((a, b) => b.loggedAt.getTime() - a.loggedAt.getTime())
        .slice(0, limit)
        .map((entry) => ({
            name: entry.food.name,
            calories: Math.round(entry.food.calories),
            time: formatTimeAgo(entry.loggedAt, now),
        }));
}

export function suggestMealForNow(): MealType {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 17 && hour < 22) return 'dinner';
    return 'snack';
}
