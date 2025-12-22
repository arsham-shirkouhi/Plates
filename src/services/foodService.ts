/**
 * Food Database Service
 * Provides food items for search and quick add functionality
 */

export interface FoodItem {
    id: string;
    name: string;
    calories: number;
    protein: number; // grams
    carbs: number; // grams
    fats: number; // grams
}

// Common food items database
const FOOD_DATABASE: FoodItem[] = [
    // Breakfast items
    { id: '1', name: 'scrambled eggs', calories: 140, protein: 12, carbs: 1, fats: 10 },
    { id: '2', name: 'whole wheat toast', calories: 80, protein: 3, carbs: 15, fats: 1 },
    { id: '3', name: 'banana', calories: 105, protein: 1, carbs: 27, fats: 0 },
    { id: '4', name: 'greek yogurt', calories: 100, protein: 17, carbs: 6, fats: 0 },
    { id: '5', name: 'oatmeal', calories: 150, protein: 5, carbs: 27, fats: 3 },
    { id: '6', name: 'coffee', calories: 5, protein: 0, carbs: 0, fats: 0 },

    // Malaysian foods
    { id: '7', name: 'nasi lemak', calories: 544, protein: 12, carbs: 65, fats: 24 },
    { id: '8', name: 'roti canai', calories: 300, protein: 8, carbs: 40, fats: 12 },
    { id: '9', name: 'teh tarik', calories: 130, protein: 2, carbs: 25, fats: 2 },
    { id: '10', name: 'kaya toast', calories: 230, protein: 5, carbs: 35, fats: 8 },
    { id: '11', name: 'chicken rice', calories: 605, protein: 35, carbs: 65, fats: 18 },
    { id: '12', name: 'char kway teow', calories: 744, protein: 15, carbs: 85, fats: 35 },

    // Protein sources
    { id: '13', name: 'grilled chicken breast', calories: 165, protein: 31, carbs: 0, fats: 3.6 },
    { id: '14', name: 'salmon fillet', calories: 206, protein: 22, carbs: 0, fats: 12 },
    { id: '15', name: 'tofu', calories: 76, protein: 8, carbs: 2, fats: 4 },
    { id: '16', name: 'chicken thigh', calories: 209, protein: 26, carbs: 0, fats: 10 },

    // Carbs
    { id: '17', name: 'white rice', calories: 130, protein: 2.7, carbs: 28, fats: 0.3 },
    { id: '18', name: 'brown rice', calories: 112, protein: 2.6, carbs: 23, fats: 0.9 },
    { id: '19', name: 'sweet potato', calories: 103, protein: 2, carbs: 24, fats: 0 },
    { id: '20', name: 'quinoa', calories: 120, protein: 4.4, carbs: 22, fats: 1.9 },

    // Vegetables
    { id: '21', name: 'broccoli', calories: 55, protein: 3, carbs: 11, fats: 0.6 },
    { id: '22', name: 'spinach', calories: 23, protein: 2.9, carbs: 3.6, fats: 0.4 },
    { id: '23', name: 'carrots', calories: 41, protein: 0.9, carbs: 10, fats: 0.2 },

    // Fruits
    { id: '24', name: 'apple', calories: 95, protein: 0.5, carbs: 25, fats: 0.3 },
    { id: '25', name: 'orange', calories: 62, protein: 1.2, carbs: 15, fats: 0.2 },
    { id: '26', name: 'strawberries', calories: 49, protein: 1, carbs: 12, fats: 0.5 },

    // Snacks
    { id: '27', name: 'almonds', calories: 164, protein: 6, carbs: 6, fats: 14 },
    { id: '28', name: 'protein bar', calories: 200, protein: 20, carbs: 20, fats: 6 },
    { id: '29', name: 'trail mix', calories: 150, protein: 4, carbs: 12, fats: 10 },
];

/**
 * Get quick add items (suggested/common foods)
 * Returns generic items that should always be available
 */
export const getQuickAddItems = (): FoodItem[] => {
    // Return a curated list of common generic items
    const items = [
        FOOD_DATABASE.find((f) => f.id === '1')!, // scrambled eggs
        FOOD_DATABASE.find((f) => f.id === '3')!, // banana
        FOOD_DATABASE.find((f) => f.id === '4')!, // greek yogurt
        FOOD_DATABASE.find((f) => f.id === '13')!, // grilled chicken breast
        FOOD_DATABASE.find((f) => f.id === '17')!, // white rice
        FOOD_DATABASE.find((f) => f.id === '21')!, // broccoli
        FOOD_DATABASE.find((f) => f.id === '24')!, // apple
        FOOD_DATABASE.find((f) => f.id === '27')!, // almonds
    ];

    // Filter out any undefined items (safety check)
    return items.filter((item): item is FoodItem => item !== undefined);
};

/**
 * Search food database
 */
export const searchFoods = (query: string): FoodItem[] => {
    if (!query.trim()) {
        return [];
    }

    const searchTerm = query.toLowerCase().trim();
    return FOOD_DATABASE.filter((food) =>
        food.name.toLowerCase().includes(searchTerm)
    ).slice(0, 20); // Limit results
};

/**
 * Get food by ID
 */
export const getFoodById = (id: string): FoodItem | undefined => {
    return FOOD_DATABASE.find((food) => food.id === id);
};
