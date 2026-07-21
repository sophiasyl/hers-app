// Journal — turns a user's rough, unpolished notes into a warm first-person
// diary entry (Google Gemini, Supabase Edge Function, Deno runtime).
//
// Shares the GEMINI_API_KEY secret with the luna function; JWT-gated.
// Deploy:  supabase functions deploy journal
const MODEL = Deno.env.get('LUNA_MODEL') ?? 'gemini-flash-lite-latest';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface JournalRequest {
  text: string;
  mood?: string;
  phase?: string;
  day?: number;
}

const SYSTEM =
  'You are a gentle journaling companion inside the "Hers." wellness app. The user jots down rough, ' +
  'unpolished thoughts about their day and how they feel. Turn their notes into a warm, first-person ' +
  'diary entry that genuinely sounds like THEM — honest, natural and reflective, never flowery, ' +
  'exaggerated, or clinical. Preserve their meaning, feelings and voice; gently smooth the grammar and ' +
  'shape it into 1–3 short paragraphs. Do NOT invent events or feelings they did not express. If they ' +
  'mention their cycle or mood you may acknowledge it lightly. Also write a short, evocative title of ' +
  '3–6 words. Respond only with the requested JSON.';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'Journaling is not configured yet (missing API key).' }, 500);

    const body = (await req.json()) as JournalRequest;
    const text = (body.text ?? '').trim();
    if (!text) return json({ error: 'Nothing to journal.' }, 400);

    const ctxBits: string[] = [];
    if (body.mood) ctxBits.push(`They say they feel: ${body.mood}.`);
    if (body.phase && body.day) ctxBits.push(`They are on day ${body.day}, ${body.phase.toLowerCase()} phase.`);
    const userText = (ctxBits.length ? ctxBits.join(' ') + '\n\n' : '') + `Their notes:\n${text}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: {
            maxOutputTokens: 900,
            temperature: 0.9,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: { title: { type: 'string' }, body: { type: 'string' } },
              required: ['title', 'body'],
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error('journal gemini error', res.status, detail);
      const msg =
        res.status === 400 || res.status === 401 || res.status === 403
          ? 'The AI key looks invalid or expired. Please set a valid Gemini key.'
          : "Couldn't write your journal right now. Please try again in a moment.";
      return json({ error: msg }, 502);
    }

    const data = await res.json();
    const raw = ((data?.candidates?.[0]?.content?.parts ?? []) as { text?: string }[])
      .map((p) => p?.text ?? '')
      .join('')
      .trim();

    let parsed: { title?: string; body?: string } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const title = (parsed?.title ?? '').trim() || 'Journal entry';
    const entry = (parsed?.body ?? '').trim() || raw;
    if (!entry) return json({ error: "Couldn't write your journal right now. Please try again." }, 502);

    return json({ title, body: entry });
  } catch (err) {
    console.error('journal error', err);
    return json({ error: "Couldn't write your journal right now. Please try again in a moment." }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
