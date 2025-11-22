import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import { User } from 'firebase/auth';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

/**
 * Onboarding Data Schema
 */
export interface OnboardingData {
    name: string;
    age: number;
    sex: 'male' | 'female' | 'other' | '';
    height: number;
    heightUnit: 'cm' | 'ft';
    weight: number;
    weightUnit: 'kg' | 'lbs';
    goal: 'lose' | 'maintain' | 'build' | '';
    activityLevel: 'sedentary' | 'lightly' | 'moderate' | 'very' | '';
    workoutFrequency: '0-1' | '2-3' | '4-5' | '6+' | '';
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

/**
 * Daily Macro Log Schema
 * Stored in: users/{userId}/dailyLogs/{date}
 */
export interface DailyMacroLog {
    date: string; // Format: YYYY-MM-DD
    calories: number;
    protein: number; // in grams
    carbs: number; // in grams
    fats: number; // in grams
    createdAt: any;
    updatedAt: any;
}

/**
 * User Profile Schema
 * Stored in: users/{userId}
 */
export interface UserProfile {
    // Onboarding status
    onboardingCompleted: boolean;
    onboardingData?: OnboardingData;

    // User metadata
    createdAt: any;
    updatedAt: any;
    lastLoginAt?: any;

    // Calculated macros (from onboarding or manual)
    targetMacros?: {
        calories: number;
        protein: number; // in grams
        carbs: number; // in grams
        fats: number; // in grams
    };
}

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

/**
 * Initialize a new user document in Firestore
 * Called automatically when a user signs up
 */
export const initializeUser = async (user: User): Promise<void> => {
    try {
        const userDocRef = doc(db, 'users', user.uid);

        // Check if user document already exists
        const existingDoc = await getDoc(userDocRef);
        if (existingDoc.exists()) {
            console.log('User document already exists, skipping initialization');
            return;
        }

        // Initialize new user document with default values
        await setDoc(userDocRef, {
            // Onboarding status - new users haven't completed onboarding
            onboardingCompleted: false,

            // No onboarding data yet
            onboardingData: undefined,

            // No target macros yet (will be set after onboarding)
            targetMacros: undefined,

            // Metadata
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
        });

        console.log('User document initialized successfully');
    } catch (error) {
        console.error('Error initializing user document:', error);
        // Don't throw - initialization failure shouldn't block signup
        // The document will be created when onboarding is completed
    }
};

/**
 * Check if user has completed onboarding
 */
export const hasCompletedOnboarding = async (user: User): Promise<boolean> => {
    try {
        const userDocRef = doc(db, 'users', user.uid);

        // Add timeout to prevent hanging (increased timeout for better reliability)
        const timeoutPromise = new Promise<boolean>((resolve) => {
            setTimeout(() => {
                console.warn('Onboarding check timed out after 10s, assuming not completed');
                resolve(false);
            }, 10000); // 10 second timeout (increased from 5s)
        });

        const docPromise = getDoc(userDocRef).then((userDoc) => {
            if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                return data.onboardingCompleted || false;
            }
            return false;
        });

        // Race between the query and timeout
        return await Promise.race([docPromise, timeoutPromise]);
    } catch (error) {
        console.error('Error checking onboarding status:', error);
        return false;
    }
};

/**
 * Save onboarding data and mark onboarding as complete
 */
export const saveOnboardingData = async (user: User, onboardingData: OnboardingData): Promise<void> => {
    try {
        const userDocRef = doc(db, 'users', user.uid);

        // Get existing document to preserve createdAt
        const existingDoc = await getDoc(userDocRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : null;

        // Calculate target macros if auto-setup was selected
        let targetMacros = undefined;
        if (onboardingData.macrosSetup === 'auto') {
            targetMacros = calculateTargetMacros(onboardingData);
        } else if (onboardingData.macrosSetup === 'manual' && onboardingData.customMacros) {
            // Use custom macros provided by user
            // Note: We'll need to calculate calories from macros or ask user for calorie target
            targetMacros = {
                calories: 2000, // Placeholder - should be calculated or provided
                protein: onboardingData.customMacros.protein,
                carbs: onboardingData.customMacros.carbs,
                fats: onboardingData.customMacros.fats,
            };
        }

        // Prepare onboarding data - remove undefined customMacros
        const cleanOnboardingData: any = { ...onboardingData };
        if (!cleanOnboardingData.customMacros) {
            delete cleanOnboardingData.customMacros;
        }

        // Prepare update data
        const updateData: any = {
            onboardingCompleted: true,
            onboardingData: cleanOnboardingData,
            updatedAt: serverTimestamp(),
        };

        // Only include targetMacros if it's defined
        if (targetMacros) {
            updateData.targetMacros = targetMacros;
        }

        // Preserve createdAt if it exists, otherwise set it
        if (existingData?.createdAt) {
            updateData.createdAt = existingData.createdAt;
        } else {
            updateData.createdAt = serverTimestamp();
        }

        // Remove any remaining undefined values (Firestore doesn't allow undefined)
        const cleanData = removeUndefinedValues(updateData);

        await setDoc(userDocRef, cleanData, { merge: true });

        console.log('✅ Onboarding data saved successfully');
        console.log('✅ onboardingCompleted flag set to: true');
        console.log('📊 Target macros calculated:', targetMacros);
    } catch (error) {
        console.error('Error saving onboarding data:', error);
        throw error;
    }
};

/**
 * Get user profile data
 */
export const getUserProfile = async (user: User): Promise<UserProfile | null> => {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
            return userDoc.data() as UserProfile;
        }
        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
};

