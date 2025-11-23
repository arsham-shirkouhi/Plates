# Username System Documentation

## Overview

The app now uses a dedicated `usernames` collection in Firestore to efficiently check username availability and ensure uniqueness.

## Firestore Structure

### Collection: `usernames`
**Path:** `usernames/{normalizedUsername}`

Each document stores:
```typescript
{
  userId: string;        // The user's Firebase Auth UID
  username: string;       // The original username (with original case)
  createdAt: Timestamp;  // When the username was first registered
  updatedAt: Timestamp;  // Last update time
}
```

**Note:** The document ID is the **normalized** username (lowercase, trimmed), while the `username` field stores the original case.

## Security Rules

The `usernames` collection has the following rules:
- **Read:** Any authenticated user can read (to check availability)
- **Write:** Users can only write their own username (userId must match auth.uid)

```javascript
match /usernames/{username} {
  allow read: if isAuthenticated();
  allow write: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
}
```

## Functions

### `checkUsernameExists(username, currentUserId?)`
Checks if a username is already taken by querying the `usernames` collection.

- **Parameters:**
  - `username`: The username to check
  - `currentUserId`: Optional - if provided, allows the user to keep their own username
- **Returns:** `true` if username exists, `false` if available
- **Usage:** Called automatically when user types in the username field (debounced 500ms)

### `saveOnboardingData(user, onboardingData)`
Saves onboarding data and automatically:
1. Saves user data to `users/{userId}`
2. Creates/updates username in `usernames/{normalizedUsername}`
3. Removes old username if user changed their username

### `resetOnboarding(user)`
Resets onboarding data and removes the username from the `usernames` collection.

## How It Works

1. **Username Input:** User types username in onboarding
2. **Real-time Check:** After 500ms of no typing, `checkUsernameExists()` is called
3. **Query:** Function queries `usernames/{normalizedUsername}` document
4. **Feedback:** Shows error if taken, success if available
5. **On Save:** When onboarding completes, username is registered in `usernames` collection
6. **Uniqueness:** Since document IDs are unique, usernames are automatically unique

## Benefits

✅ **Efficient:** Direct document lookup instead of scanning all users
✅ **Secure:** Users can only check availability, not see other user data
✅ **Scalable:** Works with millions of users
✅ **Real-time:** Instant feedback as user types
✅ **Case-insensitive:** "John" and "john" are treated as the same username

## Migration

For existing users:
- When they complete onboarding, their username is automatically added to the `usernames` collection
- No manual migration needed - happens automatically on next save

## Testing

To test username checking:
1. Complete onboarding with a username
2. Reset onboarding (or use a different account)
3. Try to use the same username
4. Should see "this username is already taken" error

