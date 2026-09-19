# Food data EDA and trial recommendation

**Decision:** use USDA FoodData Central (FDC) as the only source family for the initial trial. It gives Plates a single, public-domain source with two appropriate data types:

1. **FNDDS 2021–2023** for typed food logging, household portions, and nutrient calculations.
2. **USDA Global Branded Food Products Database (GBFPD)** for barcode scanning of packaged foods.

Open Food Facts is intentionally not a trial dependency. It can become a clearly-labelled, low-confidence fallback when barcode coverage is more important than data provenance.

## What was profiled

Downloads examined on 2026-09-18:

| Dataset | Release | Download inspected | Role |
| --- | --- | ---: | --- |
| Foundation Foods | 2026-04-30 | CSV, 32 MB extracted | scientifically analysed whole-food reference |
| FNDDS / Survey Foods | 2021–2023, published 2024-10-31 | JSON, 66 MB | primary user-facing food catalogue |
| GBFPD / Branded Foods | 2026-04-30 | documentation and release metadata; archive not downloaded | barcode lookup |

The branded archive is approximately 428 MB compressed / 2.9 GB extracted. It should not be put in the repository or embedded in the mobile app. Query it through a server endpoint and cache only the products users scan.

## Findings

### 1. Foundation Foods is high-quality, but too small to be the app catalogue

The 2026-04-30 archive contains many supporting analytical records. Filtering to records whose `food.data_type` is `foundation_food` yields **469 canonical foods**, not 87,990 user-searchable foods.

| Quality signal | Result |
| --- | ---: |
| Canonical Foundation foods | 469 |
| Missing descriptions / categories | 0 / 0 |
| Foods with nutrient rows | 468 |
| Nutrient rows per nutrient-bearing food | 45.8 average (12–159) |
| Energy / protein / fat coverage | 74.0% / 90.6% / 88.1% |
| Carbohydrate / fibre / sodium coverage | 80.4% / 51.4% / 85.9% |

Interpretation: use Foundation as the preferred result for an exact whole-food match or as the future nutrition-validation benchmark. Do **not** make it the only search index: its coverage is deliberately deep rather than broad, and a missing nutrient means “not analysed/reported,” never zero.

### 2. FNDDS is the right initial food-logging base

The examined JSON release has a single `SurveyFoods` collection.

| Quality signal | Result |
| --- | ---: |
| Foods | 5,432 |
| Missing descriptions | 0 |
| Foods with at least one portion | 5,432 (100%) |
| Foods with nutrient data | 5,431 (99.98%) |
| Food portions | 4.09 per food on average |
| Nutrients per food | median 65; range 0–65 |
| Energy, protein, fat, carbohydrate, fibre, sodium | each present for 5,431 foods (99.98%) |

Its key fields already fit food logging: `fdcId`, `description`, `wweiaFoodCategory`, `foodPortions`, and `foodNutrients`. Store source FDC ID, release date, nutrient ID/unit, and the selected portion gram weight. Always calculate the logged nutrients from grams—not from display text.

Limit: FNDDS represents foods reported in US dietary surveys. It is excellent for common meals and portions, but it is neither a restaurant menu nor a live packaged-product catalogue.

### 3. GBFPD is the barcode choice

GBFPD is manufacturer/industry-provider data standardized by USDA. It contains brand, serving, ingredient, and nutrient information, and its online API is updated monthly (bulk downloads twice a year). For a found barcode, this is a better first source than crowdsourced data.

Important quality rules:

- Match on a normalized UPC/EAN/GTIN exactly; never fuzzy-match a barcode.
- Show the product’s label serving and also the normalized 100 g values.
- Preserve `fdcId`, barcode, publication/update date, derivation/method, and original ingredients as provenance.
- Missing branded nutrient fields are **unknown**, not zero. Label rounding can also make 100 g values differ slightly from laboratory values.
- Do not claim an allergy-safe product from these fields alone; only show ingredient/allergen information when supplied and label it “check package.”

### Why not Open Food Facts as the selected barcode source?

It is free and useful for coverage, but its own documentation says its voluntary data has no assurance of accuracy, completeness, or reliability. Its public API also limits product reads to 15 per minute per IP and search to 10 per minute per IP. Keep it as an optional later fallback, never as the nutrition or allergy authority in the first release.

## Trial architecture

```
Typed search  → server-side FDC search → FNDDS first → Foundation exact match
Barcode scan  → server-side FDC search → GBFPD exact UPC/EAN match
No match      → manual nutrition entry (save only to that user's history)
```

The mobile app must call **our** Supabase Edge Function (or small backend), not FDC directly. A data.gov API key must stay server-side. The function adds response caching, normalizes records to Plates’ food model, and avoids API-key exposure and duplicated rate-limit traffic.

### Minimal normalized model

```ts
type FoodSource = 'usda_fndds' | 'usda_foundation' | 'usda_branded' | 'manual';

type FoodRecord = {
  id: string;
  source: FoodSource;
  sourceFoodId: string;
  barcode?: string;
  name: string;
  brand?: string;
  category?: string;
  serving: { label: string; grams: number };
  nutrientsPer100g: Record<string, { value: number; unit: string }>;
  ingredients?: string;
  sourceReleaseOrDate: string;
  confidence: 'authoritative' | 'label-derived' | 'manual';
};
```

## Phased plan

1. **Build a two-week food logging MVP.** Register one FDC data.gov key, create an Edge Function for search/details, add FNDDS search and gram-based serving selection, and save meal log entries in Supabase.
2. **Add barcode scanning.** Use Expo Camera for capture; send only the numeric barcode to the same function; query GBFPD and cache successful scans. Provide a manual-entry screen for every miss.
3. **Quality gate before wider testing.** Test 100 common typed foods and 100 real package barcodes. Track match rate, response time, required nutrient completeness, duplicate products, and manual-correction rate.
4. **Recipes and AI later.** First build deterministic nutrition from logged ingredients. AI may turn a recipe sentence or label photo into a draft, but the user must confirm foods, grams, and allergies before it is logged.

## Explicit non-goals for the trial

- No bulk GBFPD import.
- No automatic allergy “safe” verdicts.
- No invented nutrition when FDC lacks a nutrient.
- No AI-generated nutrient numbers without a reviewed source record.