/**
 * Reset onboarding data for testing purposes
 * This will clear onboarding completion flag and all onboarding data
 */
export const resetOnboarding = async (user: User): Promise<void> => {
    try {
        console.log('🔄 Resetting onboarding for user:', user.uid);
        const userDocRef = doc(db, 'users', user.uid);

        // Get existing document to preserve createdAt
        const existingDoc = await getDoc(userDocRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : null;

        console.log('📄 Existing data found:', !!existingData);

        // Reset onboarding data - use deleteField() to remove fields
        const resetData: any = {
            onboardingCompleted: false,
            onboardingData: deleteField(), // Delete the onboarding data field
            targetMacros: deleteField(), // Delete the target macros field
            updatedAt: serverTimestamp(),
        };

        // Preserve createdAt and lastLoginAt
        if (existingData?.createdAt) {
            resetData.createdAt = existingData.createdAt;
        } else {
            resetData.createdAt = serverTimestamp();
        }

        if (existingData?.lastLoginAt) {
            resetData.lastLoginAt = existingData.lastLoginAt;
        }

        console.log('💾 Saving reset data to Firestore...');
        // Use merge: true to update only specified fields and delete the ones marked with deleteField()
        await setDoc(userDocRef, resetData, { merge: true });

        console.log('✅ Onboarding data reset successfully - all onboarding data cleared');
    } catch (error) {
        console.error('❌ Error resetting onboarding data:', error);
        throw error;
    }
};

/**
 * Update user's last login timestamp
 */
export const updateLastLogin = async (user: User): Promise<void> => {
    try {
        const userDocRef = doc(db, 'users', user.uid);
        await setDoc(userDocRef, {
            lastLoginAt: serverTimestamp(),
        }, { merge: true });
    } catch (error) {
        console.error('Error updating last login:', error);
        // Don't throw - this is not critical
    }
};

// ============================================================================
// DAILY MACRO LOGGING FUNCTIONS
// ============================================================================

/**
 * Get or create daily macro log for a specific date
 * @param user - Firebase user
 * @param date - Date string in format YYYY-MM-DD (defaults to today)
 */
export const getDailyMacroLog = async (user: User, date?: string): Promise<DailyMacroLog | null> => {
    try {
        const dateStr = date || getTodayDateString();
        const logDocRef = doc(db, 'users', user.uid, 'dailyLogs', dateStr);
        const logDoc = await getDoc(logDocRef);

        if (logDoc.exists()) {
            return logDoc.data() as DailyMacroLog;
        }
        return null;
    } catch (error) {
        console.error('Error getting daily macro log:', error);
        return null;
    }
};

/**
 * Save or update daily macro log
 * @param user - Firebase user
 * @param macros - Macro values to save
 * @param date - Date string in format YYYY-MM-DD (defaults to today)
 */
export const saveDailyMacroLog = async (
    user: User,
    macros: {
        calories: number;
        protein: number;
        carbs: number;
        fats: number;
    },
    date?: string
): Promise<void> => {
    try {
        const dateStr = date || getTodayDateString();
        const logDocRef = doc(db, 'users', user.uid, 'dailyLogs', dateStr);

        const existingLog = await getDailyMacroLog(user, dateStr);

        await setDoc(logDocRef, {
            date: dateStr,
            calories: macros.calories,
            protein: macros.protein,
            carbs: macros.carbs,
            fats: macros.fats,
            updatedAt: serverTimestamp(),
            createdAt: existingLog?.createdAt || serverTimestamp(),
        }, { merge: true });

        console.log(`Daily macro log saved for ${dateStr}`);
    } catch (error) {
        console.error('Error saving daily macro log:', error);
        throw error;
    }
};

/**
 * Add macros to existing daily log (incremental)
 * @param user - Firebase user
 * @param macros - Macro values to add
 * @param date - Date string in format YYYY-MM-DD (defaults to today)
 */
export const addToDailyMacroLog = async (
    user: User,
    macros: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fats?: number;
    },
    date?: string
): Promise<void> => {
    try {
        const dateStr = date || getTodayDateString();
        const existingLog = await getDailyMacroLog(user, dateStr);

        const updatedMacros = {
            calories: (existingLog?.calories || 0) + (macros.calories || 0),
            protein: (existingLog?.protein || 0) + (macros.protein || 0),
            carbs: (existingLog?.carbs || 0) + (macros.carbs || 0),
            fats: (existingLog?.fats || 0) + (macros.fats || 0),
        };

        await saveDailyMacroLog(user, updatedMacros, dateStr);
    } catch (error) {
        console.error('Error adding to daily macro log:', error);
        throw error;
    }
};

