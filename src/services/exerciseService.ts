import { supabase } from './supabase';
import {
    getMockExerciseDetails,
    getMockExercisesPage,
    searchMockExercises,
} from '../workout/mockWorkoutData';

export interface Exercise {
    id: string;
    name: string;
    bodyPart?: string;
}

export interface ExerciseDetails {
    id: string;
    Title: string;
    Desc?: string;
    Type?: string;
    BodyPart?: string;
    Equipment?: string;
    Level?: string;
}

/** When Supabase has no exercises table, skip network and use mock catalog. */
let exercisesRemoteStatus: 'unknown' | 'available' | 'unavailable' = 'unknown';
let exercisesUnavailableLogged = false;
let exercisesUnavailablePersisted = false;
const EXERCISES_UNAVAILABLE_KEY = '@plates/exercises-remote-unavailable/v1';

function isExercisesTableMissing(error: { code?: string; message?: string }): boolean {
    return (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.message?.includes('Could not find the table') === true ||
        error.message?.includes('schema cache') === true
    );
}

function logExercisesUnavailableOnce(reason: string): void {
    if (exercisesUnavailableLogged) return;
    exercisesUnavailableLogged = true;
    console.warn(
        `[exerciseService] Supabase exercises table unavailable (${reason}). Using local mock exercise catalog.`
    );
}

async function loadExercisesUnavailableFlag(): Promise<boolean> {
    if (exercisesUnavailablePersisted) {
        return exercisesRemoteStatus === 'unavailable';
    }
    try {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        const value = await AsyncStorage.getItem(EXERCISES_UNAVAILABLE_KEY);
        exercisesUnavailablePersisted = true;
        if (value === '1') {
            exercisesRemoteStatus = 'unavailable';
            return true;
        }
    } catch {
        // ignore storage read failures
    }
    return false;
}

async function persistExercisesUnavailableFlag(): Promise<void> {
    if (exercisesUnavailablePersisted && exercisesRemoteStatus === 'unavailable') return;
    try {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.setItem(EXERCISES_UNAVAILABLE_KEY, '1');
        exercisesUnavailablePersisted = true;
    } catch {
        // ignore storage write failures
    }
}

function markExercisesUnavailable(reason: string): void {
    exercisesRemoteStatus = 'unavailable';
    logExercisesUnavailableOnce(reason);
    void persistExercisesUnavailableFlag();
}

function cleanTitle(title: string): string {
    if (!title) return '';
    let cleaned = title.replace(/^30\s*/, '').trim();
    cleaned = cleaned.replace(
        /^(arms|legs|chest|back|shoulders|core|abs|cardio|full body|upper|lower|push|pull)\s*[-:]\s*/i,
        ''
    ).trim();
    cleaned = cleaned.replace(
        /^(arms|legs|chest|back|shoulders|core|abs|cardio|full body|upper|lower|push|pull)\s+/i,
        ''
    ).trim();
    return cleaned;
}

function mapRemoteRows(data: unknown[]): Exercise[] {
    return data
        .filter((row): row is Record<string, unknown> => !!row && typeof row === 'object')
        .filter((exercise) => typeof exercise.Title === 'string' && exercise.Title.length > 0)
        .map((exercise, index) => ({
            id:
                exercise.Id?.toString() ||
                String(exercise.Id) ||
                `exercise-${index}-${exercise.Title}`,
            name: cleanTitle(String(exercise.Title)),
            bodyPart: typeof exercise.BodyPart === 'string' ? exercise.BodyPart : '',
        }));
}

/**
 * Fetch exercises from the exercises table with pagination
 * @param limit - Number of exercises to fetch (default: 20)
 * @param offset - Number of exercises to skip (default: 0)
 */
export const getExercisesList = async (limit: number = 20, offset: number = 0): Promise<Exercise[]> => {
    if (exercisesRemoteStatus === 'unavailable') {
        return getMockExercisesPage(limit, offset);
    }

    if (exercisesRemoteStatus === 'unknown') {
        const cachedUnavailable = await loadExercisesUnavailableFlag();
        if (cachedUnavailable) {
            return getMockExercisesPage(limit, offset);
        }
    }

    try {
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .order('Title', { ascending: true })
            .range(offset, offset + limit - 1);

        if (error) {
            if (isExercisesTableMissing(error)) {
                markExercisesUnavailable(error.code ?? 'missing table');
            } else {
                console.warn('[exerciseService] getExercisesList failed, using mock catalog:', error.message);
            }
            return getMockExercisesPage(limit, offset);
        }

        if (!data || data.length === 0) {
            return getMockExercisesPage(limit, offset);
        }

        exercisesRemoteStatus = 'available';
        const exercises = mapRemoteRows(data);
        return exercises.length > 0 ? exercises : getMockExercisesPage(limit, offset);
    } catch (error) {
        console.warn('[exerciseService] getExercisesList exception, using mock catalog:', error);
        return getMockExercisesPage(limit, offset);
    }
};

/**
 * Search exercises by name
 */
export const searchExercises = async (query: string): Promise<Exercise[]> => {
    if (exercisesRemoteStatus === 'unavailable') {
        return searchMockExercises(query);
    }

    if (exercisesRemoteStatus === 'unknown') {
        const cachedUnavailable = await loadExercisesUnavailableFlag();
        if (cachedUnavailable) {
            return searchMockExercises(query);
        }
    }

    try {
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .ilike('Title', `%${query}%`)
            .order('Title', { ascending: true })
            .limit(100);

        if (error) {
            if (isExercisesTableMissing(error)) {
                markExercisesUnavailable(error.code ?? 'missing table');
            }
            return searchMockExercises(query);
        }

        if (!data || data.length === 0) {
            return searchMockExercises(query);
        }

        exercisesRemoteStatus = 'available';
        const mapped = mapRemoteRows(data);
        return mapped.length > 0 ? mapped : searchMockExercises(query);
    } catch {
        return searchMockExercises(query);
    }
};

/**
 * Get full exercise details by ID
 */
export const getExerciseDetails = async (exerciseId: string): Promise<ExerciseDetails | null> => {
    if (exercisesRemoteStatus === 'unavailable') {
        return getMockExerciseDetails(exerciseId);
    }

    if (exercisesRemoteStatus === 'unknown') {
        const cachedUnavailable = await loadExercisesUnavailableFlag();
        if (cachedUnavailable) {
            return getMockExerciseDetails(exerciseId);
        }
    }

    try {
        const { data, error } = await supabase
            .from('exercises')
            .select('*')
            .eq('Id', exerciseId)
            .maybeSingle();

        if (error) {
            if (isExercisesTableMissing(error)) {
                markExercisesUnavailable(error.code ?? 'missing table');
            }
            return getMockExerciseDetails(exerciseId);
        }

        if (!data) {
            return getMockExerciseDetails(exerciseId);
        }

        exercisesRemoteStatus = 'available';
        return {
            id: data.Id?.toString() || String(data.Id),
            Title: data.Title || '',
            Desc: data.Desc || data.Description || '',
            Type: data.Type || '',
            BodyPart: data.BodyPart || '',
            Equipment: data.Equipment || '',
            Level: data.Level || '',
        };
    } catch {
        return getMockExerciseDetails(exerciseId);
    }
};
