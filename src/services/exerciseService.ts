import { supabase } from './supabase';

export interface Exercise {
    id: string;
    name: string;
}

/**
 * Fetch exercises from the exercises table with pagination
 * @param limit - Number of exercises to fetch (default: 20)
 * @param offset - Number of exercises to skip (default: 0)
 */
export const getExercisesList = async (limit: number = 20, offset: number = 0): Promise<Exercise[]> => {
    try {
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .order('Title', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            console.error('❌ Error fetching exercises:', error);
            console.error('Error code:', error.code);
            console.error('Error message:', error.message);
            
            // Common RLS error
            if (error.code === '42501' || error.message?.includes('permission denied')) {
                console.error('');
                console.error('🔒 RLS POLICY ISSUE DETECTED');
                console.error('The exercises table likely has RLS enabled without a public read policy.');
                console.error('');
            }
            
            return [];
        }

        if (!data) {
            return [];
        }

        // Helper function to clean title (remove prefixes like "30", "arms", etc.)
        const cleanTitle = (title: string): string => {
            if (!title) return '';
            let cleaned = title;
            // Remove "30" prefix if it exists at the start
            cleaned = cleaned.replace(/^30\s*/, '').trim();
            // Remove common category prefixes (arms, legs, chest, back, shoulders, etc.)
            // Match pattern like "arms - " or "arms " at the start
            cleaned = cleaned.replace(/^(arms|legs|chest|back|shoulders|core|abs|cardio|full body|upper|lower|push|pull)\s*[-:]\s*/i, '').trim();
            // Also remove if it's just "arms " at the start without dash/colon
            cleaned = cleaned.replace(/^(arms|legs|chest|back|shoulders|core|abs|cardio|full body|upper|lower|push|pull)\s+/i, '').trim();
            return cleaned;
        };

        // Map the data to Exercise interface
        const exercises = data
            .filter((exercise: any) => exercise.Title) // Filter out any exercises without titles
            .map((exercise: any, index: number) => ({
                id: exercise.id?.toString() || String(exercise.id) || `exercise-${index}-${exercise.Title}`,
                name: cleanTitle(exercise.Title || ''),
            }));

        return exercises;
    } catch (error) {
        console.error('❌ Exception in getExercisesList:', error);
        return [];
    }
};

/**
 * Search exercises by name
 */
export const searchExercises = async (query: string): Promise<Exercise[]> => {
    try {
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .ilike('Title', `%${query}%`)
            .order('Title', { ascending: true })
            .limit(100);

        if (error) {
            console.error('Error searching exercises:', error);
            return [];
        }

        if (!data) {
            return [];
        }

        // Helper function to clean title (remove prefixes like "30", "arms", etc.)
        const cleanTitle = (title: string): string => {
            if (!title) return '';
            let cleaned = title;
            // Remove "30" prefix if it exists at the start
            cleaned = cleaned.replace(/^30\s*/, '').trim();
            // Remove common category prefixes (arms, legs, chest, back, shoulders, etc.)
            // Match pattern like "arms - " or "arms " at the start
            cleaned = cleaned.replace(/^(arms|legs|chest|back|shoulders|core|abs|cardio|full body|upper|lower|push|pull)\s*[-:]\s*/i, '').trim();
            // Also remove if it's just "arms " at the start without dash/colon
            cleaned = cleaned.replace(/^(arms|legs|chest|back|shoulders|core|abs|cardio|full body|upper|lower|push|pull)\s+/i, '').trim();
            return cleaned;
        };

        return data.map((exercise: any, index: number) => ({
            id: exercise.id?.toString() || String(exercise.id) || `exercise-search-${index}-${exercise.Title}`,
            name: cleanTitle(exercise.Title || ''),
        }));
    } catch (error) {
        console.error('Error in searchExercises:', error);
        return [];
    }
};

