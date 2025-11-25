import { OnboardingData } from '../screens/onboarding/types';

/**
 * Activity level multipliers for TDEE calculation
 */
const ACTIVITY_MULTIPLIERS: Record<'sedentary' | 'lightly' | 'moderate' | 'very', number> = {
    sedentary: 1.2,      // Little to no exercise
    lightly: 1.375,      // Light exercise 1-3 days/week
    moderate: 1.55,      // Moderate exercise 3-5 days/week
    very: 1.725,         // Hard exercise 6-7 days/week
};

/**
 * Goal intensity adjustments
 * Based on standard industry formulas (MyFitnessPal, Cronometer, etc.):
 * 
 * Weight Loss:
 * - Mild: TDEE × 0.90 (10% deficit)
 * - Moderate: TDEE × 0.80 (20% deficit)
 * - Aggressive: TDEE × 0.75 (25% deficit)
 * 
 * Maintain:
 * - calories = TDEE (no adjustment)
 * 
 * Muscle Gain:
 * - Mild: TDEE + 200 calories
 * - Moderate: TDEE + 350 calories
 * - Aggressive: TDEE + 500 calories
 */
const GOAL_ADJUSTMENTS: Record<'lose' | 'maintain' | 'build', Record<'mild' | 'moderate' | 'aggressive', (tdee: number) => number>> = {
    lose: {
        // Mild: TDEE × 0.90 (10% deficit)
        mild: (tdee: number) => Math.round(tdee * 0.90),
        // Moderate: TDEE × 0.80 (20% deficit)
        moderate: (tdee: number) => Math.round(tdee * 0.80),
        // Aggressive: TDEE × 0.75 (25% deficit)
        aggressive: (tdee: number) => Math.round(tdee * 0.75),
    },
    maintain: {
        mild: (tdee: number) => Math.round(tdee),
        moderate: (tdee: number) => Math.round(tdee),
        aggressive: (tdee: number) => Math.round(tdee),
    },
    build: {
        // Mild: TDEE + 200 calories
        mild: (tdee: number) => Math.round(tdee + 200),
        // Moderate: TDEE + 350 calories
        moderate: (tdee: number) => Math.round(tdee + 350),
        // Aggressive: TDEE + 500 calories
        aggressive: (tdee: number) => Math.round(tdee + 500),
    },
};

/**
 * Convert height to centimeters
 */
const convertHeightToCm = (height: number, unit: 'cm' | 'ft'): number => {
    if (unit === 'cm') {
        return height;
    }
    // Convert feet/inches to cm
    // height is stored in inches when unit is 'ft'
    return height * 2.54;
};

/**
 * Convert weight to kilograms
 */
const convertWeightToKg = (weight: number, unit: 'kg' | 'lbs'): number => {
    if (unit === 'kg') {
        return weight;
    }
    // Convert lbs to kg
    return weight * 0.453592;
};

/**
 * Calculate BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
 * BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + s
 * where s = +5 for males, -161 for females, average for other
 */
const calculateBMR = (
    weightKg: number,
    heightCm: number,
    age: number,
    sex: 'male' | 'female' | 'other' | ''
): number => {
    const baseBMR = (10 * weightKg) + (6.25 * heightCm) - (5 * age);

    // Add sex adjustment
    // Treat "other" like female as per user requirements
    let sexAdjustment = 0;
    if (sex === 'male') {
        sexAdjustment = 5;
    } else {
        // For 'female' and 'other', use -161
        sexAdjustment = -161;
    }

    return baseBMR + sexAdjustment;
};

/**
 * Calculate TDEE (Total Daily Energy Expenditure)
 * TDEE = BMR × Activity Multiplier
 */
const calculateTDEE = (bmr: number, activityLevel: 'sedentary' | 'lightly' | 'moderate' | 'very' | ''): number => {
    if (!activityLevel || !(activityLevel in ACTIVITY_MULTIPLIERS)) {
        return bmr * 1.2; // Default to sedentary
    }
    const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
    return bmr * multiplier;
};

/**
 * Calculate target calories based on goal and intensity
 * Applies minimum safe calorie floors: 1200 kcal for females, 1500 kcal for males
 */
const calculateTargetCalories = (
    tdee: number,
    goal: 'lose' | 'maintain' | 'build' | '',
    goalIntensity: 'mild' | 'moderate' | 'aggressive' | '',
    sex: 'male' | 'female' | 'other' | ''
): number => {
    if (!goal || !(goal in GOAL_ADJUSTMENTS) || !goalIntensity || !(goalIntensity in GOAL_ADJUSTMENTS[goal])) {
        return Math.round(tdee); // Default to maintain
    }

    // Get the adjustment function and calculate target calories
    const adjustmentFunction = GOAL_ADJUSTMENTS[goal][goalIntensity];
    const targetCalories = adjustmentFunction(tdee);

    // Safety checks: ensure minimum calories for health
    // Minimum 1,200 kcal/day for females/other, 1,500 kcal/day for males
    const minCalories = sex === 'male' ? 1500 : 1200;
    if (goal === 'lose') {
        return Math.max(minCalories, targetCalories);
    }

    return targetCalories;
};

