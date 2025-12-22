import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, where, deleteField } from 'firebase/firestore';
import { db } from './firebase';
import { User } from 'firebase/auth';
import { generateDailyMacrosFromAge, generateManualMacros } from '../utils/macroCalculator';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

/**
 * Onboarding Data Schema
 * Note: This interface is kept for backward compatibility but we use the one from onboarding/types
 * The onboarding screen converts birthMonth/birthDay/birthYear to age before calling saveOnboardingData
 */
export interface OnboardingData {
    name: string;
    age: number; // Calculated from birthMonth/birthDay/birthYear in onboarding screen
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

    // Streak tracking
    streak?: number; // Current streak count
    lastMealLogDate?: string; // Last date a meal was logged (YYYY-MM-DD)

    // Calculated macros (from onboarding or manual)
    targetMacros?: {
        calories: number;
        protein: number; // in grams
        carbs: number; // in grams
        fats: number; // in grams
        baseTDEE?: number; // Maintenance calories before goal adjustment
    };

    // User settings including macros
    userSettings?: {
        macros?: {
            calories: number;
            protein: number; // in grams
            carbs: number; // in grams
            fats: number; // in grams
            baseTDEE?: number; // Maintenance calories before goal adjustment
        };
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
        // Note: Don't include undefined fields - Firestore doesn't allow undefined values
        const initialData: any = {
            // Onboarding status - new users haven't completed onboarding
            onboardingCompleted: false,

            // Streak tracking - default to 0
            streak: 0,

            // Metadata
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            lastLoginAt: serverTimestamp(),
        };

        // Remove any undefined values before saving
        const cleanData = removeUndefinedValues(initialData);

        await setDoc(userDocRef, cleanData);

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

        // Get existing document to preserve createdAt and check for existing username
        const existingDoc = await getDoc(userDocRef);
        const existingData = existingDoc.exists() ? existingDoc.data() : null;
        const existingUsername = existingData?.onboardingData?.name?.trim().toLowerCase();

        // Normalize the new username
        const newUsername = onboardingData.name.trim().toLowerCase();

        // Calculate macros based on setup mode
        // Store in userSettings.macros (new location) and also keep targetMacros for backward compatibility
        let calculatedMacros = undefined;
        if (onboardingData.macrosSetup === 'auto') {
            // Use automatic calculation with Mifflin-St Jeor formula
            // Only uses: age, sex, height, weight, activityLevel, goal, goalIntensity
            calculatedMacros = generateDailyMacrosFromAge(
                onboardingData.age,
                onboardingData.sex,
                onboardingData.height,
                onboardingData.heightUnit,
                onboardingData.weight,
                onboardingData.weightUnit,
                onboardingData.activityLevel,
                onboardingData.goal,
                onboardingData.goalIntensity
            );
        } else if (onboardingData.macrosSetup === 'manual' && onboardingData.customMacros) {
            // Use custom macros and calculate calories from them
            calculatedMacros = generateManualMacros(onboardingData.customMacros);
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

        // Store macros in userSettings.macros (primary location)
        if (calculatedMacros) {
            updateData.userSettings = {
                macros: calculatedMacros,
            };
            // Also keep targetMacros for backward compatibility
            updateData.targetMacros = calculatedMacros;
        }

        // Preserve createdAt if it exists, otherwise set it
        if (existingData?.createdAt) {
            updateData.createdAt = existingData.createdAt;
        } else {
            updateData.createdAt = serverTimestamp();
        }

        // Remove any remaining undefined values (Firestore doesn't allow undefined)
        const cleanData = removeUndefinedValues(updateData);

        // Save user data
        await setDoc(userDocRef, cleanData, { merge: true });

        // Update usernames collection
        // If username changed, remove old username and add new one
        if (existingUsername && existingUsername !== newUsername) {
            const oldUsernameRef = doc(db, 'usernames', existingUsername);
            await setDoc(oldUsernameRef, deleteField(), { merge: true });
        }

        // Add/update username in usernames collection
        const usernameRef = doc(db, 'usernames', newUsername);
        await setDoc(usernameRef, {
            userId: user.uid,
            username: onboardingData.name.trim(), // Store original case
            createdAt: existingUsername === newUsername && existingData?.createdAt
                ? existingData.createdAt
                : serverTimestamp(),
            updatedAt: serverTimestamp(),
        });

        console.log('✅ Onboarding data saved successfully');
        console.log('✅ Username registered in usernames collection');
        console.log('✅ onboardingCompleted flag set to: true');
        console.log('📊 Macros calculated and saved to userSettings.macros:', calculatedMacros);
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

        // Remove username from usernames collection if it exists
        if (existingData?.onboardingData?.name) {
            const username = existingData.onboardingData.name.trim().toLowerCase();
            const usernameRef = doc(db, 'usernames', username);
            await setDoc(usernameRef, deleteField(), { merge: true });
            console.log('🗑️ Username removed from usernames collection');
        }

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

/**
 * Check if a username already exists in Firestore
 * Uses the usernames collection for efficient lookup
 * @param username - The username to check
 * @param currentUserId - Optional: current user's ID to exclude from check (for editing own username)
 * @returns true if username exists, false otherwise
 */
export const checkUsernameExists = async (username: string, currentUserId?: string): Promise<boolean> => {
    try {
        if (!username || username.trim().length === 0) {
            return false;
        }

        const normalizedUsername = username.trim().toLowerCase();
        const usernameDocRef = doc(db, 'usernames', normalizedUsername);
        const usernameDoc = await getDoc(usernameDocRef);

        if (usernameDoc.exists()) {
            const data = usernameDoc.data();
            // If checking for current user, allow them to keep their own username
            if (currentUserId && data.userId === currentUserId) {
                return false; // It's their own username, so it's available to them
            }
            return true; // Username exists and belongs to someone else
        }

        return false; // Username is available
    } catch (error) {
        console.error('Error checking username existence:', error);
        // Return false on error to allow user to proceed (fail open)
        return false;
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

        // Update streak when meal is logged
        await updateStreak(user, dateStr);
    } catch (error) {
        console.error('Error adding to daily macro log:', error);
        throw error;
    }
};

/**
 * Subtract macros from existing daily log (for undo functionality)
 * @param user - Firebase user
 * @param macros - Macro values to subtract
 * @param date - Date string in format YYYY-MM-DD (defaults to today)
 */
export const subtractFromDailyMacroLog = async (
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
            calories: Math.max(0, (existingLog?.calories || 0) - (macros.calories || 0)),
            protein: Math.max(0, (existingLog?.protein || 0) - (macros.protein || 0)),
            carbs: Math.max(0, (existingLog?.carbs || 0) - (macros.carbs || 0)),
            fats: Math.max(0, (existingLog?.fats || 0) - (macros.fats || 0)),
        };

        await saveDailyMacroLog(user, updatedMacros, dateStr);
    } catch (error) {
        console.error('Error subtracting from daily macro log:', error);
        throw error;
    }
};

/**
 * Update user streak when a meal is logged
 * Streak increases if logging on a new day, resets if gap > 1 day
 * @param user - Firebase user
 * @param date - Date string in format YYYY-MM-DD (defaults to today)
 */
export const updateStreak = async (user: User, date?: string): Promise<void> => {
    try {
        const dateStr = date || getTodayDateString();
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            return;
        }

        const profile = userDoc.data() as UserProfile;
        const currentStreak = profile.streak || 0;
        const lastMealDate = profile.lastMealLogDate;

        let newStreak = currentStreak;

        if (!lastMealDate) {
            // First meal ever logged
            newStreak = 1;
        } else {
            // Calculate days between last meal and today
            const lastDate = new Date(lastMealDate);
            const today = new Date(dateStr);
            const diffTime = today.getTime() - lastDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                // Same day - no change to streak
                return;
            } else if (diffDays === 1) {
                // Consecutive day - increment streak
                newStreak = currentStreak + 1;
            } else {
                // Gap of more than 1 day - reset streak
                newStreak = 1;
            }
        }

        // Update streak and last meal date
        await setDoc(userDocRef, {
            streak: newStreak,
            lastMealLogDate: dateStr,
            updatedAt: serverTimestamp(),
        }, { merge: true });

        console.log(`Streak updated to ${newStreak} for ${dateStr}`);
    } catch (error) {
        console.error('Error updating streak:', error);
        // Don't throw - streak update failure shouldn't block meal logging
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

