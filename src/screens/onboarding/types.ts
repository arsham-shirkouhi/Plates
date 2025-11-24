export interface OnboardingData {
    name: string;
    birthMonth: number;
    birthDay: number;
    birthYear: number;
    sex: 'male' | 'female' | 'other' | '';
    height: number;
    heightUnit: 'cm' | 'ft';
    weight: number;
    weightUnit: 'kg' | 'lbs';
    goal: 'lose' | 'maintain' | 'build' | '';
    activityLevel: 'sedentary' | 'lightly' | 'moderate' | 'very' | '';
    dietPreference: 'regular' | 'high-protein' | 'vegetarian' | 'vegan' | 'keto' | 'halal' | '';
    allergies: string[];
    goalIntensity: 'mild' | 'moderate' | 'aggressive' | '';
    unitPreference: { weight: 'kg' | 'lbs'; height: 'cm' | 'ft' };
    purpose: 'meals' | 'workouts' | 'both' | 'discipline' | '';
    macrosSetup: 'auto' | 'manual' | '';
    customMacros?: {
        protein: number;
        carbs: number;
        fats: number;
    };
}

