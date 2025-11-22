# Google OAuth Setup Guide

## The Problem
You're getting "Error 400: invalid_request" because Google doesn't recognize your app's redirect URI.

## Quick Fix (5 minutes)

### Step 1: Get Your Redirect URI
1. Start your Expo app: `npm start`
2. Try to sign in with Google
3. **Look at your terminal/console** - you'll see a message like:
   ```
   🔴 IMPORTANT: COPY THIS REDIRECT URI TO GOOGLE CLOUD CONSOLE
   Redirect URI: https://auth.expo.io/@your-username/plates
   ```
4. **Copy that exact URI** (it will be different for each user)

### Step 2: Configure Google Cloud Console
1. Go to: https://console.cloud.google.com/apis/credentials
2. Select your project (or create one if needed)
3. Find your **OAuth 2.0 Client ID** (or create one)
4. **IMPORTANT**: Make sure it's type **"Web application"** (NOT iOS or Android)
5. Click **"Edit"**
6. Scroll to **"Authorized redirect URIs"**
7. Click **"ADD URI"**
8. Paste the redirect URI from Step 1
9. Click **"SAVE"**
10. **Wait 2-3 minutes** for changes to take effect

### Step 3: Try Again
1. Restart your Expo server: Stop it (Ctrl+C) and run `npm start` again
2. Try signing in with Google
3. It should work now!

## Common Issues

### "Still getting error 400"
- Make sure you copied the **EXACT** redirect URI (including `https://` or `exp://`)
- Make sure your OAuth client is **"Web application"** type
- Wait a few more minutes - Google can take time to update

### "Can't find OAuth Client ID"
- You need to create one in Google Cloud Console
- Go to: https://console.cloud.google.com/apis/credentials
- Click "Create Credentials" → "OAuth client ID"
- Choose "Web application"
- Add the redirect URI

### "Redirect URI keeps changing" or "exp:// URI not working"
- If you see `exp://10.0.0.120:8081` in your redirect URI, Google may not accept it
- **Solution: Use tunnel mode** for a stable URL:
  1. Stop your Expo server (Ctrl+C)
  2. Run: `npx expo start --tunnel`
  3. This will give you a stable `https://` URL that Google will accept
  4. Try signing in again and copy the new redirect URI
  5. Add that URI to Google Cloud Console

### "exp:// protocol not accepted"
- Google OAuth for web applications prefers `https://` URLs
- Use tunnel mode (see above) to get an `https://` redirect URI
- Or try adding the `exp://` URI anyway - some configurations may work

## Need Help?
Check the console output when you try to sign in - it will show you exactly what redirect URI to use!

