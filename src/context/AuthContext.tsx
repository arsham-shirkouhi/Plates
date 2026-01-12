import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import * as AuthSession from 'expo-auth-session';
import { supabase } from '../services/supabase';
import { hasCompletedOnboarding as checkOnboardingStatus, initializeUser } from '../services/userService';

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
    hasCompletedOnboarding: () => Promise<boolean>;
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
        // Check if Supabase is configured before making network requests
        const { isSupabaseConfigured } = require('../services/supabase');
        if (!isSupabaseConfigured()) {
            console.warn('⚠️ Supabase not configured - skipping session check');
            setLoading(false);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            if (error) {
                // Handle network errors gracefully
                if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
                    console.error('❌ Network error: Could not connect to Supabase. Please check:');
                    console.error('   1. Your internet connection');
                    console.error('   2. Your Supabase URL is correct');
                    console.error('   3. Your device and computer are on the same network');
                    console.error('   4. Firewall is not blocking the connection');
                } else {
                    console.error('Error getting session:', error);
                }
                setLoading(false);
                return;
            }
            setUser(session?.user ?? null);
            setLoading(false);

            // Update last login for existing users
            if (session?.user) {
                updateLastLoginIfNeeded(session.user);
            }
        }).catch((error) => {
            // Handle network errors gracefully
            if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
                console.error('❌ Network error: Could not connect to Supabase. Please check:');
                console.error('   1. Your internet connection');
                console.error('   2. Your Supabase URL is correct');
                console.error('   3. Your device and computer are on the same network');
                console.error('   4. Firewall is not blocking the connection');
            } else {
                console.error('Error in getSession:', error);
            }
            setLoading(false);
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            const currentUser = session?.user ?? null;
            setUser(currentUser);

            if (currentUser && event === 'SIGNED_IN') {
                // Check if this is a new user (first time sign-in)
                // If user document doesn't exist, initialize it
                try {
                    const { getUserProfile, initializeUser, updateLastLogin } = await import('../services/userService');
                    const existingProfile = await getUserProfile(currentUser);
                    if (!existingProfile) {
                        // New user - initialize document
                        await initializeUser(currentUser);
                        console.log('New user - document initialized');
                    } else {
                        // Existing user - update last login
                        await updateLastLogin(currentUser);
                    }
                } catch (userError) {
                    console.error('Error checking/initializing user document:', userError);
                    // Don't throw - this shouldn't block auth state change
                }
            }

            setLoading(false);
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const updateLastLoginIfNeeded = async (user: User) => {
        try {
            const { getUserProfile, updateLastLogin } = await import('../services/userService');
            const profile = await getUserProfile(user);
            if (profile) {
                // User exists - update last login
                await updateLastLogin(user);
            }
            // If profile doesn't exist, it will be initialized on next signup/login
        } catch (error) {
            console.error('Error updating last login:', error);
            // Don't block auth state change
        }
    };

    const login = async (email: string, password: string) => {
        try {
            // Check if Supabase is configured
            const { isSupabaseConfigured } = require('../services/supabase');
            if (!isSupabaseConfigured()) {
                throw new Error('Supabase is not configured. Please check your .env file and restart the app.');
            }

            console.log('Attempting login for email:', email);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                throw error;
            }

            console.log('Login successful, user ID:', data.user?.id);
            console.log('Email confirmed:', data.user?.email_confirmed_at ? 'Yes' : 'No');
            // Note: Supabase allows login even if email isn't confirmed
            // The app will handle redirecting to verification screen if needed
        } catch (error: any) {
            console.error('Login error details:', {
                message: error.message,
                email: email,
            });
            // Re-throw to let the UI handle the error
            throw error;
        }
    };

    const signup = async (email: string, password: string) => {
        try {
            // Check if Supabase is configured
            const { isSupabaseConfigured } = require('../services/supabase');
            if (!isSupabaseConfigured()) {
                throw new Error('Supabase is not configured. Please check your .env file and restart the app.');
            }

            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: undefined, // We'll handle verification manually
                },
            });

            if (error) {
                throw error;
            }

            const newUser = data.user;
            if (!newUser) {
                throw new Error('User creation failed - no user returned');
            }

            // Initialize user document in Supabase
            try {
                await initializeUser(newUser);
                console.log('User document initialized');
            } catch (initError) {
                console.error('Error initializing user document:', initError);
                // Don't throw - initialization failure shouldn't block signup
            }

            // Supabase automatically sends verification email on signup
            // Sign out the user so they need to verify email first
            try {
                await supabase.auth.signOut();
                console.log('Verification email sent successfully');
            } catch (signOutError: any) {
                console.error('Error signing out after signup:', signOutError);
                // Don't throw - signup was successful, signout failure is not critical
            }
        } catch (error: any) {
            console.error('Supabase signup error:', error);
            throw error;
        }
    };

    const sendVerificationEmail = async () => {
        const currentUser = (await supabase.auth.getUser()).data.user;
        if (!currentUser) {
            throw new Error('User not found. Please log in again.');
        }
        if (currentUser.email_confirmed_at) {
            throw new Error('Email is already verified');
        }
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: currentUser.email!,
            });
            if (error) {
                throw error;
            }
            console.log('Verification email sent successfully');
        } catch (error: any) {
            console.error('Error sending verification email:', error);
            throw error;
        }
    };

    const reloadUser = async () => {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
            setUser(currentUser);
            return currentUser;
        }
        return null;
    };

    const loginWithGoogle = async () => {
        try {
            // Check if Supabase is configured
            const { isSupabaseConfigured } = require('../services/supabase');
            if (!isSupabaseConfigured()) {
                throw new Error('Supabase is not configured. Please check your .env file and restart the app.');
            }

            // For React Native/Expo, we need to use a redirect URL
            // You'll need to configure this in your Supabase project settings
            // and set up deep linking in your app
            const redirectUrl = AuthSession.makeRedirectUri({
                useProxy: true,
            });

            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: redirectUrl,
                },
            });

            if (error) {
                throw error;
            }

            // The OAuth flow will open a browser and redirect back
            // The auth state change listener will handle the session when it's established
            // Note: You need to configure the redirect URL in Supabase dashboard:
            // Authentication > URL Configuration > Redirect URLs
            
            // For Expo, you may need to handle the deep link callback
            // This is typically handled automatically by expo-auth-session
        } catch (error: any) {
            console.error('Google sign-in error:', error);
            // Re-throw with more context if it's a redirect URI error
            if (error?.message?.includes('redirect_uri_mismatch') || error?.message?.includes('redirect')) {
                throw new Error('Redirect URI mismatch. Please check your Supabase project settings for the correct redirect URI.');
            }
            throw error;
        }
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            throw error;
        }
    };

    const resetPassword = async (email: string) => {
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: undefined, // We'll handle this in the app
            });
            if (error) {
                throw error;
            }
            console.log('Password reset email sent successfully');
        } catch (error: any) {
            console.error('Error sending password reset email:', error);
            throw error;
        }
    };

    const hasCompletedOnboarding = async (): Promise<boolean> => {
        if (!user) {
            return false;
        }
        return await checkOnboardingStatus(user);
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
        hasCompletedOnboarding,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
