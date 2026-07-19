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

import { dayKey } from './format';

const STORAGE_KEY = 'hers.cycle.v1';
const DAY_MS = 86400000;

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy';

export interface Hormone {
  name: string;
  state: string;
  trend: '↑' | '↓' | '—';
}

export interface PersonalInsight {
  icon: string;
  title: string;
  body: string;
}

export interface PhaseContent {
  label: string;
  color: string;
  hormones: Hormone[];
  bodyLogic: string;
  personalInsights: PersonalInsight[];
}

export const PHASE_CONTENT: Record<Phase, PhaseContent> = {
  menstrual: {
    label: 'MENSTRUAL',
    color: '#C2545A',
    hormones: [
      { name: 'Estrogen', state: 'Low', trend: '↓' },
      { name: 'Energy', state: 'Resting', trend: '—' },
    ],
    bodyLogic:
      'Hormones are at their lowest, so rest is genuinely productive right now. Be gentle with yourself — warmth and lighter movement help most today.',
    personalInsights: [
      {
        icon: 'bed-outline',
        title: 'Rest is not lazy',
        body: 'With estrogen and progesterone low, your body is doing real recovery work. Honour the slower pace.',
      },
      {
        icon: 'restaurant-outline',
        title: 'Replenish your iron',
        body: 'You lose iron during your period. Leafy greens and legumes help steady your energy this week.',
      },
      {
        icon: 'water-outline',
        title: 'Warmth eases cramping',
        body: 'A hot drink and a warm compress measurably reduce period discomfort. Lean into comfort.',
      },
    ],
  },
  follicular: {
    label: 'FOLLICULAR',
    color: '#33502F',
    hormones: [
      { name: 'Estrogen', state: 'High', trend: '↑' },
      { name: 'Serotonin', state: 'Stable', trend: '—' },
    ],
    bodyLogic:
      "Your estrogen is climbing, which typically boosts verbal memory and social confidence. It's a great day for that presentation or a first date.",
    personalInsights: [
      {
        icon: 'chatbubbles-outline',
        title: "Why you're more social today",
        body: "On Day {day}, rising Estrogen increases verbal memory. You're literally wired to communicate better right now.",
      },
      {
        icon: 'sparkles-outline',
        title: 'The "Glow" is biological',
        body: 'Estrogen helps your skin retain moisture and produce collagen. Your skin is at its most resilient state this week.',
      },
      {
        icon: 'flash-outline',
        title: 'Metabolism check',
        body: "Your body is more efficient at using stored carbs for fuel today. It's the perfect time for a high-intensity workout.",
      },
    ],
  },
  ovulatory: {
    label: 'OVULATORY',
    color: '#A99A6B',
    hormones: [
      { name: 'Estrogen', state: 'Peak', trend: '↑' },
      { name: 'Testosterone', state: 'Rising', trend: '↑' },
    ],
    bodyLogic:
      'You are at your hormonal peak — energy, confidence and libido are highest. A great window for bold conversations and real connection.',
    personalInsights: [
      {
        icon: 'people-outline',
        title: 'Peak charisma',
        body: 'Estrogen and testosterone peak together now. You communicate and connect at your best — use it.',
      },
      {
        icon: 'barbell-outline',
        title: 'Strength window',
        body: 'Your muscles respond especially well to training this week. Lean into strength work while it lasts.',
      },
      {
        icon: 'heart-outline',
        title: 'Libido & connection',
        body: 'A natural high point for desire and closeness. Biology, not coincidence.',
      },
    ],
  },
  luteal: {
    label: 'LUTEAL',
    color: '#7C6F8F',
    hormones: [
      { name: 'Progesterone', state: 'High', trend: '↑' },
      { name: 'Estrogen', state: 'Falling', trend: '↓' },
    ],
    bodyLogic:
      'Progesterone is calming but can bring lower energy and more sensitivity. Steady routines, slower workouts and earlier nights serve you now.',
    personalInsights: [
      {
        icon: 'cafe-outline',
        title: 'Consider cutting caffeine',
        body: 'Progesterone heightens anxiety sensitivity late-cycle. Switching to decaf often smooths the jitters.',
      },
      {
        icon: 'moon-outline',
        title: 'Protect your sleep',
        body: 'Sleep can fragment in the luteal phase. A cool, dark room and magnesium help you rest deeper.',
      },
      {
        icon: 'leaf-outline',
        title: 'Slow is strong',
        body: 'Swap HIIT for walks or yoga. Your body wants steadiness, not intensity, this week.',
      },
    ],
  },
};

