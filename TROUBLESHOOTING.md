# Troubleshooting Guide

## "Network request failed" Error

If you see `TypeError: Network request failed` errors in your terminal, follow these steps:

### Step 1: Check Your `.env` File

1. **Verify the file exists:**
   - The file must be named exactly `.env` (not `.env.txt` or `.env.example`)
   - It should be in the root directory (same folder as `package.json`)

2. **Check the file format:**
   ```env
   EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```
   
   ⚠️ **Important:**
   - No spaces around the `=` sign
   - No quotes around the values (unless they contain spaces)
   - The anon key MUST start with `eyJ` (it's a JWT token)
   - The URL MUST start with `https://`

### Step 2: Verify Your Supabase Credentials

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Select your project
3. Go to **Settings > API**
4. Verify:
   - **Project URL**: Should look like `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: Should start with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
   
   ⚠️ **DO NOT use the `service_role` key** - that's secret and should never be in client code!

### Step 3: Restart Expo with Cleared Cache

After creating or modifying your `.env` file, you MUST restart Expo:

```bash
npx expo start --clear
```

The `--clear` flag clears the Metro bundler cache, which is necessary for environment variables to be reloaded.

### Step 4: Check Network Connectivity

If the `.env` file is correct but you still get network errors:

1. **Same Wi-Fi Network:**
   - Your phone and computer must be on the same Wi-Fi network
   - Try disconnecting and reconnecting both devices

2. **Use Tunnel Mode:**
   ```bash
   npx expo start --tunnel
   ```
   This uses Expo's tunnel service and works even if devices are on different networks.

3. **Check Firewall:**
   - Windows Firewall or antivirus might be blocking connections
   - Try temporarily disabling firewall to test

4. **Verify Supabase Project Status:**
   - Check your Supabase dashboard to ensure the project is active (not paused)
   - Free tier projects can be paused after inactivity

### Step 5: Verify Environment Variables Are Loaded

Add this temporary debug code to check if variables are loaded:

```typescript
// In src/services/supabase.ts, temporarily add:
console.log('🔍 Debug - Environment check:');
console.log('  URL exists:', !!process.env.EXPO_PUBLIC_SUPABASE_URL);
console.log('  URL value:', process.env.EXPO_PUBLIC_SUPABASE_URL?.substring(0, 30) + '...');
console.log('  Key exists:', !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
console.log('  Key starts with eyJ:', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ'));
```

## Common Issues

### Issue: "Supabase anon key format looks incorrect"

**Cause:** The anon key doesn't start with `eyJ`

**Solution:**
- Make sure you copied the **anon public** key, not the service_role key
- The key should be a long JWT token starting with `eyJ`
- Check for extra spaces or quotes in your `.env` file

### Issue: Multiple "Network request failed" errors

**Cause:** Supabase client is trying to connect but can't reach the server

**Possible solutions:**
1. Verify the Supabase URL is correct
2. Check your internet connection
3. Try tunnel mode: `npx expo start --tunnel`
4. Verify your Supabase project is active (not paused)

### Issue: Environment variables not loading

**Cause:** Expo cache or incorrect file location

**Solution:**
1. Make sure `.env` is in the root directory (same as `package.json`)
2. Restart with `--clear`: `npx expo start --clear`
3. Check file name is exactly `.env` (not `.env.txt`)

## Still Having Issues?

1. Check the Expo logs for more detailed error messages
2. Verify your Supabase project is active in the dashboard
3. Try creating a new Supabase project and using those credentials
4. Check Expo documentation: https://docs.expo.dev/guides/environment-variables/

