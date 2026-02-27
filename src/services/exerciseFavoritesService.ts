import { supabase } from './supabase';
import { Exercise } from './exerciseService';

/**
 * Get all favorite exercises for the current user
 */
export const getFavoriteExercises = async (): Promise<Exercise[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.log('No user logged in, returning empty favorites');
            return [];
        }

        // First get the favorite exercise IDs
        const { data: favoritesData, error: favoritesError } = await supabase
            .from('user_exercise_favorites')
            .select('exercise_id')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (favoritesError) {
            console.error('Error fetching favorite exercise IDs:', favoritesError);
            return [];
        }

        if (!favoritesData || favoritesData.length === 0) {
            return [];
        }

        // Get the actual exercise details from exercises
        const exerciseIds = favoritesData.map((item: any) => item.exercise_id);
        const { data: exercisesData, error: exercisesError } = await supabase
            .from('exercises')
            .select('id, Title')
            .in('id', exerciseIds);

        if (exercisesError) {
            console.error('Error fetching favorite exercise details:', exercisesError);
            return [];
        }

        if (!exercisesData || exercisesData.length === 0) {
            return [];
        }

        // Map the data to Exercise interface
        const favorites = exercisesData
            .map((exercise: any) => {
                if (!exercise || !exercise.Title) return null;
                return {
                    id: exercise.id?.toString() || exercise.Title,
                    name: exercise.Title || '',
                };
            })
            .filter((exercise: Exercise | null): exercise is Exercise => exercise !== null);

        return favorites;
    } catch (error) {
        console.error('Exception in getFavoriteExercises:', error);
        return [];
    }
};

/**
 * Add an exercise to favorites
 */
export const addFavoriteExercise = async (exerciseId: string): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('No user logged in, cannot add favorite');
            return false;
        }

        // Check if already favorited
        const { data: existing } = await supabase
            .from('user_exercise_favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('exercise_id', exerciseId)
            .single();

        if (existing) {
            // Already favorited
            return true;
        }

        const { error } = await supabase
            .from('user_exercise_favorites')
            .insert({
                user_id: user.id,
                exercise_id: exerciseId,
            });

        if (error) {
            console.error('Error adding favorite exercise:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Exception in addFavoriteExercise:', error);
        return false;
    }
};

/**
 * Remove an exercise from favorites
 */
export const removeFavoriteExercise = async (exerciseId: string): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            console.error('No user logged in, cannot remove favorite');
            return false;
        }

        const { error } = await supabase
            .from('user_exercise_favorites')
            .delete()
            .eq('user_id', user.id)
            .eq('exercise_id', exerciseId);

        if (error) {
            console.error('Error removing favorite exercise:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Exception in removeFavoriteExercise:', error);
        return false;
    }
};

/**
 * Check if an exercise is favorited
 */
export const isExerciseFavorited = async (exerciseId: string): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return false;
        }

        const { data, error } = await supabase
            .from('user_exercise_favorites')
            .select('id')
            .eq('user_id', user.id)
            .eq('exercise_id', exerciseId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = not found
            console.error('Error checking favorite:', error);
            return false;
        }

        return !!data;
    } catch (error) {
        console.error('Exception in isExerciseFavorited:', error);
        return false;
    }
};

/**
 * Get favorite exercise IDs for the current user (for quick checking)
 */
export const getFavoriteExerciseIds = async (): Promise<Set<string>> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
            return new Set();
        }

        const { data, error } = await supabase
            .from('user_exercise_favorites')
            .select('exercise_id')
            .eq('user_id', user.id);

        if (error) {
            console.error('Error fetching favorite exercise IDs:', error);
            return new Set();
        }

        if (!data || data.length === 0) {
            return new Set();
        }

        return new Set(data.map((item: any) => item.exercise_id?.toString() || ''));
    } catch (error) {
        console.error('Exception in getFavoriteExerciseIds:', error);
        return new Set();
    }
};