export const FLOW_LEVELS: { key: FlowLevel; label: string; color: string }[] = [
  { key: 'spotting', label: 'Spotting', color: '#E0A8AC' },
  { key: 'light', label: 'Light', color: '#D17A82' },
  { key: 'medium', label: 'Medium', color: '#C2545A' },
  { key: 'heavy', label: 'Heavy', color: '#9B3B43' },
];

export interface CycleConfig {
  lastPeriodStart: number;
  cycleLength: number;
  periodLength: number;
}

export interface TodayCycle {
  day: number;
  phase: Phase;
  content: PhaseContent;
  progress: number;
  cycleLength: number;
  daysUntilNextPeriod: number;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function phaseForDay(day: number, cycleLength: number, periodLength: number): Phase {
  const ovulation = cycleLength - 14;
  if (day <= periodLength) return 'menstrual';
  if (day >= ovulation - 1 && day <= ovulation + 1) return 'ovulatory';
  if (day < ovulation - 1) return 'follicular';
  return 'luteal';
}

export function computeCycle(config: CycleConfig, now: number): TodayCycle {
  const elapsed = Math.floor((startOfDay(now) - startOfDay(config.lastPeriodStart)) / DAY_MS);
  const mod = ((elapsed % config.cycleLength) + config.cycleLength) % config.cycleLength;
  const day = mod + 1;
  const phase = phaseForDay(day, config.cycleLength, config.periodLength);
  return {
    day,
    phase,
    content: PHASE_CONTENT[phase],
    progress: day / config.cycleLength,
    cycleLength: config.cycleLength,
    daysUntilNextPeriod: config.cycleLength - day + 1,
  };
}

function defaultConfig(now: number): CycleConfig {
  // Seed so a fresh install opens on Day 12 (follicular), matching the design.
  return {
    lastPeriodStart: startOfDay(now) - 11 * DAY_MS,
    cycleLength: 28,
    periodLength: 5,
  };
}

interface CycleContextValue {
  config: CycleConfig;
  flowLogs: Record<string, FlowLevel>;
  today: TodayCycle;
  ready: boolean;
  logFlow: (level: FlowLevel) => void;
  startPeriodToday: () => void;
  setCycleLength: (n: number) => void;
  setup: (cfg: CycleConfig) => void;
}

const CycleContext = createContext<CycleContextValue | null>(null);

export function CycleProvider({ children }: { children: ReactNode }) {
  const now = Date.now();
  const [config, setConfig] = useState<CycleConfig>(() => defaultConfig(now));
  const [flowLogs, setFlowLogs] = useState<Record<string, FlowLevel>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const parsed = JSON.parse(raw) as { config?: CycleConfig; flowLogs?: Record<string, FlowLevel> };
          if (parsed.config) setConfig(parsed.config);
          if (parsed.flowLogs) setFlowLogs(parsed.flowLogs);
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
  }, []);

  const persist = useCallback((nextConfig: CycleConfig, nextFlow: Record<string, FlowLevel>) => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ config: nextConfig, flowLogs: nextFlow }),
    ).catch(() => {});
  }, []);

  const logFlow = useCallback(
    (level: FlowLevel) => {
      setFlowLogs((prev) => {
        const next = { ...prev, [dayKey(Date.now())]: level };
        persist(config, next);
        return next;
      });
    },
    [config, persist],
  );

  const startPeriodToday = useCallback(() => {
    const nextConfig: CycleConfig = { ...config, lastPeriodStart: startOfDay(Date.now()) };
    setConfig(nextConfig);
    setFlowLogs((prev) => {
      const next = { ...prev, [dayKey(Date.now())]: 'medium' as FlowLevel };
      persist(nextConfig, next);
      return next;
    });
  }, [config, persist]);

  const setCycleLength = useCallback(
    (n: number) => {
      const nextConfig = { ...config, cycleLength: n };
      setConfig(nextConfig);
      persist(nextConfig, flowLogs);
    },
    [config, flowLogs, persist],
  );

  const setup = useCallback(
    (cfg: CycleConfig) => {
      setConfig(cfg);
      persist(cfg, flowLogs);
    },
    [flowLogs, persist],
  );

  const today = useMemo(() => computeCycle(config, Date.now()), [config]);

  const value = useMemo(
    () => ({ config, flowLogs, today, ready, logFlow, startPeriodToday, setCycleLength, setup }),
    [config, flowLogs, today, ready, logFlow, startPeriodToday, setCycleLength, setup],
  );

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>;
}

export function useCycle(): CycleContextValue {
  const ctx = useContext(CycleContext);
  if (!ctx) throw new Error('useCycle must be used within a CycleProvider');
  return ctx;
}
