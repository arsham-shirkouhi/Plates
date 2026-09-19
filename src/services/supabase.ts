import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => {
    return !!(supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('https://'));
};

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('❌ SUPABASE CONFIGURATION MISSING');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
    console.error('Current status:');
    console.error('  EXPO_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
    console.error('  EXPO_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✅ Set' : '❌ Missing');
    console.error('');
    console.error('📝 HOW TO FIX:');
    console.error('');
    console.error('1. Create a file named ".env" in the root directory (same level as package.json)');
    console.error('');
    console.error('2. Add these two lines to the .env file:');
    console.error('   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co');
    console.error('   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
    console.error('');
    console.error('3. Get your values from Supabase:');
    console.error('   - Go to https://app.supabase.com');
    console.error('   - Select your project');
    console.error('   - Go to Settings > API');
    console.error('   - Copy "Project URL" → EXPO_PUBLIC_SUPABASE_URL');
    console.error('   - Copy "anon public" key → EXPO_PUBLIC_SUPABASE_ANON_KEY');
    console.error('');
    console.error('4. Restart Expo with cleared cache:');
    console.error('   npx expo start --clear');
    console.error('');
    console.error('═══════════════════════════════════════════════════════════');
    console.error('');
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.error('');
    console.error('❌ INVALID SUPABASE URL FORMAT');
    console.error('   Expected: https://xxxxx.supabase.co');
    console.error('   Current: ' + supabaseUrl);
    console.error('   Fix: Make sure the URL starts with "https://"');
    console.error('');
}

// Supabase supports both legacy JWT anon keys and current publishable keys.
const isSupportedPublicKey = (key: string): boolean =>
    key.startsWith('eyJ') || key.startsWith('sb_publishable_');

if (supabaseAnonKey && !isSupportedPublicKey(supabaseAnonKey)) {
    // Keep this a warning: validation must not turn an otherwise usable app
    // startup into an Expo red-screen error.
    console.warn('⚠️ Supabase public key format looks unusual. Expected a legacy anon key (eyJ...) or publishable key (sb_publishable_...).');
    if (supabaseAnonKey.startsWith('sb_secret_')) {
        console.warn('❌ Supabase secret keys must never be used in a mobile app. Use the publishable key instead.');
    }
}

// Create Supabase client with error handling
// Use empty strings if not configured to prevent immediate crashes
// The app will handle the error gracefully
export const supabase = createClient(
    supabaseUrl || 'https://placeholder.supabase.co',
    supabaseAnonKey || 'placeholder-key',
    {
        auth: {
            storage: AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false,
        },
    }
);
