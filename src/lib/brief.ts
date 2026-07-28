// Client helper for the AI "today, by your cycle" brief. Cached per day so it
// generates once a day; falls back to a per-phase static brief while loading
// or offline.
import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from './supabase';

export interface DailyBrief {
  summary: string;
  energy: string;
  movement: string;
  nourish: string;
  mind: string;
}

export interface BriefInput {
  phase: string; // display label, e.g. "FOLLICULAR"
  phaseKey: string; // lowercase key
  day: number;
  daysUntilNextPeriod: number;
  recentLogs?: string;
  dayKey: string;
}

export const STATIC_BRIEF: Record<string, DailyBrief> = {
  menstrual: {
    summary: 'Hormones are at their lowest — a day to be gentle and let your body recover.',
    energy: 'Expect lower energy; rest is genuinely productive right now.',
    movement: 'Keep it soft — a short walk, stretching, or restorative yoga.',
    nourish: 'Warm, iron-rich foods like leafy greens and lentils, plus plenty of water.',
    mind: 'Give yourself permission to slow down and say no to extra plans.',
  },
  follicular: {
    summary: 'Estrogen is climbing — focus, confidence, and energy are on the rise.',
    energy: 'A naturally upbeat, motivated day — ride the momentum.',
    movement: 'Great for higher-intensity workouts or trying something new.',
    nourish: 'Fresh, lighter foods and lean protein to fuel the climb.',
    mind: 'A strong day for big conversations, plans, or starting projects.',
  },
  ovulatory: {
    summary: 'You’re at your hormonal peak — energy, confidence, and connection are highest.',
    energy: 'Peak energy — a great day to put yourself out there.',
    movement: 'Your body responds well to strength and high-intensity training now.',
    nourish: 'Antioxidant-rich veg and fibre help you feel your best.',
    mind: 'Charisma is high — lean into social plans and bold conversations.',
  },
  luteal: {
    summary: 'Progesterone is rising — a slower, more inward phase where steadiness serves you.',
    energy: 'Energy tapers — pace yourself and protect your evenings.',
    movement: 'Swap intensity for walks, pilates, or gentle strength.',
    nourish: 'Complex carbs and magnesium help steady mood and cravings.',
    mind: 'Be extra kind to yourself; wind down early and go easy on caffeine.',
  },
};

function signature(input: BriefInput): string {
  return `${input.dayKey}|${input.phaseKey}|${input.day}`;
}

export async function getDailyBrief(input: BriefInput): Promise<DailyBrief | null> {
  const cacheKey = 'hers.brief.' + signature(input);
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return JSON.parse(cached) as DailyBrief;
  } catch {
    // ignore
  }
  const { data, error } = await supabase.functions.invoke('brief', {
    body: {
      phase: input.phase,
      day: input.day,
      daysUntilNextPeriod: input.daysUntilNextPeriod,
      recentLogs: input.recentLogs,
    },
  });
  if (error) return null;
  const brief = (data as { brief?: DailyBrief } | null)?.brief;
  if (!brief?.summary) return null;
  try {
    await AsyncStorage.setItem(cacheKey, JSON.stringify(brief));
  } catch {
    // ignore
  }
  return brief;
}
