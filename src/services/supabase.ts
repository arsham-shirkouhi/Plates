import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase config is missing. Please check your .env file.');
    console.error('Required: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
    console.error('Current values:', {
        url: supabaseUrl ? 'Set (but may be incorrect)' : 'Missing',
        key: supabaseAnonKey ? 'Set (but may be incorrect)' : 'Missing',
    });
}

// Validate URL format
if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
    console.error('❌ Invalid Supabase URL format. Should start with https://');
    console.error('Expected format: https://xxxxx.supabase.co');
    console.error('Current value:', supabaseUrl);
}

// Validate anon key format (should be a JWT-like string)
if (supabaseAnonKey && !supabaseAnonKey.startsWith('eyJ')) {
    console.warn('⚠️ Supabase anon key format looks incorrect. Should start with "eyJ"');
    console.warn('Make sure you\'re using the "anon" or "public" key, not the "service_role" key');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
    },
});

