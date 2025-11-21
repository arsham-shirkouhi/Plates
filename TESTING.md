# Testing Guide

## Prerequisites

1. ✅ `.env` file created in root directory with Firebase config
2. ✅ Dependencies installed (`node_modules` exists)
3. ✅ `tsconfig.json` fixed

## How to Test the App

### Step 1: Start the Expo Development Server

```bash
npm start
```

This will:
- Start the Metro bundler
- Show a QR code in the terminal
- Open Expo DevTools in your browser

### Step 2: Choose Your Testing Method

#### Option A: Test on Your Phone (Recommended)
1. Install **Expo Go** app on your phone:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. Scan the QR code:
   - **iOS**: Open Camera app and scan the QR code
   - **Android**: Open Expo Go app and tap "Scan QR code"

#### Option B: Test on Android Emulator
```bash
npm run android
```
(Requires Android Studio and an emulator set up)

#### Option C: Test on iOS Simulator (Mac only)
```bash
npm run ios
```
(Requires Xcode)

#### Option D: Test in Web Browser
```bash
npm run web
```
(Note: Firebase Auth works in web, but some features may differ)

### Step 3: Test Authentication Flow

1. **Initial State**: You should see the Login screen (since no user is logged in)

2. **Test Sign Up**:
   - Tap "Don't have an account? Sign up"
   - Enter an email (e.g., `test@example.com`)
   - Enter a password (at least 6 characters)
   - Confirm the password
   - Tap "Sign Up"
   - ✅ Should navigate to Home screen showing your email

3. **Test Logout**:
   - On Home screen, tap "Logout"
   - ✅ Should return to Login screen

4. **Test Login**:
   - Enter the email you just created
   - Enter the password
   - Tap "Login"
   - ✅ Should navigate to Home screen

5. **Test Persistence**:
   - Login successfully
   - Close the app completely
   - Reopen the app
   - ✅ Should still be logged in and show Home screen (Firebase persists auth state)

## Troubleshooting

### If you see "Firebase config error":
- Check that `.env` file exists in root directory
- Verify all environment variables are set correctly
- Restart the Expo server after creating/updating `.env`

### If navigation doesn't work:
- Make sure you've installed all dependencies: `npm install`
- Clear cache: `npx expo start -c`

### If you see TypeScript errors:
- Run `npm install` to ensure all types are installed
- Check that `tsconfig.json` is correct

### If Firebase Auth doesn't work:
- Verify your Firebase project has Authentication enabled
- In Firebase Console, go to Authentication > Sign-in method
- Enable "Email/Password" provider

## Expected Behavior

- ✅ Login screen shows when not authenticated
- ✅ Signup screen accessible from login
- ✅ Login screen accessible from signup
- ✅ Home screen shows after successful login/signup
- ✅ User email displayed on Home screen
- ✅ Logout button works and returns to Login
- ✅ Auth state persists across app restarts

