import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from 'react';
import { FoodItem } from '../services/foodService';
import { getTodayDateString, saveDailyMacroLog, updateStreak } from '../services/userService';
import { useAuth } from './AuthContext';
import { loadFoodLog, persistFoodLog } from '../food/foodLogPersistence';
import {
    deserializeFoodEntry,
    serializeFoodEntry,
    suggestMealForNow,
    sumMacros,
    toDashboardItems,
} from '../food/foodLogSelectors';
import { useTickingNow } from '../food/useTickingNow';
import {
    DashboardFoodItem,
    EMPTY_MACRO_TOTALS,
    LoggedFoodEntry,
    MacroTotals,
    MealType,
} from '../food/types';

interface AddFoodOptions {
    meal?: MealType | null;
    portion?: string;
}

interface UpdateFoodOptions {
    food: FoodItem;
    meal: MealType;
    portion?: string;
}

interface FoodLogContextValue {
    entries: LoggedFoodEntry[];
    consumed: MacroTotals;
    dashboardItems: DashboardFoodItem[];
    hydrated: boolean;
    now: number;
    addFood: (food: FoodItem, options?: AddFoodOptions) => LoggedFoodEntry;
    updateFood: (entryId: string, updates: UpdateFoodOptions) => void;
    removeFood: (entryId: string) => void;
    getEntry: (entryId: string) => LoggedFoodEntry | undefined;
}

const FoodLogContext = createContext<FoodLogContextValue | undefined>(undefined);

function createEntryId(): string {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const FoodLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [entries, setEntries] = useState<LoggedFoodEntry[]>([]);
    const [hydrated, setHydrated] = useState(false);
    const now = useTickingNow();

    useEffect(() => {
        let cancelled = false;

        const hydrate = async () => {
            if (!user) {
                setEntries([]);
                setHydrated(true);
                return;
            }

            setHydrated(false);
            const loaded = await loadFoodLog(user.id, getTodayDateString());
            if (cancelled) return;
            setEntries(loaded.map(deserializeFoodEntry));
            setHydrated(true);
        };

        void hydrate();
        return () => {
            cancelled = true;
        };
    }, [user?.id]);

    const persistAndSync = useCallback(
        async (next: LoggedFoodEntry[]) => {
            if (!user) return;

            const date = getTodayDateString();
            await persistFoodLog(user.id, date, next.map(serializeFoodEntry));

            try {
                const totals = sumMacros(next);
                await saveDailyMacroLog(user, totals, date);
                if (next.length > 0) {
                    await updateStreak(user, date);
                }
            } catch (error) {
                console.warn('[FoodLog] Failed to sync daily macros to Supabase', error);
            }
        },
        [user]
    );

    const commit = useCallback(
        (updater: (prev: LoggedFoodEntry[]) => LoggedFoodEntry[]) => {
            setEntries((prev) => {
                const next = updater(prev);
                void persistAndSync(next);
                return next;
            });
        },
        [persistAndSync]
    );

    const addFood = useCallback(
        (food: FoodItem, options?: AddFoodOptions): LoggedFoodEntry => {
            const entry: LoggedFoodEntry = {
                id: createEntryId(),
                food,
                loggedAt: new Date(),
                meal: options?.meal ?? suggestMealForNow(),
                portion: options?.portion ?? food.servingLabel ?? '1 serving',
            };
            commit((prev) => [entry, ...prev]);
            return entry;
        },
        [commit]
    );

    const updateFood = useCallback(
        (entryId: string, updates: UpdateFoodOptions) => {
            commit((prev) =>
                prev.map((entry) =>
                    entry.id === entryId
                        ? {
                              ...entry,
                              food: updates.food,
                              meal: updates.meal,
                              portion: updates.portion ?? entry.portion,
                          }
                        : entry
                )
            );
        },
        [commit]
    );

    const removeFood = useCallback(
        (entryId: string) => {
            commit((prev) => prev.filter((entry) => entry.id !== entryId));
        },
        [commit]
    );

    const getEntry = useCallback(
        (entryId: string) => entries.find((entry) => entry.id === entryId),
        [entries]
    );

    const consumed = useMemo(() => sumMacros(entries), [entries]);
    const dashboardItems = useMemo(() => toDashboardItems(entries, 3, now), [entries, now]);

    const value = useMemo(
        () => ({
            entries,
            consumed,
            dashboardItems,
            hydrated,
            now,
            addFood,
            updateFood,
            removeFood,
            getEntry,
        }),
        [entries, consumed, dashboardItems, hydrated, now, addFood, updateFood, removeFood, getEntry]
    );

    return <FoodLogContext.Provider value={value}>{children}</FoodLogContext.Provider>;
};

export const useFoodLog = (): FoodLogContextValue => {
    const context = useContext(FoodLogContext);
    if (!context) {
        throw new Error('useFoodLog must be used within FoodLogProvider');
    }
    return context;
};

export { EMPTY_MACRO_TOTALS };
