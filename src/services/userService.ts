import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
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
 * Stored in: daily_logs table
 */
export interface DailyMacroLog {
    id: string;
    user_id: string;
    date: string; // Format: YYYY-MM-DD
    calories: number;
    protein: number; // in grams
    carbs: number; // in grams
    fats: number; // in grams
    created_at: string;
    updated_at: string;
}

/**
 * User Profile Schema
 * Stored in: users table
 */
export interface UserProfile {
    id: string;
    // Onboarding status
    onboarding_completed: boolean;
    onboarding_data?: OnboardingData;

    // User metadata
    created_at: string;
    updated_at: string;
    last_login_at?: string;

    // Streak tracking
    streak?: number; // Current streak count
    last_meal_log_date?: string; // Last date a meal was logged (YYYY-MM-DD)

    // Calculated macros (from onboarding or manual)
    target_macros?: {
        calories: number;
        protein: number; // in grams
        carbs: number; // in grams
        fats: number; // in grams
        baseTDEE?: number; // Maintenance calories before goal adjustment
    };
}

// ============================================================================
// USER PROFILE FUNCTIONS
// ============================================================================

/**
 * Initialize a new user document in Supabase
 * Called automatically when a user signs up
 */
export const initializeUser = async (user: User): Promise<void> => {
    try {
        // Check if user document already exists
        const { data: existingUser, error: fetchError } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 is "not found" error, which is expected for new users
            throw fetchError;
        }

        if (existingUser) {
            console.log('User document already exists, skipping initialization');
            return;
        }

        // Initialize new user document with default values
        const { error } = await supabase.from('users').insert({
            id: user.id,
            onboarding_completed: false,
            streak: 0,
            last_meal_log_date: null,
            last_login_at: new Date().toISOString(),
        });

        if (error) {
            throw error;
        }

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
        const timeoutPromise = new Promise<boolean>((resolve) => {
            setTimeout(() => {
                console.warn('Onboarding check timed out after 10s, assuming not completed');
                resolve(false);
            }, 10000); // 10 second timeout
        });

        const docPromise = supabase
            .from('users')
            .select('onboarding_completed')
            .eq('id', user.id)
            .single()
            .then(({ data, error }) => {
                if (error) {
                    if (error.code === 'PGRST116') {
                        // User not found
                        return false;
                    }
                    throw error;
                }
                return data?.onboarding_completed || false;
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
        // Get existing onboarding data to check for username changes
        const { data: existingOnboarding } = await supabase
            .from('onboarding_data')
            .select('name')
            .eq('user_id', user.id)
            .single();

        const existingUsername = existingOnboarding?.name?.trim().toLowerCase();

        // Normalize the new username
        const newUsername = onboardingData.name.trim().toLowerCase();

        // Calculate macros based on setup mode
        let calculatedMacros = undefined;
        if (onboardingData.macrosSetup === 'auto') {
            // Use automatic calculation with Mifflin-St Jeor formula
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

        // Convert onboarding data to database format
        const onboardingDataDb = {
            user_id: user.id,
            name: onboardingData.name,
            age: onboardingData.age,
            sex: onboardingData.sex,
            height: onboardingData.height,
            height_unit: onboardingData.heightUnit,
            weight: onboardingData.weight,
            weight_unit: onboardingData.weightUnit,
            goal: onboardingData.goal,
            activity_level: onboardingData.activityLevel,
            diet_preference: onboardingData.dietPreference,
            allergies: onboardingData.allergies || [],
            goal_intensity: onboardingData.goalIntensity,
            unit_preference: onboardingData.unitPreference,
            purpose: onboardingData.purpose,
            macros_setup: onboardingData.macrosSetup,
            custom_macros: onboardingData.customMacros || null,
        };

        // Upsert onboarding data
        const { error: onboardingError } = await supabase
            .from('onboarding_data')
            .upsert(onboardingDataDb, { onConflict: 'user_id' });

        if (onboardingError) {
            throw onboardingError;
        }

        // Update user table to mark onboarding as completed
        const { error: userUpdateError } = await supabase
            .from('users')
            .update({ onboarding_completed: true })
            .eq('id', user.id);

        if (userUpdateError) {
            throw userUpdateError;
        }

        // Save target macros if calculated
        if (calculatedMacros) {
            const targetMacrosDb = {
                user_id: user.id,
                calories: calculatedMacros.calories,
                protein: calculatedMacros.protein,
                carbs: calculatedMacros.carbs,
                fats: calculatedMacros.fats,
                base_tdee: (calculatedMacros as any).baseTDEE || null,
            };

            const { error: targetMacrosError } = await supabase
                .from('target_macros')
                .upsert(targetMacrosDb, { onConflict: 'user_id' });

            if (targetMacrosError) {
                throw targetMacrosError;
            }
        }

        // Update usernames collection
        // If username changed, remove old username and add new one
        if (existingUsername && existingUsername !== newUsername) {
            const { error: deleteError } = await supabase
                .from('usernames')
                .delete()
                .eq('username', existingUsername);

            if (deleteError) {
                console.error('Error deleting old username:', deleteError);
            }
        }

        // Add/update username in usernames table
        const { error: usernameError } = await supabase
            .from('usernames')
            .upsert({
                username: newUsername,
                user_id: user.id,
                display_name: onboardingData.name.trim(), // Store original case
            }, {
                onConflict: 'username',
            });

        if (usernameError) {
            console.error('Error updating username:', usernameError);
            // Don't throw - username update failure shouldn't block onboarding
        }

        console.log('✅ Onboarding data saved successfully');
        console.log('✅ Username registered in usernames table');
        console.log('✅ onboardingCompleted flag set to: true');
        console.log('📊 Macros calculated and saved:', calculatedMacros);
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
        // Get user data
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        if (userError) {
            if (userError.code === 'PGRST116') {
                // User not found
                return null;
            }
            throw userError;
        }

        // Get onboarding data
        const { data: onboardingData } = await supabase
            .from('onboarding_data')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Get target macros
        const { data: targetMacros } = await supabase
            .from('target_macros')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Convert database format to TypeScript interface format
        const profile: UserProfile = {
            id: userData.id,
            onboarding_completed: userData.onboarding_completed,
            created_at: userData.created_at,
            updated_at: userData.updated_at,
            last_login_at: userData.last_login_at,
            streak: userData.streak,
            last_meal_log_date: userData.last_meal_log_date,
        };

        // Convert onboarding data from DB format to interface format
        if (onboardingData) {
            profile.onboarding_data = {
                name: onboardingData.name,
                age: onboardingData.age,
                sex: onboardingData.sex,
                height: onboardingData.height,
                heightUnit: onboardingData.height_unit,
                weight: onboardingData.weight,
                weightUnit: onboardingData.weight_unit,
                goal: onboardingData.goal,
                activityLevel: onboardingData.activity_level,
                dietPreference: onboardingData.diet_preference,
                allergies: onboardingData.allergies || [],
                goalIntensity: onboardingData.goal_intensity,
                unitPreference: onboardingData.unit_preference,
                purpose: onboardingData.purpose,
                macrosSetup: onboardingData.macros_setup,
                customMacros: onboardingData.custom_macros,
            };
        }

        // Convert target macros from DB format to interface format
        if (targetMacros) {
            profile.target_macros = {
                calories: targetMacros.calories,
                protein: targetMacros.protein,
                carbs: targetMacros.carbs,
                fats: targetMacros.fats,
                baseTDEE: targetMacros.base_tdee,
            };
        }

        return profile;
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
        console.log('🔄 Resetting onboarding for user:', user.id);
        
        // Get existing onboarding data to get username
        const { data: existingOnboarding } = await supabase
            .from('onboarding_data')
            .select('name')
            .eq('user_id', user.id)
            .single();

        console.log('📄 Existing onboarding data found:', !!existingOnboarding);

        // Update user table to mark onboarding as not completed
        const { error: updateError } = await supabase
            .from('users')
            .update({ onboarding_completed: false })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        // Delete onboarding data
        const { error: deleteOnboardingError } = await supabase
            .from('onboarding_data')
            .delete()
            .eq('user_id', user.id);

        if (deleteOnboardingError) {
            console.error('Error deleting onboarding data:', deleteOnboardingError);
        }

        // Delete target macros
        const { error: deleteTargetMacrosError } = await supabase
            .from('target_macros')
            .delete()
            .eq('user_id', user.id);

        if (deleteTargetMacrosError) {
            console.error('Error deleting target macros:', deleteTargetMacrosError);
        }

        // Remove username from usernames table if it exists
        if (existingOnboarding?.name) {
            const username = existingOnboarding.name.trim().toLowerCase();
            const { error: deleteError } = await supabase
                .from('usernames')
                .delete()
                .eq('username', username);

            if (deleteError) {
                console.error('Error deleting username:', deleteError);
            } else {
                console.log('🗑️ Username removed from usernames table');
            }
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
        const { error } = await supabase
            .from('users')
            .update({
                last_login_at: new Date().toISOString(),
            })
            .eq('id', user.id);

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error updating last login:', error);
        // Don't throw - this is not critical
    }
};

/**
 * Check if a username already exists in Supabase
 * Uses the usernames table for efficient lookup
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
        const { data, error } = await supabase
            .from('usernames')
            .select('user_id')
            .eq('username', normalizedUsername)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found - username is available
                return false;
            }
            throw error;
        }

        if (data) {
            // If checking for current user, allow them to keep their own username
            if (currentUserId && data.user_id === currentUserId) {
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
 * @param user - Supabase user
 * @param date - Date string in format YYYY-MM-DD (defaults to today)
 */
export const getDailyMacroLog = async (user: User, date?: string): Promise<DailyMacroLog | null> => {
    try {
        const dateStr = date || getTodayDateString();
        const { data, error } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', user.id)
            .eq('date', dateStr)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found
                return null;
            }
            throw error;
        }

        return data as DailyMacroLog;
    } catch (error) {
        console.error('Error getting daily macro log:', error);
        return null;
    }
};

/**
 * Save or update daily macro log
 * @param user - Supabase user
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
        const existingLog = await getDailyMacroLog(user, dateStr);

        const logData = {
            user_id: user.id,
            date: dateStr,
            calories: macros.calories,
            protein: macros.protein,
            carbs: macros.carbs,
            fats: macros.fats,
        };

        if (existingLog) {
            // Update existing log
            const { error } = await supabase
                .from('daily_logs')
                .update(logData)
                .eq('id', existingLog.id);

            if (error) {
                throw error;
            }
        } else {
            // Insert new log
            const { error } = await supabase.from('daily_logs').insert(logData);

            if (error) {
                throw error;
            }
        }

        console.log(`Daily macro log saved for ${dateStr}`);
    } catch (error) {
        console.error('Error saving daily macro log:', error);
        throw error;
    }
};

/**
 * Add macros to existing daily log (incremental)
 * @param user - Supabase user
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
 * @param user - Supabase user
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
 * @param user - Supabase user
 * @param date - Date string in format YYYY-MM-DD (defaults to today)
 */
export const updateStreak = async (user: User, date?: string): Promise<void> => {
    try {
        const dateStr = date || getTodayDateString();
        const { data: profile, error: fetchError } = await supabase
            .from('users')
            .select('streak, last_meal_log_date')
            .eq('id', user.id)
            .single();

        if (fetchError) {
            throw fetchError;
        }

        if (!profile) {
            return;
        }

        const currentStreak = profile.streak || 0;
        const lastMealDate = profile.last_meal_log_date;

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
        const { error: updateError } = await supabase
            .from('users')
            .update({
                streak: newStreak,
                last_meal_log_date: dateStr,
            })
            .eq('id', user.id);

        if (updateError) {
            throw updateError;
        }

        console.log(`Streak updated to ${newStreak} for ${dateStr}`);
    } catch (error) {
        console.error('Error updating streak:', error);
        // Don't throw - streak update failure shouldn't block meal logging
    }
};

/**
 * Get daily macro logs for a date range
 * @param user - Supabase user
 * @param startDate - Start date string in format YYYY-MM-DD
 * @param endDate - End date string in format YYYY-MM-DD
 */
export const getDailyMacroLogsRange = async (
    user: User,
    startDate: string,
    endDate: string
): Promise<DailyMacroLog[]> => {
    try {
        const { data, error } = await supabase
            .from('daily_logs')
            .select('*')
            .eq('user_id', user.id)
            .gte('date', startDate)
            .lte('date', endDate)
            .order('date', { ascending: true });

        if (error) {
            throw error;
        }

        return (data || []) as DailyMacroLog[];
    } catch (error) {
        console.error('Error getting daily macro logs range:', error);
        return [];
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

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
