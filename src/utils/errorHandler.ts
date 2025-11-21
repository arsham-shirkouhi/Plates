export const getAuthErrorMessage = (error: any): string => {
    if (!error) {
        return 'An unknown error occurred';
    }

    // Extract error code from various possible formats
    let errorCode = error.code;
    if (!errorCode && error.message) {
        const match = error.message.match(/auth\/([a-z-]+)/i);
        if (match) {
            errorCode = `auth/${match[1]}`;
        }
    }

    // Log for debugging
    console.log('Error object:', error);
    console.log('Error code:', errorCode);
    console.log('Error message:', error.message);

    switch (errorCode) {
        // Login errors
        case 'auth/user-not-found':
            return 'No account found with this email address. Please sign up first.';

        case 'auth/wrong-password':
            return 'Incorrect password. Please try again.';

        case 'auth/invalid-email':
            return 'Invalid email address. Please check and try again.';

        case 'auth/user-disabled':
            return 'This account has been disabled. Please contact support.';

        case 'auth/invalid-credential':
            return 'Invalid email or password. Please check your credentials and try again.';

        // Signup errors
        case 'auth/email-already-in-use':
            return 'An account with this email already exists. Please log in instead.';

        case 'auth/weak-password':
            return 'Password is too weak. Please use a stronger password (at least 6 characters).';

        case 'auth/operation-not-allowed':
            return 'Email/password accounts are not enabled. Please contact support.';

        // Network errors
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection and try again.';

        case 'auth/too-many-requests':
            return 'Too many requests. Please wait a few minutes before trying again.';

        // Verification errors
        case 'auth/email-already-verified':
            return 'This email is already verified.';

        // Generic errors
        case 'auth/internal-error':
            return 'An internal error occurred. Please try again later.';

        case 'auth/invalid-action-code':
            return 'Invalid verification link. The link may have expired.';

        case 'auth/expired-action-code':
            return 'This verification link has expired. Please request a new one.';

        default:
            // Try to extract a user-friendly message from the error
            if (error.message) {
                // Remove Firebase error prefix if present
                const message = error.message.replace(/^Firebase:?\s*/i, '');
                if (message && message !== errorCode) {
                    return message;
                }
            }
            return 'An error occurred. Please try again.';
    }
};

export const validateEmail = (email: string): { valid: boolean; message?: string } => {
    if (!email) {
        return { valid: false, message: 'Email is required' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return { valid: false, message: 'Please enter a valid email address' };
    }

    return { valid: true };
};

export const validatePassword = (password: string): { valid: boolean; message?: string } => {
    if (!password) {
        return { valid: false, message: 'Password is required' };
    }

    if (password.length < 6) {
        return { valid: false, message: 'Password must be at least 6 characters' };
    }

    return { valid: true };
};

