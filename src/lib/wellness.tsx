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

const keyFor = (userKey: string) => `hers.wellness.v1::${userKey}`;

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

interface WellnessContextValue {
  logs: Record<string, DailyLog>;
  ready: boolean;
  saveDay: (dateKey: string, data: { mood?: MoodKey | null; symptoms?: string[] }) => void;
}

const WellnessContext = createContext<WellnessContextValue | null>(null);

export function WellnessProvider({ userKey, children }: { userKey: string; children: ReactNode }) {
  const [logs, setLogs] = useState<Record<string, DailyLog>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(keyFor(userKey))
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const parsed = JSON.parse(raw) as Record<string, DailyLog>;
          if (parsed && typeof parsed === 'object') setLogs(parsed);
        } catch {
          // ignore corrupt store
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [userKey]);

  const saveDay = useCallback<WellnessContextValue['saveDay']>(
    (dateKey, data) => {
      setLogs((prev) => {
        const current = prev[dateKey] ?? EMPTY_DAY;
        const merged: DailyLog = {
          mood: data.mood !== undefined ? data.mood : current.mood,
          symptoms: data.symptoms !== undefined ? data.symptoms : current.symptoms,
        };
        const next = { ...prev, [dateKey]: merged };
        AsyncStorage.setItem(keyFor(userKey), JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [userKey],
  );

  const value = useMemo(() => ({ logs, ready, saveDay }), [logs, ready, saveDay]);
  return <WellnessContext.Provider value={value}>{children}</WellnessContext.Provider>;
}

export function useWellness(): WellnessContextValue {
  const ctx = useContext(WellnessContext);
  if (!ctx) throw new Error('useWellness must be used within a WellnessProvider');
  return ctx;
}
