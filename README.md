# Plates

React Native app built with Expo, TypeScript, and Supabase.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory with your Supabase config:
```
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

   To get these values:
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project (or create a new one)
   - Go to **Settings > API**
   - Copy the **Project URL** and paste it as `EXPO_PUBLIC_SUPABASE_URL`
   - Copy the **anon public** key and paste it as `EXPO_PUBLIC_SUPABASE_ANON_KEY`

3. Start the app:
```bash
npm start
```

## Troubleshooting

### "Network request failed" Error

If you see a "TypeError: Network request failed" error when scanning the QR code:

1. **Check your `.env` file exists and has correct values:**
   - Make sure the file is named `.env` (not `.env.example`)
   - Verify `EXPO_PUBLIC_SUPABASE_URL` starts with `https://`
   - Verify `EXPO_PUBLIC_SUPABASE_ANON_KEY` starts with `eyJ`

2. **Restart Expo with cache cleared:**
   ```bash
   npx expo start --clear
   ```

3. **Check network connectivity:**
   - Ensure your phone and computer are on the same Wi-Fi network
   - Try using the tunnel connection: `npx expo start --tunnel`
   - Check if your firewall is blocking connections

4. **Verify Supabase project is active:**
   - Check your Supabase project dashboard to ensure it's not paused
   - Verify the URL and key are correct in your Supabase project settings

