import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import type { MoodKey } from './theme';

const keyFor = (userKey: string) => `hers.entries.v1::${userKey}`;

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

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export interface NewEntry {
  body: string;
  mood?: MoodKey | null;
  source?: EntrySource;
  title?: string;
  tags?: string[];
}

interface EntriesContextValue {
  entries: Entry[];
  ready: boolean;
  addEntry: (input: NewEntry) => void;
  deleteEntry: (id: string) => void;
}

const EntriesContext = createContext<EntriesContextValue | null>(null);

export function EntriesProvider({ userKey, children }: { userKey: string; children: ReactNode }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(keyFor(userKey))
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const parsed = JSON.parse(raw) as Entry[];
          if (Array.isArray(parsed)) setEntries(parsed);
        } catch {
          // corrupt store — start fresh rather than crash
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [userKey]);

  const addEntry = useCallback<EntriesContextValue['addEntry']>(
    ({ body, mood = null, source = 'manual', title, tags }) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const entry: Entry = {
        id: makeId(),
        body: trimmed,
        mood,
        tags: tags ?? extractTags(trimmed),
        createdAt: Date.now(),
        source,
        title,
      };
      setEntries((prev) => {
        const next = [entry, ...prev];
        AsyncStorage.setItem(keyFor(userKey), JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [userKey],
  );

  const deleteEntry = useCallback(
    (id: string) => {
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        AsyncStorage.setItem(keyFor(userKey), JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [userKey],
  );

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
