// Client helper for AI journaling — sends the user's rough notes to the
// `journal` Edge Function (Gemini) and gets back a polished diary entry.
import { supabase } from './supabase';

export interface JournalInput {
  text: string;
  mood?: string;
  phase?: string;
  day?: number;
}

export async function polishJournal(
  input: JournalInput,
): Promise<{ title: string; body: string } | { error: string }> {
  const { data, error } = await supabase.functions.invoke('journal', { body: input });
  if (error) return { error: 'The journaling AI is unreachable right now. Please try again.' };
  const p = data as { title?: string; body?: string; error?: string } | null;
  if (!p || p.error || !p.body) return { error: p?.error ?? "Couldn't write your journal right now." };
  return { title: p.title ?? 'Journal entry', body: p.body };
}
