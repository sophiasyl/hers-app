// Brief — a short, warm "today, by your cycle" plan tailored to the user's
// phase/day and recent logs (Google Gemini, Supabase Edge Function).
// Shares GEMINI_API_KEY; JWT-gated. Deploy: supabase functions deploy brief
const MODEL = Deno.env.get('LUNA_MODEL') ?? 'gemini-flash-lite-latest';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface BriefRequest {
  phase?: string;
  day?: number;
  daysUntilNextPeriod?: number;
  recentLogs?: string;
}

const SYSTEM =
  'You are a warm cycle-wellness guide in the "Hers." app. Given where someone is in their cycle and ' +
  'how they’ve been, write a short "today" brief. Provide: a one-line summary of what today’s phase ' +
  'means for them; and one concrete, gentle suggestion each for energy, movement, nourishment, and ' +
  'mind/mood/social. Tailor everything to the phase, cycle day, and anything they logged. Keep each ' +
  'field to ONE short, specific, encouraging sentence — practical, never clinical or preachy. Not ' +
  'medical advice. Return only the requested JSON.';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'not configured' }, 500);

    const body = (await req.json()) as BriefRequest;
    const bits: string[] = [];
    if (body.phase && body.day) bits.push(`Day ${body.day}, ${body.phase.toLowerCase()} phase.`);
    if (typeof body.daysUntilNextPeriod === 'number') {
      bits.push(
        body.daysUntilNextPeriod >= 0
          ? `Next period in about ${body.daysUntilNextPeriod} day(s).`
          : `Period about ${Math.abs(body.daysUntilNextPeriod)} day(s) late.`,
      );
    }
    if (body.recentLogs?.trim()) bits.push(`Recently logged:\n${body.recentLogs.trim()}`);
    const userText = bits.join('\n') || 'A typical day in the cycle.';

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: userText }] }],
          generationConfig: {
            maxOutputTokens: 600,
            temperature: 0.85,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: {
                summary: { type: 'string' },
                energy: { type: 'string' },
                movement: { type: 'string' },
                nourish: { type: 'string' },
                mind: { type: 'string' },
              },
              required: ['summary', 'energy', 'movement', 'nourish', 'mind'],
            },
          },
        }),
      },
    );

    if (!res.ok) {
      console.error('brief gemini error', res.status, await res.text());
      return json({ error: 'gemini error' }, 502);
    }

    const data = await res.json();
    const raw = ((data?.candidates?.[0]?.content?.parts ?? []) as { text?: string }[])
      .map((p) => p?.text ?? '')
      .join('')
      .trim();
    let parsed: Record<string, string> | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (!parsed?.summary) return json({ error: 'no brief' }, 502);
    return json({ brief: parsed });
  } catch (err) {
    console.error('brief error', err);
    return json({ error: 'error' }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