/**
 * Calculate macros distribution (auto mode)
 * Simple formula matching industry standards (MyFitnessPal, Cronometer):
 * - Protein: 2.0 × weight (kg) in grams
 * - Fats: 25% of finalCalories
 * - Carbs: Remaining calories after protein and fats
 */
const calculateMacros = (
    calories: number,
    weightKg: number
): {
    protein: number;
    carbs: number;
    fats: number;
} => {
    // Protein: 2.0 × weight (kg) in grams
    const protein = Math.round(weightKg * 2.0);
    const proteinCalories = protein * 4; // 4 calories per gram of protein

    // Fats: 25% of finalCalories
    const fatCalories = Math.round(calories * 0.25);
    const fats = Math.round(fatCalories / 9); // 9 calories per gram of fat

    // Carbs: Remaining calories after protein and fats
    const carbCalories = calories - proteinCalories - (fats * 9);
    const carbs = Math.round(carbCalories / 4); // 4 calories per gram of carbs

    return {
        protein,
        carbs: Math.max(0, carbs), // Ensure non-negative
        fats,
    };
};

/**
 * Calculate calories from macros
 * Calories = (protein × 4) + (carbs × 4) + (fats × 9)
 */
export const calculateCaloriesFromMacros = (
    protein: number,
    carbs: number,
    fats: number
): number => {
    return Math.round((protein * 4) + (carbs * 4) + (fats * 9));
};

/**
 * Generate daily macros based on onboarding data (with birth date)
 * Uses ONLY: dateOfBirth, sex, height, weight, activityLevel, goal, goalIntensity
 * Uses Mifflin-St Jeor equation for BMR, then calculates TDEE and adjusts for goal
 */
export const generateDailyMacros = (onboardingData: OnboardingData): {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    baseTDEE?: number; // Maintenance calories before goal adjustment
} => {
    // Convert units to metric
    const heightCm = convertHeightToCm(onboardingData.height, onboardingData.heightUnit);
    const weightKg = convertWeightToKg(onboardingData.weight, onboardingData.weightUnit);

    // Calculate age from birth date
    const today = new Date();
    const birthDate = new Date(onboardingData.birthYear, onboardingData.birthMonth - 1, onboardingData.birthDay);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    // Calculate BMR using Mifflin-St Jeor
    const bmr = calculateBMR(
        weightKg,
        heightCm,
        age,
        onboardingData.sex
    );

    // Calculate TDEE (base maintenance calories)
    const tdee = calculateTDEE(bmr, onboardingData.activityLevel);

    // Calculate target calories based on goal
    const targetCalories = calculateTargetCalories(
        tdee,
        onboardingData.goal,
        onboardingData.goalIntensity,
        onboardingData.sex
    );

    // Calculate macro distribution (auto mode - simple formula)
    const macros = calculateMacros(
        targetCalories,
        weightKg
    );

    return {
        calories: targetCalories,
        baseTDEE: Math.round(tdee), // Base maintenance calories before goal adjustment
        ...macros,
    };
};

/**
 * Generate macros for manual mode (uses custom macros and calculates calories)
 */
export const generateManualMacros = (customMacros: {
    protein: number;
    carbs: number;
    fats: number;
}): {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
} => {
    const calories = calculateCaloriesFromMacros(
        customMacros.protein,
        customMacros.carbs,
        customMacros.fats
    );

    return {
        calories,
        protein: customMacros.protein,
        carbs: customMacros.carbs,
        fats: customMacros.fats,
    };
};

/**
 * Generate daily macros from userService OnboardingData (with age instead of birth date)
 * This is a convenience function for when we already have age calculated
 * Uses ONLY: age, sex, height, weight, activityLevel, goal, goalIntensity (no dietPreference)
 */
export const generateDailyMacrosFromAge = (
    age: number,
    sex: 'male' | 'female' | 'other' | '',
    height: number,
    heightUnit: 'cm' | 'ft',
    weight: number,
    weightUnit: 'kg' | 'lbs',
    activityLevel: 'sedentary' | 'lightly' | 'moderate' | 'very' | '',
    goal: 'lose' | 'maintain' | 'build' | '',
    goalIntensity: 'mild' | 'moderate' | 'aggressive' | ''
): {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
    baseTDEE?: number; // Maintenance calories before goal adjustment
} => {
    // Convert units to metric
    const heightCm = convertHeightToCm(height, heightUnit);
    const weightKg = convertWeightToKg(weight, weightUnit);

    // Calculate BMR using Mifflin-St Jeor
    const bmr = calculateBMR(weightKg, heightCm, age, sex);

    // Calculate TDEE (base maintenance calories)
    const tdee = calculateTDEE(bmr, activityLevel);

    // Calculate target calories based on goal
    const targetCalories = calculateTargetCalories(tdee, goal, goalIntensity, sex);

    // Calculate macro distribution (auto mode - simple formula)
    const macros = calculateMacros(targetCalories, weightKg);

    return {
        calories: targetCalories,
        baseTDEE: Math.round(tdee), // Base maintenance calories before goal adjustment
        ...macros,
    };
};
