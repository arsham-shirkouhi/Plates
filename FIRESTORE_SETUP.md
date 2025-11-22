# Firestore Security Rules Setup

## Error: Missing or insufficient permissions

You're seeing this error because Firestore security rules haven't been configured yet. Follow these steps to fix it:

## Step 1: Open Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Click on **Firestore Database** in the left sidebar

## Step 2: Set Up Security Rules

1. Click on the **Rules** tab at the top
2. You'll see the default rules (which deny all access)
3. Replace the entire rules section with the content from `firestore.rules` file

## Step 3: Copy the Rules

Copy and paste this into the Rules editor:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper function to check if user is authenticated
    function isAuthenticated() {
      return request.auth != null;
    }
    
    // Helper function to check if user owns the document
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    
    // Users collection - users can only read/write their own data
    match /users/{userId} {
      // Allow read and write only if the user is the owner
      allow read, write: if isOwner(userId);
      
      // Daily logs subcollection
      match /dailyLogs/{date} {
        allow read, write: if isOwner(userId);
      }
      
      // Future: Workouts subcollection
      match /workouts/{workoutId} {
        allow read, write: if isOwner(userId);
      }
      
      // Future: Meals subcollection
      match /meals/{mealId} {
        allow read, write: if isOwner(userId);
      }
      
      // Future: Weight logs subcollection
      match /weightLogs/{date} {
        allow read, write: if isOwner(userId);
      }
      
      // Future: Progress photos subcollection
      match /progressPhotos/{photoId} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

## Step 4: Publish Rules

1. Click **Publish** button
2. Wait for confirmation that rules have been published
3. Rules take effect immediately (usually within a few seconds)

## What These Rules Do

✅ **Allow authenticated users to:**
- Read and write their own user profile (`users/{userId}`)
- Read and write their own daily macro logs
- Read and write their own workouts (when implemented)
- Read and write their own meals (when implemented)
- Read and write their own weight logs (when implemented)
- Read and write their own progress photos (when implemented)

❌ **Prevent users from:**
- Accessing other users' data
- Accessing data when not authenticated
- Writing to collections they don't own

## Testing

After publishing the rules:
1. Restart your Expo app
2. Try logging in again
3. The permission error should be gone

## Troubleshooting

### Still getting errors?

1. **Wait a few seconds** - Rules can take 10-30 seconds to propagate
2. **Check authentication** - Make sure the user is logged in
3. **Check console** - Look for any other error messages
4. **Verify rules** - Go back to Rules tab and make sure they were saved correctly

### Development Mode (Temporary)

If you need to test quickly during development, you can temporarily use these rules (⚠️ **NOT FOR PRODUCTION**):

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

**⚠️ WARNING:** These rules allow any authenticated user to read/write all data. Only use for development!

## Next Steps

Once rules are set up:
1. ✅ Users can complete onboarding
2. ✅ Daily macro logs will save properly
3. ✅ User profiles will be accessible
4. ✅ All future features (workouts, meals, etc.) will work

