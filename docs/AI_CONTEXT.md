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
- **2026-10-02 — Cursor:** `npx expo start` failed after `git pull` on `main` because `expo-camera` / `expo-image-picker` were in `package.json` but not installed. Ran `npm install` (9 packages added). Restart Expo to continue.
- **2026-10-02 — Cursor:** Removed the bouncy add-exercise springs. Overlay rows now fade color/icon only (`withTiming`); new workout cards fade in instead of dropping in.
- **2026-10-02 — Cursor:** Completed exercise cards fade into green (bg/border/title). Dropped barbell tiles, checkmarks, and confetti; typographic “done” + set count only.
- **2026-10-02 — Cursor:** Empty workout list shows the mascot with a light bob and “add an exercise”. Remove-exercise now sucks the card away with gray dust.
- **2026-10-03 — Cursor:** Empty workout state now uses `cal-workout-empty-state.svg` (Cal + dumbbells) with “add first exercise” under it.
- **2026-10-03 — Cursor:** Empty-state copy is “add first exercises!” and the Cal SVG is larger (340).
- **2026-10-03 — Cursor:** Empty-state Cal has a harsh #252525 drop shadow (6px offset), same language as the buttons.
- **2026-10-03 — Cursor:** Empty-state press matches the buttons: Cal + label drop 6px and the hard shadow fades out in 120ms.
- **2026-10-03 — Cursor:** Tightened the gap between Cal and “add first exercises!”.
- **2026-10-03 — Cursor:** Restored the black outline paths on the Cal empty-state SVG.
- **2026-10-03 — Cursor:** Empty workout list is no longer a ScrollView; it only scrolls once exercise cards overflow.
- **2026-10-04 — Cursor:** Empty state pops in (scale + rise spring) when the last exercise is removed.
- **2026-10-04 — Cursor:** Revamped add-exercise picker: hard #252525 cards/shadows, body-part stamps via `PlatesIcon`, equipment/target meta, check-to-add. Placeholders until Harry’s custom icon set.
- **2026-10-04 — Cursor:** Shared `HardSearchBar` + `HardListCard` now used for every search and picker list (add exercise, review workout, routines, add food, muscle name picker).
- **2026-10-04 — Cursor:** Reverted add-food search/list to the lighter original rows — hard cards felt too congested there.
- **2026-10-04 — Cursor:** Login/signup (shared `TextInput`) now match HardSearchBar: white field, 2.5 #252525 border, 4px hard offset.
- **2026-10-04 — Cursor:** Slimmed exercise picker/review rows to food-log style (name + one meta + plus). Search bar stays hard-shadow.
- **2026-10-04 — Cursor:** Add-exercise: dropped header rule, restored body-part stamp, thicker plus / blue tick when added.
- **2026-10-04 — Cursor:** Plus/tick back to normal weight (blue check). Filter tags now use per-muscle color + stamp.
- **2026-10-04 — Cursor:** Add-exercise plus now fires 2–4 blue particles along a random quadratic curve to the “N added” label, shrinking on the way.
- **2026-10-04 — Cursor:** Add particles a bit larger/longer, tinted with that exercise’s body-part stamp color.
- **2026-10-04 — Cursor:** Pinned “N added” above the exercise list so fly particles stay on-screen when scrolled.
- **2026-10-04 — Cursor:** Extra space under the count row. Filter chips dropped the black stamp border (plain colored icons). Selecting a tag bursts body-part-colored particles from it.
- **2026-10-04 — Cursor:** Exercise-row stamps lost the black border too; pulled the first list row up under the count.
- **2026-10-04 — Cursor:** Add particles spawn immediately on plus (no measure/rAF delay) and travel faster.
- **2026-10-04 — Cursor:** Bicep/tricep stamps use Harry’s flexed-arm PNG (`assets/images/icons/arms.png`).
- **2026-10-04 — Cursor:** Plus/tick on add-exercise rows crossfade with a short rotate+scale instead of swapping.
- **2026-10-04 — Cursor:** Add particles now measure the tapped plus and the “added” label in window space so they always fly from that button to the count.
- **2026-10-04 — Cursor:** Slowed add particles (~500ms). Workout cards use body-part stamps + matching title color. Closing add-exercise focuses the first card (others collapsed); finishing all sets collapses that card and opens the next.
- **2026-10-04 — Cursor:** Reverted accordion/focus-reset. Cards stay independently open; finishing all sets still collapses that card and expands the next.
- **2026-10-04 — Cursor:** First workout card starts open; the rest start collapsed. Finishing all sets collapses that card and opens the next.
- **2026-10-04 — Cursor:** Start-collapsed cards now open as header-only (collapse progress starts at 0, height 0) instead of flashing full then shrinking.
- **2026-10-04 — Cursor:** Collapsed workout cards fade the body-part stamp out and slide the title left.
- **2026-10-04 — Cursor:** Workout cards no longer show body-part stamps; title color still uses the muscle color.
- **2026-10-04 — Cursor:** Workout card icons are back as flat muscle-colored marks (no stamp background); they still fade away when collapsed.
- **2026-10-04 — Cursor:** Workout cards always show the flat PlatesIcon in the exercise color, expanded or collapsed.
- **2026-10-04 — Cursor:** Completed workout-card icons fade to the same green as the done title.
- **2026-10-04 — Cursor:** Today’s goals widget gets left-peek Cal (`cal_goals.png`); press scales him from a bit below middle-left.
- **2026-10-04 — Cursor:** Cal on food log + today’s goals is empty-state only; he shrinks away from his corner when the first item appears.
- **2026-10-04 — Cursor:** Double-tap today’s goals (header, empty, or list) opens add-todo; single tap still opens the overlay.
- **2026-10-04 — Cursor:** Workout “in progress” stays `#F9C117`. Food/exercise keep the hard buttons; their stack (incl. shadows) fits the today’s-goals square.
- **2026-10-04 — Cursor:** Small Cal-with-fork peek in the food log widget’s bottom-right (`assets/images/icons/cal_food.png`).
- **2026-10-04 — Cursor:** Restored Cal’s #252525 outline, made him bigger, and left-aligned empty-state copy on two lines so it doesn’t cover him.
- **2026-10-04 — Cursor:** Pressing the food log widget scales Cal up slightly from the bottom-right corner.
- **2026-10-04 — Cursor:** Add-food sheet now slides/fades out before unmounting when you tap away or swipe down.
- **2026-10-04 — Cursor:** Habit Chains is a separate home widget next to the timer (`ENABLE_HABIT_CHAINS`). Today’s goals is untouched. Data lives in AsyncStorage `plates.habit_chains.${userId}`.
- **2026-10-04 — Cursor:** Habit Tree removed. Habit Trail (`ENABLE_HABIT_TRAIL`) is the visualization on the habit-chains card. Extra state in `plates.habit_trail.${userId}`.
- **2026-10-04 — Cursor:** Rest is a 50px square ⏱ button next to add exercise, shown only when the workout has at least one exercise. Header is back to minimize / title / finish.
- **2026-10-04 — Cursor:** Icons are back to Expo Ionicons via `<Icon>`. Removed Streamline Plump glyphs. Installed `@expo/vector-icons`.
- **2026-10-04 — Cursor:** Rest square next to add exercise uses a timer icon, not the ⏱ emoji.
- **2026-10-04 — Cursor:** Rest button + rest progress bar are back to app blue (`#526EFF`). Completed exercise cards stay blue.
- **2026-10-04 — Cursor:** Slowed add-exercise fly particles (~1s, ease-in start) so you can see them leave the plus toward “N added”.
- **2026-10-05 — Cursor:** Revamped workout wrap-up overlay: Cal (phones/chart art) peeks in from the right over a 3×2 hard-shadow stat grid (exercises, duration, volume, sets, PR, streak) plus a hard lifts card. Dropped aura balls, confetti, and standouts.
- **2026-10-05 — Cursor:** Log-food search uses HardSearchBar (same as add-exercise). Meal tags are per-meal colors (breakfast gold, lunch orange, dinner blue, snacks green).
- **2026-10-05 — Cursor:** Wrap-up Cal swapped to the right-edge phones/chart illustration (full transparent canvas, pinned top-right of the recap).
- **2026-10-05 — Cursor:** Wrap-up uses dashboard ScrollingGridBackground. Cal docks on the right edge (tap to tuck off-screen) so he no longer covers the recap cards.
- **2026-10-05 — Cursor:** Wrap-up layout no longer shifts for Cal. Cal floats in front on the right at ~82% opacity. Stat cards are per-stat colors; lifts card has a blue wash + accent.
- **2026-10-05 — Cursor:** Wrap-up Cal pops fuller on the right edge (tap to tuck). “your lifts” collapses/expands. Recap colors limited to red/green/yellow/blue.
- **2026-10-05 — Cursor:** Wrap-up Cal sits beside the lifts list. Stat boxes are all blue; top accent bars removed.
- **2026-10-05 — Cursor:** Wrap-up no longer shows Cal. Lifts list stays open. Volume/streak units (`kg`, `d`) match duration `s` size.
- **2026-10-05 — Cursor:** Wrap-up restyled as a nutrition-facts label (Workout Facts, thick black bars, volume as calories, lifts as the lower panel).
- **2026-10-05 — Cursor:** Wrap-up save is a square bookmark beside Done. Label + buttons use tighter side padding so they’re wider.
- **2026-10-05 — Cursor:** Wrap-up label/footer capped at 360 to match the app’s full-width buttons.
- **2026-10-05 — Cursor:** Wrap-up facts label: blue wash/title/values, green PRs, larger type.
- **2026-10-05 — Cursor:** Wrap-up facts: more inner/top padding, black thick bar, blue PRs, Ionicons on rows.
- **2026-10-05 — Cursor:** Wrap-up facts: no icons, “Workout Facts” one line, serving size replaced with `1 session {workout}`.
- **2026-10-05 — Cursor:** Wrap-up button says “done!”; less space under save/done.
- **2026-10-05 — Cursor:** Wrap-up label stamps in on open. Saving a preset pops the bookmark with a confetti burst.
- **2026-10-05 — Cursor:** Empty-workout Cal no longer has the hard drop shadow.
- **2026-10-05 — Cursor:** Add-exercise fly particles isolated (no list re-render) and sped up. Pick-exercises search/select rows match add-exercise (stamp + plus/tick).
- **2026-10-05 — Cursor:** Pick-exercises muscle tags use the same colored BodyPartChip as add-exercise filters.
- **2026-10-05 — Cursor:** Pick-exercises tags sit under search. Add/remove uses the same plus→check toggle as mid-workout.
- **2026-10-05 — Cursor:** Body-map muscle fills use the same stamp colors as the tags (chest blue, back green, shoulders orange, arms purple, legs indigo, core amber). Name-picker checkboxes match too.
- **2026-10-05 — Cursor:** Muscle/tag colors now use app RGBY first (chest blue, back green, shoulders yellow, arms red) plus purple legs and orange core. Body map, pick-workout list, and add-exercise tags all share that palette.
- **2026-10-05 — Cursor:** Selected body-part names (pick-workout list + muscle-select chips) keep the original dark text; only the figure/tags use the RGBY fills.
- **2026-10-05 — Cursor:** Pick-exercises add stays in place (plus→check like add-exercise) with a pencil to edit sets/reps/rest. Search lists selected matches first, then the rest.
- **2026-10-05 — Cursor:** Pick-exercises edit expands the subtitle line into compact sets/reps/rest +/− (workout-card language), not a separate stepper panel.
- **2026-10-05 — Cursor:** Pick-exercises edit keeps original title/meta color. Sets/reps/rest are the old − value + steppers, just shorter so they stay tappable.
- **2026-10-05 — Cursor:** Pick-exercises expand uses a rotating chevron (no pencil). Title slides down into the meta slot while sets/reps/body-part fade out, then the compact steppers open.
- **2026-10-05 — Cursor:** Pick-exercises matches in-workout add-exercise: filled pencil edit, same plus/tick, and the same search/tag/row spacing.
- **2026-10-05 — Cursor:** Added rows keep body-part meta only. Sets/reps/rest open when you tap edit.
- **2026-10-05 — Cursor:** Restored pick-exercises edit (panel mounts again so it actually opens). In-workout add-exercise rows use the same staggered load-in.
- **2026-10-05 — Cursor:** Fixed pick-exercises edit: duplicate `cardLayout` crash + overflow clipping hid sets/reps/rest.
- **2026-10-05 — Cursor:** Edit keeps the title vertically centered on the row. Pencil replaced with a thick slider/tune mark.
- **2026-10-05 — Cursor:** In-workout add-exercise now mounts rows one-by-one like pick-exercises (no shared delay that dumped them all at once).
- **2026-10-05 — Cursor:** Pick-exercises title eases down into the row on edit. Tune icon stays gray until selected (then blue).
- **2026-10-05 — Cursor:** Sets/reps/rest fade in with the title when you open edit.
- **2026-10-05 — Cursor:** Edit expand is one motion — row grows, rows below ease down, and sets/reps/rest fade in on the same curve.
- **2026-10-05 — Cursor:** Only one pick-exercises row stays in edit at a time — opening another collapses the current one.
- **2026-10-05 — Cursor:** Exercise notes sit on their own line above set/previous, using the same off-white `#FAFAFA` field as kg/reps. Hidden until Add/Edit Note; clears if left empty.
- **2026-10-05 — Cursor:** Hide the divider above remove/add once an exercise card is complete (blue).
- **2026-10-05 — Cursor:** Active-workout exercise title slides down on expand and back on collapse (same motion as pick-exercises edit), while the set count fades.
- **2026-10-05 — Cursor:** Completed exercise lines are mid-blue (`#B8C4FF` / `#8FA4FF`), lighter than the title ink.
- **2026-10-05 — Cursor:** Add Warm-up Set inserts one W set above working sets; tap again to add another.

## 10. What to do next (as of the top of §9)

1. Confirm the app boots to the Muscle Select screen without red errors.
2. Walk the smoke-test flow in §5. Report every visible bug (broken layout,
   missing GIF, wrong data, network error) — patch on this branch, don't
   push.
3. Once Harry says **"Testing passed"**: commit the §6 files, push, open
   PR. Template lives in §8.
