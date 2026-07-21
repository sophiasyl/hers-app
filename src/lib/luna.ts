// Client helpers for Luna — the Claude-backed chat companion.
//
// Chat history lives in Supabase (luna_chats / luna_messages, RLS-protected).
// Each visit starts a NEW chat; when sending, we hand Claude the current chat's
// messages plus condensed memory pulled from the user's PAST chats, so Luna can
// refer back to old conversations. Claude itself runs server-side in the `luna`
// Edge Function — the Anthropic key never reaches this bundle.
import { supabase } from './supabase';

export interface LunaMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
}

export interface LunaContext {
  name?: string;
  petName?: string;
  phase?: string;
  day?: number;
  daysUntilNextPeriod?: number;
}

interface MessageRow {
  role: string;
  content: string;
}

// Shown as a local, un-persisted opening bubble each time Luna is opened.
export const LUNA_GREETING =
  "Hi, I'm Luna. Fresh chat, blank slate — but I still remember our past talks. How are you feeling today?";

// How much past-chat memory to hand Claude (kept bounded for cost + latency).
const PRIOR_MESSAGE_LIMIT = 40;
const PRIOR_CHAR_LIMIT = 4000;

/** Create a new chat row for this user and return its id (null on failure). */
export async function startChat(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('luna_chats')
    .insert({ user_id: userId })
    .select('id')
    .single();
  if (error || !data) return null;
  return (data as { id: string }).id;
}

async function saveMessage(
  userId: string,
  chatId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  await supabase.from('luna_messages').insert({ user_id: userId, chat_id: chatId, role, content });
}

/** Condensed transcript of the user's PAST chats (excludes the current one). */
export async function loadPriorContext(userId: string, currentChatId: string): Promise<string> {
  const { data } = await supabase
    .from('luna_messages')
    .select('role,content')
    .eq('user_id', userId)
    .neq('chat_id', currentChatId)
    .order('created_at', { ascending: false })
    .limit(PRIOR_MESSAGE_LIMIT);
  if (!data || !data.length) return '';
  // Newest-first from the query → flip to chronological for readability.
  const lines = (data as MessageRow[])
    .slice()
    .reverse()
    .map((r) => `${r.role === 'user' ? 'Them' : 'You (Luna)'}: ${r.content}`);
  let text = lines.join('\n');
  if (text.length > PRIOR_CHAR_LIMIT) text = '…' + text.slice(text.length - PRIOR_CHAR_LIMIT);
  return text;
}

/**
 * Persist the user's latest message, ask Claude (with current-chat history +
 * prior-chat memory), persist and return Luna's reply.
 * `history` is the current chat INCLUDING the just-sent user message; it must
 * start with a user message (the greeting bubble is excluded by the caller).
 */
export async function sendToLuna(params: {
  userId: string;
  chatId: string;
  history: LunaMessage[];
  context: LunaContext;
}): Promise<{ reply: string } | { error: string }> {
  const { userId, chatId, history, context } = params;
  const latest = history[history.length - 1];
  if (!latest) return { error: 'Nothing to send.' };

  await saveMessage(userId, chatId, 'user', latest.content);
  const priorContext = await loadPriorContext(userId, chatId);

  const { data, error } = await supabase.functions.invoke('luna', {
    body: {
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      context,
      priorContext,
    },
  });

  if (error) return { error: 'Luna is unreachable right now. Please try again.' };
  const payload = data as { reply?: string; error?: string } | null;
  const reply = payload?.reply;
  if (!reply) return { error: payload?.error ?? 'Luna had trouble responding.' };

  await saveMessage(userId, chatId, 'assistant', reply);
  return { reply };
}
