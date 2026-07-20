import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { appKeyToDbDate, dbDateToAppKey } from './format';
import { supabase } from './supabase';
import type { MoodKey } from './theme';

export const SYMPTOMS = [
  'Cramps',
  'Headache',
  'Bloating',
  'Fatigue',
  'Tender breasts',
  'Acne',
  'Backache',
  'Nausea',
  'Cravings',
  'Mood swings',
  'Insomnia',
  'Low energy',
];

export interface DailyLog {
  mood: MoodKey | null;
  symptoms: string[];
}

const EMPTY_DAY: DailyLog = { mood: null, symptoms: [] };

interface WellnessRow {
  date: string;
  mood: string | null;
  symptoms: string[] | null;
}

interface WellnessContextValue {
  logs: Record<string, DailyLog>;
  ready: boolean;
  saveDay: (dateKey: string, data: { mood?: MoodKey | null; symptoms?: string[] }) => void;
}

const WellnessContext = createContext<WellnessContextValue | null>(null);

export function WellnessProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from('wellness_logs')
      .select('date,mood,symptoms')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          const map: Record<string, DailyLog> = {};
          for (const r of data as WellnessRow[]) {
            map[dbDateToAppKey(r.date)] = {
              mood: (r.mood as MoodKey | null) ?? null,
              symptoms: r.symptoms ?? [],
            };
          }
          setLogs(map);
        }
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const saveDay = useCallback<WellnessContextValue['saveDay']>(
    (dateKey, data) => {
      setLogs((prev) => {
        const current = prev[dateKey] ?? EMPTY_DAY;
        const merged: DailyLog = {
          mood: data.mood !== undefined ? data.mood : current.mood,
          symptoms: data.symptoms !== undefined ? data.symptoms : current.symptoms,
        };
        supabase
          .from('wellness_logs')
          .upsert({
            user_id: userId,
            date: appKeyToDbDate(dateKey),
            mood: merged.mood,
            symptoms: merged.symptoms,
          })
          .then(() => {});
        return { ...prev, [dateKey]: merged };
      });
    },
    [userId],
  );

  const value = useMemo(() => ({ logs, ready, saveDay }), [logs, ready, saveDay]);
  return <WellnessContext.Provider value={value}>{children}</WellnessContext.Provider>;
}

export function useWellness(): WellnessContextValue {
  const ctx = useContext(WellnessContext);
  if (!ctx) throw new Error('useWellness must be used within a WellnessProvider');
  return ctx;
}
