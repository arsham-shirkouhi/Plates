export const getAuthErrorMessage = (error: any): string => {
    if (!error) {
        return 'An unknown error occurred';
    }

    // Extract error message from Supabase errors
    let errorMessage = error.message || '';
    
    // Supabase error codes are typically in the message
    // Common patterns: "Invalid login credentials", "Email not confirmed", etc.
    
    // Log for debugging
    console.log('Error object:', error);
    console.log('Error message:', errorMessage);

    // Supabase Auth Error Messages
    if (errorMessage.includes('Invalid login credentials') || 
        errorMessage.includes('Invalid credentials') ||
        errorMessage.includes('Email or password is incorrect')) {
        return 'wrong email/password';
    }

    if (errorMessage.includes('Email not confirmed') || 
        errorMessage.includes('email_not_confirmed')) {
        return 'email not verified';
    }

    if (errorMessage.includes('Email already registered') || 
        errorMessage.includes('User already registered') ||
        errorMessage.includes('already registered')) {
        return 'email already exists';
    }

    if (errorMessage.includes('Password should be at least') || 
        errorMessage.includes('Password is too weak') ||
        errorMessage.includes('weak password')) {
        return 'password too weak';
    }

    if (errorMessage.includes('Invalid email') || 
        errorMessage.includes('invalid email')) {
        return 'invalid email';
    }

    if (errorMessage.includes('User not found') || 
        errorMessage.includes('user_not_found')) {
        return 'wrong email/password';
    }

    if (errorMessage.includes('Too many requests') || 
        errorMessage.includes('too_many_requests')) {
        return 'too many requests';
    }

    if (errorMessage.includes('Network') || 
        errorMessage.includes('network') ||
        errorMessage.includes('Failed to fetch')) {
        return 'network error';
    }

    if (errorMessage.includes('Email already verified') || 
        errorMessage.includes('already verified')) {
        return 'email verified';
    }

    // Generic errors
    if (errorMessage.includes('Internal error') || 
        errorMessage.includes('internal_error')) {
        return 'internal error';
    }

    // Try to extract a user-friendly message from the error
    if (errorMessage) {
        // Remove Supabase error prefix if present
        const message = errorMessage.replace(/^Supabase:?\s*/i, '');
        if (message && message.length > 0) {
            // Shorten default messages too
            return message.length > 30 ? 'error occurred' : message;
        }
    }
    
    return 'error occurred';
};

export const validateEmail = (email: string): { valid: boolean; message?: string } => {
    if (!email) {
        return { valid: false, message: 'email required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'invalid email' };
    }

    return { valid: true };
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (!password) {
        return { valid: false, message: 'password required' };
    }

    if (password.length < 6) {
        return { valid: false, message: 'password too short' };
    }

    return { valid: true };
};
