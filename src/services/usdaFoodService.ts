import { supabase, isSupabaseConfigured } from './supabase';
import { FoodItem } from './foodService';

type UsdaFoodSource = 'usda_fndds' | 'usda_foundation' | 'usda_branded';

interface UsdaFoodPayload {
    id: string;
    source: UsdaFoodSource;
    name: string;
    brand?: string;
    barcode?: string;
    servingGrams: number;
    servingLabel: string;
    nutrients: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    };
}

interface UsdaFoodResponse {
    foods?: UsdaFoodPayload[];
    error?: string;
}

export class UsdaFoodServiceError extends Error {
    constructor(message: string, public readonly code: 'not-configured' | 'not-ready' | 'network' | 'invalid-response') {
        super(message);
        this.name = 'UsdaFoodServiceError';
    }
}

function toFoodItem(food: UsdaFoodPayload): FoodItem {
    const sourceLabel = food.source === 'usda_branded' ? 'USDA branded' : 'USDA';
    return {
        id: `${food.source}:${food.id}`,
        name: food.brand ? `${food.brand} ${food.name}` : food.name,
        calories: food.nutrients.calories,
        protein: food.nutrients.protein,
        carbs: food.nutrients.carbs,
        fats: food.nutrients.fats,
        source: sourceLabel,
        sourceFoodId: food.id,
        barcode: food.barcode,
        servingGrams: food.servingGrams,
        servingLabel: food.servingLabel,
    };
}

async function invokeUsdaFood(body: Record<string, unknown>): Promise<FoodItem[]> {
    if (!isSupabaseConfigured()) {
        throw new UsdaFoodServiceError('Supabase is not configured on this device.', 'not-configured');
    }

    const { data, error } = await supabase.functions.invoke<UsdaFoodResponse>('usda-food', { body });
    if (error) {
        throw new UsdaFoodServiceError('USDA food search is not available yet. Please try again shortly.', 'network');
    }
    if (!data || !Array.isArray(data.foods)) {
        throw new UsdaFoodServiceError(data?.error ?? 'USDA returned an invalid food response.', 'invalid-response');
    }

    return data.foods.map(toFoodItem);
}

export async function searchUsdaFoods(query: string): Promise<FoodItem[]> {
    const normalized = query.trim();
    if (!normalized) return [];
    return invokeUsdaFood({ action: 'search', query: normalized });
}

export async function lookupUsdaBarcode(barcode: string): Promise<FoodItem | null> {
    const normalized = barcode.replace(/[^0-9]/g, '');
    if (normalized.length < 8) {
        throw new UsdaFoodServiceError('That barcode is not a valid UPC or EAN.', 'invalid-response');
    }
    const foods = await invokeUsdaFood({ action: 'barcode', barcode: normalized });
    return foods[0] ?? null;
}

/**
 * Identifies visible foods with vision, then gets their nutrient values from
 * USDA. Results are estimates and must be reviewed before logging.
 */
export async function analyzeFoodPhoto(imageDataUrl: string): Promise<FoodItem[]> {
    if (!imageDataUrl.startsWith('data:image/')) {
        throw new UsdaFoodServiceError('Please take or select a food photo first.', 'invalid-response');
    }
    return invokeUsdaFood({ action: 'photo', imageDataUrl });
}