/**
 * Get daily macro logs for a date range
 * @param user - Firebase user
 * @param startDate - Start date string in format YYYY-MM-DD
 * @param endDate - End date string in format YYYY-MM-DD
 */
export const getDailyMacroLogsRange = async (
    user: User,
    startDate: string,
    endDate: string
): Promise<DailyMacroLog[]> => {
    try {
        const logsRef = collection(db, 'users', user.uid, 'dailyLogs');
        const q = query(
            logsRef,
            where('date', '>=', startDate),
            where('date', '<=', endDate)
        );

        const querySnapshot = await getDocs(q);
        const logs: DailyMacroLog[] = [];

        querySnapshot.forEach((doc) => {
            logs.push(doc.data() as DailyMacroLog);
        });

        // Sort by date
        logs.sort((a, b) => a.date.localeCompare(b.date));

        return logs;
    } catch (error) {
        console.error('Error getting daily macro logs range:', error);
        return [];
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Recursively remove undefined values from an object
 * Firestore doesn't allow undefined values
 */
const removeUndefinedValues = (obj: any): any => {
    if (obj === null || obj === undefined) {
        return null;
    }

    if (Array.isArray(obj)) {
        return obj.map(item => removeUndefinedValues(item));
    }

    if (typeof obj === 'object' && obj.constructor === Object) {
        const cleaned: any = {};
        for (const key in obj) {
            if (obj.hasOwnProperty(key)) {
                const value = obj[key];
                if (value !== undefined) {
                    cleaned[key] = removeUndefinedValues(value);
                }
            }
        }
        return cleaned;
    }

    return obj;
};

/**
 * Get today's date as YYYY-MM-DD string
 */
export const getTodayDateString = (): string => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

/**
 * Calculate target macros based on onboarding data
 * This is a placeholder - should implement proper BMR/TDEE calculation
 */
const calculateTargetMacros = (onboardingData: OnboardingData): {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
} => {
    // TODO: Implement proper macro calculation based on:
    // - BMR (Basal Metabolic Rate) using Mifflin-St Jeor Equation
    // - TDEE (Total Daily Energy Expenditure) based on activity level
    // - Goal (lose/maintain/build) with appropriate deficit/surplus
    // - Goal intensity (mild/moderate/aggressive)

    // Placeholder calculation
    let baseCalories = 2000; // Default

    // Adjust based on goal
    if (onboardingData.goal === 'lose') {
        baseCalories = onboardingData.goalIntensity === 'aggressive' ? 1500 :
            onboardingData.goalIntensity === 'moderate' ? 1700 : 1800;
    } else if (onboardingData.goal === 'build') {
        baseCalories = onboardingData.goalIntensity === 'aggressive' ? 2500 :
            onboardingData.goalIntensity === 'moderate' ? 2300 : 2200;
    }

    // Calculate macros (simplified)
    // Protein: 1.6-2.2g per kg body weight (use 2g for high protein)
    const weightInKg = onboardingData.weightUnit === 'kg' ? onboardingData.weight : onboardingData.weight * 0.453592;
    const proteinGrams = Math.round(weightInKg * 2);

    // Fats: 25-30% of calories (use 30%)
    const fatCalories = Math.round(baseCalories * 0.30);
    const fatGrams = Math.round(fatCalories / 9); // 9 calories per gram of fat

    // Carbs: Remaining calories
    const proteinCalories = proteinGrams * 4; // 4 calories per gram of protein
    const carbCalories = baseCalories - proteinCalories - fatCalories;
    const carbGrams = Math.round(carbCalories / 4); // 4 calories per gram of carbs

    return {
        calories: baseCalories,
        protein: proteinGrams,
        carbs: carbGrams,
        fats: fatGrams,
    };
};
