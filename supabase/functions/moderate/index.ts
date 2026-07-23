// Moderate — checks a community post/reply against the Hers. community
// guidelines before it's shown (Google Gemini, Supabase Edge Function).
//
// Shares the GEMINI_API_KEY secret; JWT-gated.
// Deploy:  supabase functions deploy moderate
const MODEL = Deno.env.get('LUNA_MODEL') ?? 'gemini-flash-lite-latest';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM =
  'You are a content-safety reviewer for "Hers.", a supportive menstrual-cycle and wellness community. ' +
  'Decide whether a post follows the community guidelines. BLOCK content that: solicits sexual or ' +
  'romantic partners or hookups; buys, sells, advertises or promotes any product, service or ' +
  'money-making scheme (including "DM me to buy", prices, or links); shares personal contact details or ' +
  'tries to move people off-platform; harasses, bullies, demeans or expresses hate toward any person or ' +
  'group; encourages self-harm, disordered eating or dangerous behaviour; states medical misinformation ' +
  'as fact or pushes unproven "cures"; or is spam, scams, or clearly off-topic. ALLOW genuine, supportive ' +
  'posts about cycles, symptoms, moods, wellbeing and everyday life. When unsure, lean toward ALLOWING ' +
  'supportive personal sharing. If you block, give a short, kind, user-facing reason. Respond only with ' +
  'the requested JSON.';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    // Fail open if unconfigured — the client keeps a local keyword check as backstop.
    if (!apiKey) return json({ allowed: true, reason: '' });

    const { text } = (await req.json()) as { text?: string };
    const content = (text ?? '').trim();
    if (!content) return json({ allowed: true, reason: '' });

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [{ role: 'user', parts: [{ text: `Post to review:\n${content}` }] }],
          generationConfig: {
            maxOutputTokens: 200,
            temperature: 0,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: { allowed: { type: 'boolean' }, reason: { type: 'string' } },
              required: ['allowed', 'reason'],
            },
          },
        }),
      },
    );

    if (!res.ok) {
      console.error('moderate gemini error', res.status, await res.text());
      return json({ allowed: true, reason: '' }); // fail open
    }

    const data = await res.json();
    const raw = ((data?.candidates?.[0]?.content?.parts ?? []) as { text?: string }[])
      .map((p) => p?.text ?? '')
      .join('')
      .trim();
    let parsed: { allowed?: boolean; reason?: string } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    if (!parsed || typeof parsed.allowed !== 'boolean') return json({ allowed: true, reason: '' });
    return json({ allowed: parsed.allowed, reason: parsed.reason ?? '' });
  } catch (err) {
    console.error('moderate error', err);
    return json({ allowed: true, reason: '' }); // fail open
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
