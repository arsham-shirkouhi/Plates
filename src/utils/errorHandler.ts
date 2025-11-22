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
            return 'wrong email/password';

        case 'auth/wrong-password':
            return 'wrong email/password';

        case 'auth/invalid-email':
            return 'invalid email';

        case 'auth/user-disabled':
            return 'account disabled';

        case 'auth/invalid-credential':
            return 'wrong email/password';

        // Signup errors
        case 'auth/email-already-in-use':
            return 'email already exists';

        case 'auth/weak-password':
            return 'password too weak';

        case 'auth/operation-not-allowed':
            return 'operation not allowed';

        // Network errors
        case 'auth/network-request-failed':
            return 'network error';

        case 'auth/too-many-requests':
            return 'too many requests';

        // Verification errors
        case 'auth/email-already-verified':
            return 'email verified';

        // Generic errors
        case 'auth/internal-error':
            return 'internal error';

        case 'auth/invalid-action-code':
            return 'invalid link';

        case 'auth/expired-action-code':
            return 'link expired';

        default:
            // Try to extract a user-friendly message from the error
            if (error.message) {
                // Remove Firebase error prefix if present
                const message = error.message.replace(/^Firebase:?\s*/i, '');
                if (message && message !== errorCode) {
                    // Shorten default messages too
                    return message.length > 20 ? 'error occurred' : message;
                }
            }
            return 'error occurred';
    }
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

