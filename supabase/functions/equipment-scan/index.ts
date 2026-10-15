import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function imageParts(dataUrl: string): { mimeType: string; data: string } | null {
  const match = /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i.exec(dataUrl);
  if (!match) return null;
  return { mimeType: match[1].toLowerCase(), data: match[2] };
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

type GeminiEquipmentResult = {
  candidates?: string[];
  observed_text?: string;
};

async function identifyEquipment(imageDataUrl: string, apiKey: string): Promise<GeminiEquipmentResult> {
  const image = imageParts(imageDataUrl);
  if (!image || image.data.length > 2_100_000) {
    throw new Error('Please take a smaller, sharper photo of the machine or its instruction placard.');
  }

  const geminiResponse = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent',
    {
      method: 'POST',
      headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: 'You identify gym equipment only. First read any visible manufacturer name, model, QR destination, machine title, exercise diagram, and instruction placard. Return up to three short, generic exercise search names that a workout catalog is likely to contain (for example "seated leg press" or "cable triceps pushdown"). Do not claim certainty, do not invent a specific machine model, and do not provide workout instructions. If the machine or label is not clear enough, return an empty candidates array. observed_text must contain only a concise transcription of text you can clearly see, or an empty string.' }],
        },
        contents: [{ role: 'user', parts: [
          { inline_data: { mime_type: image.mimeType, data: image.data } },
          { text: 'Identify this gym machine or its exercise placard.' },
        ] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 250,
          responseMimeType: 'application/json',
          responseJsonSchema: {
            type: 'object', additionalProperties: false,
            required: ['candidates', 'observed_text'],
            properties: {
              candidates: { type: 'array', items: { type: 'string' }, maxItems: 3 },
              observed_text: { type: 'string' },
            },
          },
        },
      }),
    },
  );
  if (!geminiResponse.ok) {
    throw new Error('Could not identify that equipment. Please try a clear photo of its exercise placard.');
  }
  const parsed = await geminiResponse.json() as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> };
  const text = parsed.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('') ?? '';
  return JSON.parse(text) as GeminiEquipmentResult;
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'Method not allowed.' }, 405);

  const user = await getAuthenticatedUser(request);
  if (!user) return response({ error: 'Sign in to scan equipment.' }, 401);

  let body: { imageDataUrl?: string };
  try {
    body = await request.json();
  } catch {
    return response({ error: 'Invalid request.' }, 400);
  }
  if (!body.imageDataUrl) return response({ error: 'A machine photo is required.' }, 400);

  const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
  if (!geminiApiKey) return response({ error: 'Equipment scanning has not been configured yet.' }, 503);

  try {
    const result = await identifyEquipment(body.imageDataUrl, geminiApiKey);
    return response({
      candidates: Array.isArray(result.candidates)
        ? result.candidates.filter((name): name is string => typeof name === 'string').slice(0, 3)
        : [],
      observedText: typeof result.observed_text === 'string' ? result.observed_text : '',
    });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : 'Could not identify that equipment.' }, 422);
  }
});
