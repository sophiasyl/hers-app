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

// Gentle self-care guidance per symptom — what tends to soothe it, and foods
// that can help. Suggestions only, not medical advice.
export interface SymptomCare {
  soothe: string;
  foods: string;
}

export const SYMPTOM_CARE: Record<string, SymptomCare> = {
  Cramps: {
    soothe: 'A hot water bottle, gentle stretching, and slow deep breaths',
    foods: 'Ginger or chamomile tea, dark chocolate, magnesium-rich greens',
  },
  Headache: {
    soothe: 'Hydrate, rest in a dim quiet room, try a cool compress',
    foods: 'Water, nuts and seeds (magnesium), a little caffeine if it usually helps you',
  },
  Bloating: {
    soothe: 'A short walk, ease off salt, sip peppermint tea',
    foods: 'Water, banana and other potassium foods, ginger',
  },
  Fatigue: {
    soothe: 'A short rest or nap, some morning daylight, a gentle walk',
    foods: 'Iron-rich greens, protein, slow-release carbs like oats',
  },
  'Tender breasts': {
    soothe: 'A supportive bra, a warm compress, less caffeine',
    foods: 'Less salt, omega-3s (oily fish, walnuts, flax)',
  },
  Acne: {
    soothe: 'Gentle cleansing, hands off your face, stay hydrated',
    foods: 'Water, more veg, go easy on sugar and dairy',
  },
  Backache: {
    soothe: 'Heat, gentle stretching, and minding your posture',
    foods: 'Anti-inflammatory ginger and turmeric, magnesium foods',
  },
  Nausea: {
    soothe: 'Ginger, small frequent snacks, fresh air',
    foods: 'Ginger tea, plain crackers, peppermint',
  },
  Cravings: {
    soothe: 'Eat regular balanced meals and stay hydrated',
    foods: 'Complex carbs, protein with a healthy fat, a little dark chocolate',
  },
  'Mood swings': {
    soothe: 'Slow deep breathing, a walk outside, a quick journal',
    foods: 'Omega-3s, complex carbs, magnesium-rich greens',
  },
  Insomnia: {
    soothe: 'A cool dark room, no screens after 9pm, an earlier wind-down',
    foods: 'Chamomile or tart-cherry tea, magnesium foods',
  },
  'Low energy': {
    soothe: 'Morning light, a short walk, steady hydration',
    foods: 'Iron, protein, whole grains',
  },
};

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
