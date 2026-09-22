// Transcribe — turns a short spoken voice note into plain text so the user can
// speak their diary instead of typing (Google Gemini, Supabase Edge Function,
// Deno runtime). The transcript then flows into the normal `journal` polish
// step, so voice and typed diaries share one pipeline.
//
// Shares the GEMINI_API_KEY secret with the other functions; JWT-gated.
// Gemini Flash-Lite is multimodal and accepts inline audio, so we reuse the
// same proven model as Luna. Deploy:  supabase functions deploy transcribe
const MODEL = Deno.env.get('TRANSCRIBE_MODEL') ?? Deno.env.get('LUNA_MODEL') ?? 'gemini-flash-lite-latest';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TranscribeRequest {
  audio?: string; // base64-encoded audio, no data: prefix
  mimeType?: string; // e.g. audio/webm, audio/mp4, audio/ogg
}

const SYSTEM =
  'You transcribe short personal voice notes for someone journaling in a private wellness app. ' +
  'Transcribe the spoken words verbatim and accurately, in the language spoken. Add natural ' +
  'punctuation and sentence breaks so it reads cleanly, but do NOT summarise, rephrase, translate, ' +
  'correct, censor, or add anything the speaker did not say. Do not add commentary or labels. ' +
  'If the audio is silent or has no discernible speech, return an empty string. ' +
  'Respond only with the requested JSON.';

// Gemini accepts a base media type without codec params — normalise
// "audio/webm;codecs=opus" -> "audio/webm".
function baseMime(m: string): string {
  const t = (m || '').split(';')[0].trim().toLowerCase();
  return t.startsWith('audio/') ? t : 'audio/webm';
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) return json({ error: 'Voice notes are not configured yet (missing API key).' }, 500);

    const body = (await req.json()) as TranscribeRequest;
    const audio = (body.audio ?? '').trim();
    if (!audio) return json({ error: 'No audio received.' }, 400);
    // Guard against oversized payloads (~10MB of base64 ≈ 7.5MB audio).
    if (audio.length > 10_000_000) return json({ error: 'That recording is too long — keep it under a couple of minutes.' }, 413);

    const mimeType = baseMime(body.mimeType ?? 'audio/webm');

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM }] },
          contents: [
            {
              role: 'user',
              parts: [
                { inlineData: { mimeType, data: audio } },
                { text: 'Transcribe this voice note.' },
              ],
            },
          ],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: 'object',
              properties: { text: { type: 'string' } },
              required: ['text'],
            },
          },
        }),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error('transcribe gemini error', res.status, detail);
      const msg =
        res.status === 400 || res.status === 401 || res.status === 403
          ? "Couldn't understand that recording — please try again, or type instead."
          : "Couldn't transcribe your voice note right now. Please try again in a moment.";
      return json({ error: msg }, 502);
    }

    const data = await res.json();
    const raw = ((data?.candidates?.[0]?.content?.parts ?? []) as { text?: string }[])
      .map((p) => p?.text ?? '')
      .join('')
      .trim();

    let parsed: { text?: string } | null = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    const text = (parsed?.text ?? '').trim();
    return json({ text });
  } catch (err) {
    console.error('transcribe error', err);
    return json({ error: "Couldn't transcribe your voice note right now. Please try again in a moment." }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
