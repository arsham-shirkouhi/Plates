# Database Schema Documentation

## Firestore Structure

### Collection: `users`
**Path:** `users/{userId}`

Stores user profile and onboarding data.

#### Document Structure:
```typescript
{
  // Onboarding Status
  onboardingCompleted: boolean;
  onboardingData?: {
    name: string;
    age: number;
    sex: 'male' | 'female' | 'other' | '';
    height: number;
    heightUnit: 'cm' | 'ft';
    weight: number;
    weightUnit: 'kg' | 'lbs';
    goal: 'lose' | 'maintain' | 'build' | '';
    activityLevel: 'sedentary' | 'lightly' | 'moderate' | 'very' | '';
    workoutFrequency: '0-1' | '2-3' | '4-5' | '6+' | '';
    dietPreference: 'regular' | 'high-protein' | 'vegetarian' | 'vegan' | 'keto' | 'halal' | '';
    allergies: string[];
    goalIntensity: 'mild' | 'moderate' | 'aggressive' | '';
    unitPreference: { weight: 'kg' | 'lbs'; height: 'cm' | 'ft' };
    purpose: 'meals' | 'workouts' | 'both' | 'discipline' | '';
    macrosSetup: 'auto' | 'manual' | '';
    customMacros?: {
      protein: number;
      carbs: number;
      fats: number;
    };
  };
  
  // Calculated Target Macros
  targetMacros?: {
    calories: number;
    protein: number; // in grams
    carbs: number; // in grams
    fats: number; // in grams
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
}
```

---

### Subcollection: `dailyLogs`
**Path:** `users/{userId}/dailyLogs/{date}`

Stores daily macro tracking. Date format: `YYYY-MM-DD` (e.g., `2024-01-15`)

#### Document Structure:
```typescript
{
  date: string; // Format: YYYY-MM-DD
  calories: number;
  protein: number; // in grams
  carbs: number; // in grams
  fats: number; // in grams
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### Example:
```
users/abc123/dailyLogs/2024-01-15
{
  date: "2024-01-15",
  calories: 1850,
  protein: 150,
  carbs: 200,
  fats: 65,
  createdAt: Timestamp(...),
  updatedAt: Timestamp(...)
}
```

---

## Available Functions

### User Profile Functions

#### `hasCompletedOnboarding(user: User): Promise<boolean>`
Checks if user has completed onboarding.

#### `saveOnboardingData(user: User, onboardingData: OnboardingData): Promise<void>`
Saves onboarding data and calculates target macros if auto-setup was selected.

#### `getUserProfile(user: User): Promise<UserProfile | null>`
Retrieves complete user profile.

#### `updateLastLogin(user: User): Promise<void>`
Updates user's last login timestamp.

---

### Daily Macro Logging Functions

#### `getDailyMacroLog(user: User, date?: string): Promise<DailyMacroLog | null>`
Gets macro log for a specific date (defaults to today).

#### `saveDailyMacroLog(user: User, macros: {...}, date?: string): Promise<void>`
Saves or updates daily macro log for a specific date.

#### `addToDailyMacroLog(user: User, macros: {...}, date?: string): Promise<void>`
Adds macros to existing daily log (incremental).

#### `getDailyMacroLogsRange(user: User, startDate: string, endDate: string): Promise<DailyMacroLog[]>`
Gets all macro logs within a date range.

---

## Usage Examples

### Save Daily Macros
```typescript
import { saveDailyMacroLog } from '../services/userService';
import { useAuth } from '../context/AuthContext';

const { user } = useAuth();

await saveDailyMacroLog(user, {
  calories: 1850,
  protein: 150,
  carbs: 200,
  fats: 65
});
```

### Add Macros Incrementally
```typescript
import { addToDailyMacroLog } from '../services/userService';

// Add a meal's macros
await addToDailyMacroLog(user, {
  calories: 500,
  protein: 30,
  carbs: 60,
  fats: 15
});
```

### Get Today's Macros
```typescript
import { getDailyMacroLog, getTodayDateString } from '../services/userService';

const today = getTodayDateString(); // "2024-01-15"
const log = await getDailyMacroLog(user, today);

if (log) {
  console.log(`Today's calories: ${log.calories}`);
  console.log(`Protein: ${log.protein}g`);
}
```

### Get Weekly Macros
```typescript
import { getDailyMacroLogsRange } from '../services/userService';

const startDate = "2024-01-08";
const endDate = "2024-01-14";
const weeklyLogs = await getDailyMacroLogsRange(user, startDate, endDate);

weeklyLogs.forEach(log => {
  console.log(`${log.date}: ${log.calories} calories`);
});
```

---

## Future Extensibility

The schema is designed to be easily extended:

### Planned Additions:
- **Workouts:** `users/{userId}/workouts/{workoutId}`
- **Meals:** `users/{userId}/meals/{mealId}`
- **Progress Photos:** `users/{userId}/progressPhotos/{photoId}`
- **Weight Logs:** `users/{userId}/weightLogs/{date}`

The daily logs structure can be extended to include:
- Workout data
- Meal references
- Notes
- Water intake
- Sleep data

---

## Firestore Security Rules (Recommended)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Daily logs subcollection
      match /dailyLogs/{date} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      
      // Future: Workouts subcollection
      match /workouts/{workoutId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

