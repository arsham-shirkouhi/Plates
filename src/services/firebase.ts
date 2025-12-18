import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

// getReactNativePersistence exists at runtime but may not be in types for Firebase v10
// @ts-ignore - Type definitions may be incomplete
import { getReactNativePersistence } from 'firebase/auth';

const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('Firebase config is missing. Please check your .env file.');
}

// Initialize Firebase App
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// Initialize Auth with AsyncStorage persistence
// Use a function to ensure auth is initialized when needed
let _auth: ReturnType<typeof getAuth> | null = null;

function getAuthInstance() {
    if (!_auth) {
        try {
            _auth = initializeAuth(app, {
                persistence: getReactNativePersistence(AsyncStorage),
            });
        } catch (error: any) {
            // If auth is already initialized, get the existing instance
            if (error.code === 'auth/already-initialized') {
                _auth = getAuth(app);
            } else {
                console.error('Error initializing Firebase Auth:', error);
                // Fallback to getAuth if initializeAuth fails
                _auth = getAuth(app);
            }
        }
    }
    return _auth;
}

// Initialize auth immediately
export const auth = getAuthInstance();
export const db = getFirestore(app);

