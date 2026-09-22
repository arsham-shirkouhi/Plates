import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FDC_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

type Action = 'search' | 'barcode' | 'photo';
type FoodSource = 'usda_fndds' | 'usda_foundation' | 'usda_branded';

interface FdcNutrient {
  nutrientName?: string;
  name?: string;
  unitName?: string;
  value?: number;
  amount?: number;
  nutrient?: { name?: string; unitName?: string };
}

interface FdcFood {
  fdcId: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  gtinUpc?: string;
  dataType?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: FdcNutrient[];
}

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function numberOrZero(value: unknown): number {
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : 0;
}

function nutrientValue(food: FdcFood, names: string[]): number {
  const nutrient = food.foodNutrients?.find((item) => {
    const name = (item.nutrientName ?? item.name ?? item.nutrient?.name ?? '').toLowerCase();
    return names.some((candidate) => name === candidate);
  });
  return numberOrZero(nutrient?.value ?? nutrient?.amount);
}

function sourceFor(food: FdcFood): FoodSource {
  return food.dataType === 'Branded' ? 'usda_branded' : food.dataType === 'Foundation' ? 'usda_foundation' : 'usda_fndds';
}

/**
 * Phone cameras commonly return UPC-A (12 digits) while FDC may store the
 * same product as a GTIN-14 with leading zeroes. Compare the identifier's
 * meaningful digits and query both forms; do not fuzzy-match barcodes.
 */
function canonicalBarcode(value?: string): string {
  return (value ?? '').replace(/[^0-9]/g, '').replace(/^0+/, '');
}

function barcodeQueryForms(barcode: string): string[] {
  const normalized = barcode.replace(/[^0-9]/g, '');
  const expandedUpcE = expandUpcE(normalized);
  const candidates = [normalized, expandedUpcE].filter((value): value is string => Boolean(value));
  return [...new Set(candidates.flatMap((value) => [value, value.padStart(14, '0')]))];
}

/** Convert an 8-digit UPC-E scan to its exact UPC-A form. */
function expandUpcE(value: string): string | null {
  if (value.length !== 8) return null;
  const [numberSystem, d1, d2, d3, d4, d5, d6, check] = value;
  let body: string;
  if ('012'.includes(d6)) body = `${numberSystem}${d1}${d2}${d6}0000${d3}${d4}${d5}`;
  else if (d6 === '3') body = `${numberSystem}${d1}${d2}${d3}00000${d4}${d5}`;
  else if (d6 === '4') body = `${numberSystem}${d1}${d2}${d3}${d4}00000${d5}`;
  else body = `${numberSystem}${d1}${d2}${d3}${d4}${d5}0000${d6}`;
  return `${body}${check}`;
}

function rounded(value: number): number {
  return Math.round(value);
}

function normalize(food: FdcFood) {
  return normalizeForGrams(food, numberOrZero(food.servingSize) || 100, Boolean(food.servingSize));
}

function normalizeForGrams(food: FdcFood, grams: number, isPackageServing = false) {
  const unit = food.servingSizeUnit?.toLowerCase() === 'g' ? 'g' : 'g';
  const servingMultiplier = grams / 100;
  const perServing = (names: string[]) => nutrientValue(food, names) * servingMultiplier;
  return {
    id: String(food.fdcId),
    source: sourceFor(food),
    name: food.description ?? 'Unknown food',
    brand: food.brandOwner ?? food.brandName,
    barcode: food.gtinUpc,
    servingGrams: grams,
    servingLabel: isPackageServing ? `${grams}${unit} serving` : `${grams}${unit} estimate`,
    nutrients: {
      calories: rounded(perServing(['energy'])),
      protein: rounded(perServing(['protein'])),
      carbs: rounded(perServing(['carbohydrate, by difference', 'carbohydrate'])),
      fats: rounded(perServing(['total lipid (fat)', 'total fat (nlea)'])),
    },
  };
}

interface PhotoIngredient {
  name?: string;
  estimated_grams?: number;
}

function imageParts(imageDataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
  if (!match) return null;
  return { mimeType: match[1], data: match[2] };
}

