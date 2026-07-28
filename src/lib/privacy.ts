// Privacy tools: export everything we hold about the user, or delete their
// content. Everything runs under the user's own session (RLS restricts to
// their own rows).
import { supabase } from './supabase';

export async function exportMyData(userId: string): Promise<Record<string, unknown>> {
  const [prof, flow, well, med, jour, chats, msgs, posts, comments] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId),
    supabase.from('flow_logs').select('*').eq('user_id', userId),
    supabase.from('wellness_logs').select('*').eq('user_id', userId),
    supabase.from('medication_logs').select('*').eq('user_id', userId),
    supabase.from('journal_entries').select('*').eq('user_id', userId),
    supabase.from('luna_chats').select('*').eq('user_id', userId),
    supabase.from('luna_messages').select('*').eq('user_id', userId),
    supabase.from('community_posts').select('*').eq('user_id', userId),
    supabase.from('community_comments').select('*').eq('user_id', userId),
  ]);
  return {
    app: 'Hers.',
    exported_at: new Date().toISOString(),
    profile: prof.data?.[0] ?? null,
    flow_logs: flow.data ?? [],
    wellness_logs: well.data ?? [],
    medication_logs: med.data ?? [],
    journal_entries: jour.data ?? [],
    luna_chats: chats.data ?? [],
    luna_messages: msgs.data ?? [],
    community_posts: posts.data ?? [],
    community_comments: comments.data ?? [],
  };
}

/** Delete all of the user's content. Their account/profile stays. */
export async function deleteMyData(userId: string): Promise<void> {
  await Promise.all([
    supabase.from('flow_logs').delete().eq('user_id', userId),
    supabase.from('wellness_logs').delete().eq('user_id', userId),
    supabase.from('medication_logs').delete().eq('user_id', userId),
    supabase.from('journal_entries').delete().eq('user_id', userId),
    supabase.from('luna_messages').delete().eq('user_id', userId),
    supabase.from('luna_chats').delete().eq('user_id', userId),
    supabase.from('community_hugs').delete().eq('user_id', userId),
    supabase.from('community_comments').delete().eq('user_id', userId),
    supabase.from('community_reports').delete().eq('reporter_id', userId),
    supabase.from('community_posts').delete().eq('user_id', userId),
  ]);
}
