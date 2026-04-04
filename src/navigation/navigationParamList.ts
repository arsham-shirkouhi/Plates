export type RootStackParamList = {
    Login: undefined;
    Signup: undefined;
    Home: undefined;
    Verification: { email?: string };
    ForgotPassword: undefined;
    Onboarding: undefined;
    MacroResults: {
        macros: {
            calories: number;
            protein: number;
            carbs: number;
            fats: number;
            baseTDEE?: number;
        };
        goal: 'lose' | 'maintain' | 'build';
        goalIntensity: 'mild' | 'moderate' | 'aggressive';
    };
    FoodLog: undefined;
    ExerciseLog: undefined;
    MealDetail: {
        meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
        foods: Array<{
            id: string;
            food: {
                name: string;
                calories: number;
                protein: number;
                carbs: number;
                fats: number;
            };
            loggedAt: string;
            meal: 'breakfast' | 'lunch' | 'dinner' | 'snack';
            portion?: string;
        }>;
        mealTotal: {
            calories: number;
            protein: number;
            carbs: number;
            fats: number;
        };
    };
    Workout: {
        startWorkoutType?: 'pick-as-you-go' | 'previous' | 'new' | 'schedule';
        workoutId?: string;
        updatedExerciseId?: string;
        updatedSets?: Array<{ id: string; reps: string; weight: string; completed?: boolean }>;
        updatedExercises?: Array<{
            id: string;
            name: string;
            sets: Array<{ id: string; reps: string; weight: string; completed?: boolean }>;
        }>;
        newlyCompletedExerciseIds?: string[];
        startWorkoutPrompt?: boolean;
    } | undefined;
    StartWorkout: { selectedWorkoutId?: string } | undefined;
    BrowseWorkouts: undefined;
    ExerciseDetail: {
        exercise: {
            id: string;
            name: string;
            sets: Array<{
                id: string;
                reps: string;
                weight: string;
                completed?: boolean;
            }>;
        };
        exerciseId: string;
        allExercises?: Array<{
            id: string;
            name: string;
            sets: Array<{ id: string; reps: string; weight: string; completed?: boolean }>;
        }>;
        currentExerciseIndex?: number;
    };
    ExerciseInfo: {
        exerciseId: string;
    };
};
