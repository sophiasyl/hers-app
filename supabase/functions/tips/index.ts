// Tips — AI-generated gentle self-care suggestions for the user's current
// symptoms, tailored to their cycle phase/day (Google Gemini, Supabase Edge
// Function). Shares the GEMINI_API_KEY secret; JWT-gated.
// Deploy:  supabase functions deploy tips
const MODEL = Deno.env.get('LUNA_MODEL') ?? 'gemini-flash-lite-latest';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TipsRequest {
  symptoms: string[];
  phase?: string;
  day?: number;
}

const SYSTEM =
  'You are a warm, practical wellness companion in the "Hers." menstrual-cycle app. For each symptom the ' +
  'user is experiencing, suggest what tends to help right now given where they are in their cycle: one ' +
  'short soothing action or remedy (e.g. a warm compress, a few slow breaths, a gentle walk) and a couple ' +
  'of specific food ideas. Tailor the advice to the cycle phase and day. Keep each suggestion warm, ' +
  'concrete and fresh — vary the wording, avoid clichés, and don’t repeat the same tip across symptoms. ' +
  'These are gentle self-care ideas, not medical advice; never diagnose or recommend prescription drugs. ' +
  'Return only the requested JSON, with one entry per symptom, echoing each symptom name exactly.';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'not configured' }, 500);

    const body = (await req.json()) as TipsRequest;
    const symptoms = (body.symptoms ?? []).map((s) => String(s).trim()).filter(Boolean).slice(0, 6);
    if (!symptoms.length) return json({ tips: [] });

    const ctx =
      body.phase && body.day
        ? `Cycle: day ${body.day}, ${body.phase.toLowerCase()} phase.\n`
        : '';
    const userText = `${ctx}Symptoms: ${symptoms.join(', ')}.`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: {
            maxOutputTokens: 800,
            temperature: 0.9,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                tips: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      symptom: { type: 'string' },
                      soothe: { type: 'string' },
                      foods: { type: 'string' },
                    },
                    required: ['symptom', 'soothe', 'foods'],
                  },
                },
              },
              required: ['tips'],
            },
          },
        }),
      },
    );

    if (!res.ok) {
      console.error('tips gemini error', res.status, await res.text());
      return json({ error: 'gemini error' }, 502);
    }

    const data = await res.json();
    const raw = ((data?.candidates?.[0]?.content?.parts ?? []) as { text?: string }[])
      .map((p) => p?.text ?? '')
      .join('')
      .trim();
    let parsed: { tips?: unknown } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const tips = Array.isArray(parsed?.tips) ? parsed!.tips : [];
    return json({ tips });
  } catch (err) {
    console.error('tips error', err);
    return json({ error: 'error' }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
