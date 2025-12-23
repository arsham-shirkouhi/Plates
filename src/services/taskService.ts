import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';
import { getTodayDateString } from './userService';

// ============================================================================
// DATABASE SCHEMA
// ============================================================================

/**
 * Daily Task Schema
 * Stored in: daily_tasks table
 */
export interface DailyTask {
    id: string;
    user_id: string;
    log_date: string; // Format: YYYY-MM-DD
    title: string;
    is_completed: boolean;
    completed_at: string | null;
    created_at: string;
}

/**
 * Daily Summary Schema
 * Stored in: daily_summaries table
 */
export interface DailySummary {
    user_id: string;
    log_date: string; // Format: YYYY-MM-DD
    tasks_total: number;
    tasks_completed: number;
    completion_rate: number;
    streak_value: number | null;
    notes: string | null;
    generated_at: string;
}

// ============================================================================
// DAILY TASKS FUNCTIONS
// ============================================================================

/**
 * Get all tasks for a specific date
 * @param user - Supabase user
 * @param date - Date string in format YYYY-MM-DD (defaults to today)
 */
export const getDailyTasks = async (user: User, date?: string): Promise<DailyTask[]> => {
    try {
        const dateStr = date || getTodayDateString();
        const { data, error } = await supabase
            .from('daily_tasks')
            .select('*')
            .eq('user_id', user.id)
            .eq('log_date', dateStr)
            .order('created_at', { ascending: true });

        if (error) {
            throw error;
        }

        return (data || []) as DailyTask[];
    } catch (error) {
        console.error('Error getting daily tasks:', error);
        return [];
    }
};

/**
 * Create a new task
 * @param user - Supabase user
 * @param title - Task title
 * @param date - Date string in format YYYY-MM-DD (defaults to today)
 */
export const createDailyTask = async (
    user: User,
    title: string,
    date?: string
): Promise<DailyTask | null> => {
    try {
        const dateStr = date || getTodayDateString();
        const trimmedTitle = title.trim();
        
        // Check if task already exists (due to unique constraint)
        const { data: existing } = await supabase
            .from('daily_tasks')
            .select('*')
            .eq('user_id', user.id)
            .eq('log_date', dateStr)
            .eq('title', trimmedTitle)
            .single();

        if (existing) {
            // Task already exists, return it
            return existing as DailyTask;
        }

        const { data, error } = await supabase
            .from('daily_tasks')
            .insert({
                user_id: user.id,
                log_date: dateStr,
                title: trimmedTitle,
                is_completed: false,
            })
            .select()
            .single();

        if (error) {
            // If it's a unique constraint error, try to fetch the existing task
            if (error.code === '23505') {
                const { data: existingTask } = await supabase
                    .from('daily_tasks')
                    .select('*')
                    .eq('user_id', user.id)
                    .eq('log_date', dateStr)
                    .eq('title', trimmedTitle)
                    .single();
                
                if (existingTask) {
                    return existingTask as DailyTask;
                }
            }
            throw error;
        }

        return data as DailyTask;
    } catch (error) {
        console.error('Error creating daily task:', error);
        throw error;
    }
};

/**
 * Update a task (mark as completed/uncompleted)
 * @param user - Supabase user
 * @param taskId - Task ID
 * @param updates - Updates to apply
 */
export const updateDailyTask = async (
    user: User,
    taskId: string,
    updates: {
        is_completed?: boolean;
        title?: string;
    }
): Promise<DailyTask | null> => {
    try {
        const updateData: any = { ...updates };
        
        // If marking as completed, set completed_at timestamp
        if (updates.is_completed === true) {
            updateData.completed_at = new Date().toISOString();
        } else if (updates.is_completed === false) {
            updateData.completed_at = null;
        }

        const { data, error } = await supabase
            .from('daily_tasks')
            .update(updateData)
            .eq('id', taskId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data as DailyTask;
    } catch (error) {
        console.error('Error updating daily task:', error);
        throw error;
    }
};

/**
 * Delete a task
 * @param user - Supabase user
 * @param taskId - Task ID
 */
export const deleteDailyTask = async (user: User, taskId: string): Promise<void> => {
    try {
        const { error } = await supabase
            .from('daily_tasks')
            .delete()
            .eq('id', taskId)
            .eq('user_id', user.id);

        if (error) {
            throw error;
        }
    } catch (error) {
        console.error('Error deleting daily task:', error);
        throw error;
    }
};

/**
 * Generate or update daily summary for a date
 * This should be called at the end of the day or when tasks change
 * @param user - Supabase user
 * @param date - Date string in format YYYY-MM-DD (defaults to today)
 */
export const generateDailySummary = async (user: User, date?: string): Promise<DailySummary | null> => {
    try {
        const dateStr = date || getTodayDateString();
        
        // Get all tasks for the date
        const tasks = await getDailyTasks(user, dateStr);
        const tasksTotal = tasks.length;
        const tasksCompleted = tasks.filter(t => t.is_completed).length;
        const completionRate = tasksTotal > 0 ? (tasksCompleted / tasksTotal) * 100 : 0;

        // Get streak from user profile (or calculate from summaries)
        const { data: userProfile } = await supabase
            .from('users')
            .select('streak')
            .eq('id', user.id)
            .single();

        const streakValue = userProfile?.streak || null;

        // Upsert summary
        const { data, error } = await supabase
            .from('daily_summaries')
            .upsert({
                user_id: user.id,
                log_date: dateStr,
                tasks_total: tasksTotal,
                tasks_completed: tasksCompleted,
                completion_rate: completionRate,
                streak_value: streakValue,
                generated_at: new Date().toISOString(),
            }, {
                onConflict: 'user_id,log_date',
            })
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data as DailySummary;
    } catch (error) {
        console.error('Error generating daily summary:', error);
        throw error;
    }
};

/**
 * Get daily summary for a specific date
 * @param user - Supabase user
 * @param date - Date string in format YYYY-MM-DD
 */
export const getDailySummary = async (user: User, date: string): Promise<DailySummary | null> => {
    try {
        const { data, error } = await supabase
            .from('daily_summaries')
            .select('*')
            .eq('user_id', user.id)
            .eq('log_date', date)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // Not found
                return null;
            }
            throw error;
        }

        return data as DailySummary;
    } catch (error) {
        console.error('Error getting daily summary:', error);
        return null;
    }
};

/**
 * Get daily summaries for a date range
 * @param user - Supabase user
 * @param startDate - Start date string in format YYYY-MM-DD
 * @param endDate - End date string in format YYYY-MM-DD
 */
export const getDailySummariesRange = async (
    user: User,
    startDate: string,
    endDate: string
): Promise<DailySummary[]> => {
    try {
        const { data, error } = await supabase
            .from('daily_summaries')
            .select('*')
            .eq('user_id', user.id)
            .gte('log_date', startDate)
            .lte('log_date', endDate)
            .order('log_date', { ascending: false });

        if (error) {
            throw error;
        }

        return (data || []) as DailySummary[];
    } catch (error) {
        console.error('Error getting daily summaries range:', error);
        return [];
    }
};

