# Firebase to Supabase Migration Guide

This document outlines the migration from Firebase to Supabase and the setup steps required.

## What Changed

### Dependencies
- **Removed**: `firebase` package
- **Added**: `@supabase/supabase-js` and `@react-native-async-storage/async-storage`

### Services
- **Replaced**: `src/services/firebase.ts` → `src/services/supabase.ts`
- **Updated**: `src/context/AuthContext.tsx` - Now uses Supabase Auth
- **Updated**: `src/services/userService.ts` - Now uses Supabase Postgres instead of Firestore
- **Updated**: `src/utils/errorHandler.ts` - Updated error codes for Supabase
- **Removed**: `src/services/googleAuth.ts` - Supabase handles OAuth natively

### Database
- **Replaced**: Firestore collections → Supabase Postgres tables
- **Schema**: See `supabase-schema.sql` for the database schema

## Setup Instructions

### 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Note your project URL and anon key (found in Settings > API)

### 2. Set Up Environment Variables

Add these to your `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your-project-url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Set Up Database Schema

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase-schema.sql`
4. Run the SQL script to create all tables, indexes, and RLS policies

### 4. Configure Authentication

#### Email/Password Auth
- Go to Authentication > Providers
- Enable "Email" provider
- Configure email templates if needed

#### Google OAuth
1. Go to Authentication > Providers
2. Enable "Google" provider
3. Add your Google OAuth credentials:
   - Client ID (from Google Cloud Console)
   - Client Secret (from Google Cloud Console)
4. Add redirect URLs:
   - For Expo development: `https://auth.expo.io/@your-username/plates`
   - For production: Your app's deep link URL
5. In Google Cloud Console, add the Supabase redirect URL to authorized redirect URIs:
   - Format: `https://[your-project-ref].supabase.co/auth/v1/callback`

### 5. Update App Configuration

#### Deep Linking (for OAuth)
Add to your `app.json`:

```json
{
  "expo": {
    "scheme": "plates",
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "plates"
            }
          ]
        }
      ]
    },
    "ios": {
      "bundleIdentifier": "com.yourcompany.plates"
    }
  }
}
```

### 6. Test the Migration

1. Start your app: `npm start`
2. Test email/password signup and login
3. Test Google OAuth (if configured)
4. Test onboarding flow
5. Test daily macro logging

## Key Differences from Firebase

### Authentication
- **Email verification**: Supabase sends verification emails automatically on signup
- **User object**: Supabase User type is different from Firebase User
- **Session management**: Supabase uses JWT tokens stored in AsyncStorage

### Database
- **Queries**: Use Supabase client methods instead of Firestore queries
- **Real-time**: Supabase supports real-time subscriptions (not implemented yet)
- **RLS**: Row Level Security policies replace Firestore security rules

### Error Handling
- Error messages are different - see `src/utils/errorHandler.ts` for mappings

## Migration Checklist

- [x] Install Supabase dependencies
- [x] Create Supabase client service
- [x] Create database schema SQL
- [x] Update AuthContext
- [x] Update userService
- [x] Update error handler
- [x] Update navigation types
- [x] Remove Firebase files
- [ ] Set up Supabase project
- [ ] Configure environment variables
- [ ] Run database schema SQL
- [ ] Configure Google OAuth (if needed)
- [ ] Test all authentication flows
- [ ] Test database operations
- [ ] Migrate existing data (if any)

## Data Migration (If Needed)

If you have existing Firebase data, you'll need to:

1. Export data from Firestore
2. Transform data to match Supabase schema
3. Import into Supabase using the SQL editor or API

Example transformation:
- Firestore `users/{userId}` → Supabase `users` table with `id = userId`
- Firestore `users/{userId}/dailyLogs/{date}` → Supabase `daily_logs` table
- Firestore `usernames/{username}` → Supabase `usernames` table

## Troubleshooting

### "Supabase config is missing" error
- Check that `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are set in `.env`
- Restart Expo after adding environment variables

### OAuth redirect errors
- Verify redirect URLs match exactly in both Supabase and Google Cloud Console
- Check that deep linking is configured in `app.json`

### Database permission errors
- Verify RLS policies are enabled and correct
- Check that user is authenticated before database operations

### Email verification not working
- Check Supabase email settings
- Verify SMTP configuration if using custom email provider

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)

