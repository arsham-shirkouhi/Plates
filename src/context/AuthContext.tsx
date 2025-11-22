import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendEmailVerification, reload, signInWithCredential, GoogleAuthProvider, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { getGoogleIdToken } from '../services/googleAuth';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (email: string, password: string) => Promise<void>;
    loginWithGoogle: () => Promise<void>;
    logout: () => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    reloadUser: () => Promise<User | null>;
    resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                await reload(user);
                setUser(user);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const login = async (email: string, password: string) => {
        try {
            console.log('Attempting login for email:', email);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            console.log('Login successful, user ID:', userCredential.user.uid);
            console.log('Email verified:', userCredential.user.emailVerified);
            // Note: Firebase allows login even if email isn't verified
            // The app will handle redirecting to verification screen if needed
        } catch (error: any) {
            console.error('Login error details:', {
                code: error.code,
                message: error.message,
                email: email,
            });
            // Re-throw to let the UI handle the error
            throw error;
        }
    };

    const signup = async (email: string, password: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            try {
                await sendEmailVerification(userCredential.user);
                console.log('Verification email sent successfully');
                await signOut(auth);
            } catch (verifyError: any) {
                console.error('Error sending verification email:', verifyError);
                await signOut(auth);
                throw verifyError;
            }
        } catch (error: any) {
            console.error('Firebase signup error:', error);
            throw error;
        }
    };

    const sendVerificationEmail = async () => {
        if (!auth.currentUser) {
            throw new Error('User not found. Please log in again.');
        }
        if (auth.currentUser.emailVerified) {
            throw new Error('Email is already verified');
        }
        try {
            await sendEmailVerification(auth.currentUser);
            console.log('Verification email sent successfully');
        } catch (error: any) {
            console.error('Error sending verification email:', error);
            throw error;
        }
    };

    const reloadUser = async () => {
        if (auth.currentUser) {
            await reload(auth.currentUser);
            const updatedUser = auth.currentUser;
            setUser(updatedUser);
            return updatedUser;
        }
        return null;
    };

    const loginWithGoogle = async () => {
        try {
            const idToken = await getGoogleIdToken();
            if (!idToken) {
                throw new Error('Google sign-in was cancelled or failed - no ID token received');
            }
            const credential = GoogleAuthProvider.credential(idToken);
            await signInWithCredential(auth, credential);
        } catch (error: any) {
            console.error('Google sign-in error:', error);
            // Re-throw with more context if it's a redirect URI error
            if (error?.message?.includes('redirect_uri_mismatch') || error?.message?.includes('redirect')) {
                throw new Error('Redirect URI mismatch. Please check the console for the redirect URI and add it to Google Cloud Console. See GOOGLE_REDIRECT_URI_FIX.md for instructions.');
            }
            throw error;
        }
    };

    const logout = async () => {
        await signOut(auth);
    };

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
            console.log('Password reset email sent successfully');
        } catch (error: any) {
            console.error('Error sending password reset email:', error);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        sendVerificationEmail,
        reloadUser,
        resetPassword,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

