# AI Assistant Handoff — Plates × WorkoutX Integration

**Read this first.** This document is the shared source of truth for every AI
assistant working on this repo — Claude Code, Codex CLI, Claude Cowork /
claude.ai, or any other tool. `AGENTS.md` and `CLAUDE.md` at the repo root
both point here. Whenever you finish a session, update the **"Current state"**
section below so the next assistant (or the next you) can pick up cleanly.

**Owner:** Harshit "Harry" Jangam · harshitjangam29@gmail.com
**Upstream repo:** [`arsham-shirkouhi/Plates`](https://github.com/arsham-shirkouhi/Plates)
**Working branch:** `feature/workoutx-api-integration`
**Do not push to** `main` **or** `master`.

---

## 1. What this project is

Plates is a React Native / Expo mobile app (iOS + Android + web fallback) for
workout tracking and meal logging. Auth and persistence run on **Supabase**;
the UI is TypeScript + React Navigation + hand-rolled contexts.

The active work stream on this branch replaces the app's static / mock
exercise catalog with **WorkoutX** — a paid REST API that returns real
exercises with demo GIFs, target muscles, equipment, and step-by-step
instructions.

## 2. Stack at a glance

| Layer               | Choice                                                         |
| ------------------- | -------------------------------------------------------------- |
| Framework           | React Native 0.81 + Expo SDK 54 + TypeScript 5                 |
| State               | React Context (no Redux). See `src/context/`, `src/contexts/`  |
| Nav                 | `@react-navigation/native-stack`                               |
| Backend             | Supabase (`@supabase/supabase-js`) — auth + tables             |
| Reanimated          | `react-native-reanimated@4.1.7` + `react-native-worklets@0.5.1`|
| Package manager     | npm                                                            |
| Env vars            | `EXPO_PUBLIC_*` — inlined by Expo at build time                |

## 3. WorkoutX API reference

- **Base URL:** `https://api.workoutxapp.com/v1`
- **Auth header:** `X-WorkoutX-Key: wx_...`
- **Docs:** <https://workoutxapp.com/docs.html> · <https://workoutxapp.com/dashboard.html>

Endpoints in use (all `GET`):

| Path                                | Purpose                              |
| ----------------------------------- | ------------------------------------ |
| `/exercises`                        | Paginated list (`limit`, `offset`)   |
| `/exercises/exercise/{id}`          | Single exercise                      |
| `/exercises/bodyPart/{bodyPart}`    | Filter by body part                  |
| `/exercises/target/{target}`        | Filter by target muscle              |
| `/exercises/name/{name}`            | Search by name                       |
| `/exercises/bodyPartList`           | Accepted body-part strings           |

Body-part vocabulary (exactly): `back`, `cardio`, `chest`, `lower arms`,
`lower legs`, `neck`, `shoulders`, `upper arms`, `upper legs`, `waist`.

Exercise response fields consumed: `id`, `name`, `bodyPart`, `target`,
`equipment`, `gifUrl`, `instructions[]`, `secondaryMuscles[]`, optional
`difficulty`.

## 4. Environment (.env — gitignored)

The app expects four `EXPO_PUBLIC_*` variables. `.env.example` in the repo
root is the checked-in template.

```
EXPO_PUBLIC_WORKOUTX_API_KEY=wx_<your key>
EXPO_PUBLIC_WORKOUTX_API_BASE_URL=https://api.workoutxapp.com/v1
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

**Never commit the real `.env`.** `.gitignore` already excludes it. Secrets
also should not be pasted into this doc.

Note: `EXPO_PUBLIC_*` are compiled into the JS bundle, so they are visible to
anyone who inspects the app. WorkoutX and the Supabase anon key are both OK
for this because they are meant to be public-safe; the server enforces rate
limits and row-level security.

## 5. Running locally

```bash
cd "$HOME/Desktop/Plates - Workout and Meal prep app"
git checkout feature/workoutx-api-integration
npm install
npx expo start -c          # -c mandatory — env vars only re-read on cache clear
```

When Metro's menu appears: `w` = web (fastest smoke test), `i` = iOS
simulator (needs Xcode), `a` = Android emulator.

**Smoke-test flow** to verify WorkoutX end-to-end:

1. Log in (Supabase auth).
2. Home → Start Workout → **Muscle Select** → tap **chest** → start workout.
3. On any exercise card, open the **info** view.
4. Expect: demo GIF at top, blue "target · …" chip, body-part chip,
   equipment, secondary-muscle pills, numbered instructions list.
5. Watch the Metro terminal — any `[exerciseService] WorkoutX … failed …`
   or `[workoutxClient] EXPO_PUBLIC_WORKOUTX_API_KEY is not set` line is a
   real signal, not noise.

## 6. Files touched on this branch

**New**
- `.env.example` — placeholder vars, committed
- `src/types/workoutx.ts` — raw WorkoutX response types + body-part constants
- `src/services/workoutxClient.ts` — fetch client (X-WorkoutX-Key, 12 s
  timeout, typed errors for 401/403/429/network/parse)
- `src/components/ExerciseGif.tsx` — shared GIF renderer with spinner +
  error fallback
- `docs/AI_CONTEXT.md` (this file), `AGENTS.md`, `CLAUDE.md`

**Edited**
- `src/services/exerciseService.ts` — WorkoutX-first for `getExercisesList`,
  `searchExercises`, `getExerciseDetails`; falls back to Supabase, then to
  the local mock catalog. `ExerciseDetails` extended with optional `gifUrl`,
  `target`, `equipment`, `instructions[]`, `secondaryMuscles[]`. New
  helpers: `getExercisesByBodyPart(bodyPart)`,
  `getExercisesForMuscleGroup(group)`.
- `src/services/workoutAssemblyService.ts` — muscle-picker fans out to
  per-body-part WorkoutX calls in parallel instead of pulling 100 and
  filtering client-side.
- `src/workout/muscleGroups.ts` — added WorkoutX body-part aliases (`upper
  arms`, `lower arms`, `upper legs`, `lower legs`, `waist`, `neck`,
  `cardio`, `forearms`) and `workoutxBodyPartsForMuscle()` reverse
  mapping.
- `src/screens/ExerciseInfoScreen.tsx` — renders GIF, target/body-part
  chips, equipment, secondary muscles, numbered instructions.
- `src/components/ExerciseDetailOverlay.tsx` — same additions as
  ExerciseInfoScreen for the in-workout overlay.
- `babel.config.js` — Reanimated v4 moved its Babel plugin, so this now
  loads `react-native-worklets/plugin` (was `react-native-reanimated/plugin`).
- `package.json` — added `babel-preset-expo` at the top level to fix
  npm-hoisting resolution.

## 7. Known gotchas (learned the hard way)

1. **Reanimated v4 Babel plugin.** In v4, `react-native-reanimated/plugin`
   does not exist. Use `react-native-worklets/plugin`. It must stay the
   **last** entry in `babel.config.js` `plugins`.
2. **`babel-preset-expo` hoisting.** With npm 7+ it can land under
   `node_modules/expo/node_modules/babel-preset-expo/` where Babel's own
   resolver won't find it. Fix: keep it as a top-level dep in
   `package.json`.
3. **Env-var re-reads.** Expo caches env vars in Metro. **Always** restart
   with `npx expo start -c` after editing `.env`, or the bundle keeps the
   old values.
4. **WorkoutX from firewalled shells.** `api.workoutxapp.com` is blocked
   from the cloud container and from Cowork's local Linux VM. Do not test
   the API with `curl` from those — test on-device (iOS/Android/web) where
   network is unrestricted.
5. **Local file access.** Tools writing to the user's disk go through
   `mcp__remote-devices__device_commit_files`. The `.env` file is
   deliberately refused by that tool for safety — write it via
   `device_bash` heredoc instead.

## 8. Version-control policy for this branch

- ❌ Never push to `main` / `master`.
- ✅ All work stays on `feature/workoutx-api-integration`.
- ❌ No commit or push until Harry has run the app locally and confirmed the
  WorkoutX flow works end-to-end. He signals this with **"Testing passed"**.
- ✅ On "Testing passed": stage & commit only the files listed in §6,
  push the branch, open a PR against `arsham-shirkouhi/Plates:main` with a
  summary that lists the endpoints used, how to test, and a note that this
  replaces static exercise data with dynamic GIF-supported instructions.
- ❌ Never `git add .` — always name the files explicitly so `.env` doesn't
  slip in.

## 9. Current state (UPDATE THIS SECTION AT END OF EVERY SESSION)

> Update format: append a dated bullet, don't rewrite history. Keep it short
> — one line per session unless something needs elaboration.

- **2026-09-06 — Claude:** Initial WorkoutX build committed to disk on
  branch `feature/workoutx-api-integration`. All files in §6 present but
  **not yet git-committed**. Metro was fixed (Reanimated v4 plugin +
  babel-preset-expo hoist). Harry's Supabase creds were pending.
- **2026-09-17 — Claude:** Harry back after a break. Supabase creds
  received. Next up: full local smoke test (§5), report bugs, patch on this
  branch. **Do not commit yet.**
- **2026-09-17 — Codex:** Read the supplied context materials, confirmed the WorkoutX public key/base URL are configured, opened the workspace in VS Code, and started Expo on local port 8081 for Harry to smoke-test; Supabase variables are currently absent from `.env`.
- **2026-09-17 — Codex:** Harry added Supabase values under `NEXT_PUBLIC_*` names; Expo is currently running on LAN port 8081 with temporary `EXPO_PUBLIC_*` aliases, but `.env` should be renamed to the Expo variable names before the next restart.
- **2026-09-17 — Codex:** Upgraded Expo SDK 54 → 57 (RN 0.86.3), migrated legacy splash config to `expo-splash-screen`, regenerated Android, and verified an iOS Expo bundle builds; Expo is running on port 8081 with a QR code in Terminal. No commit. Expo Doctor retains only the standard native-directory/CNG sync notice; `tsc` has many pre-existing app-wide errors to address separately.
- **2026-09-17 — Codex:** Fixed Supabase client validation to accept modern `sb_publishable_...` keys (the prior JWT-only check triggered Expo's error overlay); rebuilt the iOS bundle successfully and restarted Expo on port 8081. `.env` still uses `NEXT_PUBLIC_*` names, so the Terminal launch supplies temporary Expo-compatible aliases.
- **2026-09-17 — Codex:** Supabase Auth works but the remote `users` table is missing the self-insert RLS policy. Added non-destructive `supabase-users-rls-policy.sql`; Harry must run it once in the Supabase SQL Editor, then reload Expo. No commit.
- **2026-09-17 — Codex:** Fixed workout-start overlay regression after the SDK 57 upgrade: RN 0.85+ removed `StyleSheet.absoluteFillObject`, so replaced its 27 app usages with `StyleSheet.absoluteFill`; iOS bundle builds, Expo restarted on port 8081. No commit.
- **2026-09-17 — Codex:** Corrected `.env` Supabase keys to Expo's `EXPO_PUBLIC_*` names. Another process committed the feature as `423da65` and switched to `main`; restored the clean checkout to `feature/workoutx-api-integration` and restarted Expo from that branch.
- **2026-09-17 — Codex:** Researched food data options: recommend USDA FoodData Central for canonical nutrients plus Edamam server-side for recipe/NLP nutrition and allergy-filtered recipes; use Open Food Facts only as barcode/label enrichment with conservative allergy handling, never as a guarantee. No implementation yet.
- **2026-09-18 — Codex:** Profiled USDA Foundation and FNDDS releases and documented the food-data trial plan in `docs/FOOD_DATA_EDA.md`: use FNDDS for typed logging and USDA Branded Foods for exact barcode lookup; keep Open Food Facts only as a later low-confidence fallback. No implementation yet.

## 10. What to do next (as of the top of §9)

1. Confirm the app boots to the Muscle Select screen without red errors.
2. Walk the smoke-test flow in §5. Report every visible bug (broken layout,
   missing GIF, wrong data, network error) — patch on this branch, don't
   push.
3. Once Harry says **"Testing passed"**: commit the §6 files, push, open
   PR. Template lives in §8.
