// Client helper for AI-generated symptom self-care tips. Cached per
// day+phase+symptoms so it's fresh each day (not repetitive) but stable within
// a day, and doesn't re-hit the API on every visit. Falls back to null (the UI
// then uses the built-in SYMPTOM_CARE map) when offline or on error.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

export interface SymptomTip {
  soothe: string;
  foods: string;
}

export interface TipsInput {
  symptoms: string[];
  phase?: string;
  day?: number;
  dayKey: string;
}

function signature(input: TipsInput): string {
  return `${input.dayKey}|${input.phase ?? ''}|${[...input.symptoms].sort().join(',')}`;
}

/** AI tips keyed by lowercased symptom name, or null if unavailable. */
export async function getSymptomTips(input: TipsInput): Promise<Record<string, SymptomTip> | null> {
  if (!input.symptoms.length) return null;
  const cacheKey = 'hers.tips.' + signature(input);

  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as Record<string, SymptomTip>;
  } catch {
    // ignore cache read errors
  }

  const { data, error } = await supabase.functions.invoke('tips', {
    body: { symptoms: input.symptoms, phase: input.phase, day: input.day },
  });
  if (error) return null;

  const tips = (data as { tips?: { symptom?: string; soothe?: string; foods?: string }[] } | null)?.tips;
  if (!Array.isArray(tips) || !tips.length) return null;

  const map: Record<string, SymptomTip> = {};
  for (const t of tips) {
    if (t?.symptom && t.soothe && t.foods) {
      map[t.symptom.trim().toLowerCase()] = { soothe: t.soothe.trim(), foods: t.foods.trim() };
    }
  }
  if (!Object.keys(map).length) return null;

  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(map));
  } catch {
    // ignore cache write errors
  }
  return map;
}
