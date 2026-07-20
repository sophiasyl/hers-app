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

// Common presets shown as quick-tap chips. Anything else can be typed in.
export const MEDICATIONS = [
  'Birth control',
  'Emergency contraception',
  'Pain relief',
  'Iron',
  'Vitamins',
  'Antidepressant',
  'Antibiotic',
  'Antihistamine',
  'Thyroid',
];

interface MedicationRow {
  date: string;
  meds: string[] | null;
}

interface MedicationContextValue {
  logs: Record<string, string[]>;
  ready: boolean;
  saveDay: (dateKey: string, meds: string[]) => void;
}

const MedicationContext = createContext<MedicationContextValue | null>(null);

export function MedicationProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from('medication_logs')
      .select('date,meds')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          const map: Record<string, string[]> = {};
          for (const r of data as MedicationRow[]) map[dbDateToAppKey(r.date)] = r.meds ?? [];
          setLogs(map);
        }
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const saveDay = useCallback<MedicationContextValue['saveDay']>(
    (dateKey, meds) => {
      setLogs((prev) => ({ ...prev, [dateKey]: meds }));
      supabase
        .from('medication_logs')
        .upsert({ user_id: userId, date: appKeyToDbDate(dateKey), meds })
        .then(() => {});
    },
    [userId],
  );

  const value = useMemo(() => ({ logs, ready, saveDay }), [logs, ready, saveDay]);
  return <MedicationContext.Provider value={value}>{children}</MedicationContext.Provider>;
}

export function useMedication(): MedicationContextValue {
  const ctx = useContext(MedicationContext);
  if (!ctx) throw new Error('useMedication must be used within a MedicationProvider');
  return ctx;
}
