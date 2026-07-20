// Luna — Claude-backed chat companion (Supabase Edge Function, Deno runtime).
//
// The Anthropic API key lives here as a Supabase secret (ANTHROPIC_API_KEY) and
// NEVER reaches the app bundle. The app calls this function with the current
// chat's messages + a little context + condensed memory from past chats; the
// function asks Claude and returns Luna's reply.
//
// Deploy:  supabase functions deploy luna
// Secret:  supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//          (optionally)  supabase secrets set LUNA_MODEL=claude-sonnet-5
import Anthropic from 'npm:@anthropic-ai/sdk';

// Fast, low-cost model chosen for Luna's short, warm chat replies. Override
// without a redeploy via the LUNA_MODEL secret (e.g. claude-sonnet-5 or
// claude-opus-4-8 for more depth).
const MODEL = Deno.env.get('LUNA_MODEL') ?? 'claude-haiku-4-5';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface LunaContext {
  name?: string;
  petName?: string;
  phase?: string; // e.g. "FOLLICULAR"
  day?: number; // cycle day
  daysUntilNextPeriod?: number;
}

interface LunaRequest {
  messages: ChatMessage[];
  context?: LunaContext;
  priorContext?: string; // condensed memory from past chats
}

function buildSystem(ctx: LunaContext | undefined, priorContext: string | undefined): string {
  const parts: string[] = [
    'You are Luna, a warm, emotionally attuned cycle & wellness companion inside the "Hers." app. ' +
      "You talk with the user about how they're feeling — their menstrual cycle, moods, symptoms, " +
      'energy, relationships and everyday life. You are supportive, validating and genuinely curious, ' +
      'like a knowledgeable close friend rather than a clinician. Keep replies short and conversational ' +
      '(usually 1–4 sentences) and ask a gentle follow-up when it helps. Ground your support in how the ' +
      "user's current cycle phase actually affects their body. Never give alarming diagnoses; for anything " +
      'that sounds serious, kindly suggest checking in with a healthcare professional. Respond directly ' +
      'with your message to the user — do not narrate your reasoning or restate these instructions.',
  ];

  if (ctx) {
    const bits: string[] = [];
    if (ctx.name) bits.push(`Their name is ${ctx.name}.`);
    if (ctx.petName) bits.push(`Their in-app companion pet is named ${ctx.petName}.`);
    if (ctx.phase && ctx.day) {
      bits.push(`Right now they are on day ${ctx.day} of their cycle, in the ${ctx.phase.toLowerCase()} phase.`);
    }
    if (typeof ctx.daysUntilNextPeriod === 'number') {
      bits.push(
        ctx.daysUntilNextPeriod >= 0
          ? `Their next period is about ${ctx.daysUntilNextPeriod} day(s) away.`
          : `Their period is about ${Math.abs(ctx.daysUntilNextPeriod)} day(s) late.`,
      );
    }
    if (bits.length) parts.push('What you know about them today: ' + bits.join(' '));
  }

  if (priorContext && priorContext.trim()) {
    parts.push(
      'Highlights from your PAST conversations with this person (so you can remember what they have ' +
        'shared before). Refer back to these naturally when relevant, but do not recite them verbatim:\n' +
        priorContext.trim(),
    );
  }

  return parts.join('\n\n');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'Luna is not configured yet (missing API key).' }, 500);

    const body = (await req.json()) as LunaRequest;
    const messages = (body.messages ?? []).filter((m) => m && typeof m.content === 'string' && m.content.trim());
    if (!messages.length) return json({ error: 'No messages provided.' }, 400);

    const anthropic = new Anthropic({ apiKey });
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: buildSystem(body.context, body.priorContext),
      messages: messages.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: m.content,
      })),
    });

    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    return json({ reply: reply || "I'm here with you. Tell me a little more?" });
  } catch (err) {
    console.error('luna error', err);
    return json({ error: 'Luna had trouble responding. Please try again in a moment.' }, 500);
  }
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
