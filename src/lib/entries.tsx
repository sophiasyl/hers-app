import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from './supabase';
import type { MoodKey } from './theme';

export type EntrySource = 'manual' | 'luna';

export interface Entry {
  id: string;
  body: string;
  mood: MoodKey | null;
  tags: string[];
  createdAt: number;
  source: EntrySource;
  title?: string;
}

/** Pull #hashtags out of free text into a deduped, lowercased tag list. */
export function extractTags(text: string): string[] {
  const matches = text.match(/#[\p{L}\d_]+/gu) ?? [];
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const m of matches) {
    const t = m.slice(1).toLowerCase();
    if (!seen.has(t)) {
      seen.add(t);
      tags.push(t);
    }
  }
  return tags;
}

export interface NewEntry {
  body: string;
  mood?: MoodKey | null;
  source?: EntrySource;
  title?: string;
  tags?: string[];
}

interface EntryRow {
  id: string;
  body: string;
  mood: string | null;
  tags: string[] | null;
  created_at: string;
  source: string;
  title: string | null;
}

function rowToEntry(r: EntryRow): Entry {
  return {
    id: r.id,
    body: r.body,
    mood: (r.mood as MoodKey | null) ?? null,
    tags: r.tags ?? [],
    createdAt: Date.parse(r.created_at),
    source: (r.source as EntrySource) ?? 'manual',
    title: r.title ?? undefined,
  };
}

interface EntriesContextValue {
  entries: Entry[];
  ready: boolean;
  addEntry: (input: NewEntry) => void;
  deleteEntry: (id: string) => void;
}

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        if (data) setEntries((data as EntryRow[]).map(rowToEntry));
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const addEntry = useCallback<EntriesContextValue['addEntry']>(
    ({ body, mood = null, source = 'manual', title, tags }) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const insert = {
        user_id: userId,
        body: trimmed,
        mood,
        tags: tags ?? extractTags(trimmed),
        source,
        title: title ?? null,
      };
      supabase
        .from('journal_entries')
        .insert(insert)
        .select()
        .single()
        .then(({ data }) => {
          if (data) setEntries((prev) => [rowToEntry(data as EntryRow), ...prev]);
        });
    },
    [userId],
  );

  const deleteEntry = useCallback((id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    supabase.from('journal_entries').delete().eq('id', id).then(() => {});
  }, []);

  const value = useMemo(
    () => ({ entries, ready, addEntry, deleteEntry }),
    [entries, ready, addEntry, deleteEntry],
  );

  return <EntriesContext.Provider value={value}>{children}</EntriesContext.Provider>;
}

export function useEntries(): EntriesContextValue {
  const ctx = useContext(EntriesContext);
  if (!ctx) throw new Error('useEntries must be used within an EntriesProvider');
  return ctx;
}