async function identifyPhotoIngredients(imageDataUrl: string, apiKey: string): Promise<PhotoIngredient[]> {
  const image = imageParts(imageDataUrl);
  if (!image || image.data.length > 2_100_000) {
    throw new Error('Please choose a smaller photo of your meal.');
  }

  const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent', {
    method: 'POST',
    headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: 'Identify visible edible components in this meal photo. Return only ingredients you can see. Estimate cooked edible weight in grams. Do not invent hidden ingredients, sauces, oils, brands, or nutrition. When uncertain, use a conservative generic name and estimate.' }],
      },
      contents: [{
        role: 'user',
        parts: [
          { inline_data: { mime_type: image.mimeType, data: image.data } },
          { text: 'Analyze this meal for an editable food log.' },
        ],
      }],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 500,
        responseMimeType: 'application/json',
        responseJsonSchema: {
          type: 'object',
          additionalProperties: false,
          required: ['ingredients'],
          properties: {
            ingredients: {
              type: 'array',
              maxItems: 8,
              items: {
                type: 'object',
                additionalProperties: false,
                required: ['name', 'estimated_grams'],
                properties: {
                  name: { type: 'string' },
                  estimated_grams: { type: 'number', minimum: 1, maximum: 2000 },
                },
              },
            },
          },
        },
      },
    }),
  });
  if (!geminiResponse.ok) throw new Error('Photo analysis is temporarily unavailable.');
  const parsed = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = parsed.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  const result = JSON.parse(text) as { ingredients?: PhotoIngredient[] };
  return (result.ingredients ?? []).filter((ingredient) => ingredient.name && numberOrZero(ingredient.estimated_grams) > 0).slice(0, 8);
}

async function findUsdaFood(query: string, apiKey: string): Promise<FdcFood | null> {
  const fdcResponse = await fetch(`${FDC_BASE_URL}/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, dataType: ['Survey (FNDDS)', 'Foundation'], pageSize: 1 }),
  });
  if (!fdcResponse.ok) return null;
  const payload = await fdcResponse.json() as { foods?: FdcFood[] };
  return payload.foods?.[0] ?? null;
}

async function getAuthenticatedUser(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return null;
  const client = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } },
  );
  const { data } = await client.auth.getUser();
  return data.user;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

  const user = await getAuthenticatedUser(request);
  if (!user) return response({ error: 'Sign in to search foods.' }, 401);

  const apiKey = Deno.env.get('USDA_FDC_API_KEY');
  if (!apiKey) return response({ error: 'USDA food search has not been configured.' }, 503);

  let body: { action?: Action; query?: string; barcode?: string; imageDataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request.' }, 400);
  }

  const action = body.action;
  if (action === 'photo') {
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) return response({ error: 'Photo logging has not been configured yet.' }, 503);
    if (!body.imageDataUrl) return response({ error: 'A meal photo is required.' }, 400);
    try {
      const ingredients = await identifyPhotoIngredients(body.imageDataUrl, geminiApiKey);
      const matches = await Promise.all(ingredients.map(async (ingredient) => {
        const food = await findUsdaFood(ingredient.name!, apiKey);
        const grams = Math.round(numberOrZero(ingredient.estimated_grams));
        return food ? normalizeForGrams(food, grams) : null;
      }));
      return response({ foods: matches.filter((food): food is ReturnType<typeof normalizeForGrams> => food !== null) });
    } catch (error) {
      return response({ error: error instanceof Error ? error.message : 'Photo analysis is unavailable.' }, 502);
    }
  }
  const query = action === 'barcode' ? body.barcode?.replace(/[^0-9]/g, '') : body.query?.trim();
  if ((action !== 'search' && action !== 'barcode') || !query) {
    return response({ error: 'A search query or barcode is required.' }, 400);
  }

  const dataTypes = action === 'barcode' ? ['Branded'] : ['Survey (FNDDS)', 'Foundation'];
  const queries = action === 'barcode' ? barcodeQueryForms(query) : [query];
  const resultSets = await Promise.all(queries.map(async (searchQuery) => {
    const fdcResponse = await fetch(`${FDC_BASE_URL}/foods/search?api_key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: searchQuery, dataType: dataTypes, pageSize: action === 'barcode' ? 25 : 12 }),
    });
    if (!fdcResponse.ok) throw new Error('USDA FoodData Central is unavailable.');
    const payload = await fdcResponse.json() as { foods?: FdcFood[] };
    return payload.foods ?? [];
  })).catch(() => null);
  if (!resultSets) return response({ error: 'USDA FoodData Central is unavailable.' }, 502);

  const matchingFoods = resultSets.flat().filter((food) =>
    action !== 'barcode' || canonicalBarcode(food.gtinUpc) === canonicalBarcode(query)
  );
  const foods = [...new Map(matchingFoods.map((food) => [food.fdcId, food])).values()].map(normalize);

  return response({ foods });
});
