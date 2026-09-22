# USDA food search setup

The mobile app never receives the USDA API key. It calls the `usda-food`
Supabase Edge Function, which requires an authenticated Plates user and holds
the key as a Supabase secret.

## One-time owner setup

1. Request a free FoodData Central key at
   <https://fdc.nal.usda.gov/api-key-signup.html>.
2. In the project directory, authenticate the Supabase CLI and link the right
   project. (Use the project reference from the Supabase dashboard URL.)

   ```bash
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Store the key only as a server-side Supabase secret, then deploy:

   ```bash
   npx supabase secrets set USDA_FDC_API_KEY=YOUR_DATA_GOV_KEY
   npx supabase functions deploy usda-food
   ```

### Optional meal-photo analysis

Meal photos use Gemini vision only to identify visible ingredients and suggest
an editable weight. The Edge Function then looks up calories and macros in
USDA FoodData Central. It does not store the photo, and photo results should
always be treated as estimates: a single photo cannot reliably reveal hidden
oil, sauces, recipes, or exact portion depth.

1. Create a Gemini API key in Google AI Studio. Begin on its free tier; move
   the same project to paid billing when the trial results justify it.
2. Store it only as a Supabase Edge Function secret:

   ```bash
   npx supabase secrets set GEMINI_API_KEY=YOUR_GEMINI_API_KEY
   npx supabase functions deploy usda-food
   ```

The app uses `gemini-2.5-flash-lite` with structured JSON. Users can delete
an identified item, edit its grams, or search USDA to add a missing ingredient
before logging.

4. Restart Expo with a clear cache and test while signed in:

   ```bash
   npx expo start --clear --tunnel
   ```

## What to test

- Search `chicken breast`, open a result, and add it to lunch.
- Scan a packaged product UPC/EAN. A found item must show its brand/name and
  nutrition for its **label serving size**; changing number of servings must
  multiply those label values. An unknown barcode must offer a safe fallback
  rather than invent values.
- Take a photo of a plate, change an estimated gram value, add a missing
  ingredient, and confirm that every reviewed item is logged to the selected
  meal.
- Turn off the network and verify the existing quick-add list still works.

## Security and data rules

- Never add `USDA_FDC_API_KEY` to `.env`, `app.json`, or a mobile build.
- The Edge Function rejects requests without a valid Supabase user session.
- `GEMINI_API_KEY` is optional, server-only, and is never added to `.env`,
  `app.json`, or a mobile build. A photo is sent for one analysis request and
  is not stored by the app or Supabase function.
- The client is intentionally limited to FNDDS/Foundation typed search and
  exact branded barcode matching.
- All FoodData Central data must be credited to USDA in the finished food UI.
