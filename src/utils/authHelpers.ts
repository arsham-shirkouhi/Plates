import { User } from '@supabase/supabase-js';

/**
 * Check if a Supabase user's email is verified
 * @param user - Supabase user object
 * @returns true if email is verified, false otherwise
 */
export const isEmailVerified = (user: User | null): boolean => {
    if (!user) {
        return false;
    }
    // Supabase uses email_confirmed_at (timestamp) instead of emailVerified (boolean)
    return !!user.email_confirmed_at;
};

