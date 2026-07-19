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

import {
  deriveCycle,
  phaseForDate,
  startOfDay,
  type CycleConfig,
  type CycleStatus,
  type FlowLevel,
  type Phase,
} from './cycleMath';

export type { Phase, FlowLevel, CycleConfig } from './cycleMath';

const DAY_MS = 86400000;
const keyFor = (userKey: string) => `hers.cycle.v1::${userKey}`;

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

export interface Today extends CycleStatus {
  content: PhaseContent;
  progress: number; // 0..1 for the ring
}

function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function defaultConfig(now: number): CycleConfig {
  return { lastPeriodStart: startOfDay(now), cycleLength: 28, periodLength: 5 };
}

interface CycleContextValue {
  config: CycleConfig;
  flowLogs: Record<string, FlowLevel>;
  today: Today;
  ready: boolean;
  logFlow: (level: FlowLevel) => void;
  startPeriodToday: () => void;
  setup: (cfg: CycleConfig) => void;
  phaseFor: (dateMs: number) => Phase;
}

const CycleContext = createContext<CycleContextValue | null>(null);

export function CycleProvider({ userKey, children }: { userKey: string; children: ReactNode }) {
  const [config, setConfig] = useState<CycleConfig>(() => defaultConfig(Date.now()));
  const [flowLogs, setFlowLogs] = useState<Record<string, FlowLevel>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(keyFor(userKey))
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const parsed = JSON.parse(raw) as {
            config?: CycleConfig;
            flowLogs?: Record<string, FlowLevel>;
          };
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
  }, [userKey]);

  const persist = useCallback(
    (nextConfig: CycleConfig, nextFlow: Record<string, FlowLevel>) => {
      AsyncStorage.setItem(
        keyFor(userKey),
        JSON.stringify({ config: nextConfig, flowLogs: nextFlow }),
      ).catch(() => {});
    },
    [userKey],
  );

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

  const startPeriodToday = useCallback(() => logFlow('medium'), [logFlow]);

  const setup = useCallback(
    (cfg: CycleConfig) => {
      // Seed the onboarding period into the flow log (up to today) so predictions
      // and history work from day one.
      const startSod = startOfDay(cfg.lastPeriodStart);
      const todaySod = startOfDay(Date.now());
      const seeded: Record<string, FlowLevel> = {};
      for (let i = 0; i < cfg.periodLength; i++) {
        const d = startSod + i * DAY_MS;
        if (d > todaySod) break;
        seeded[dayKey(d)] = 'medium';
      }
      setConfig(cfg);
      setFlowLogs(seeded);
      persist(cfg, seeded);
    },
    [persist],
  );

  const today = useMemo<Today>(() => {
    const status = deriveCycle(flowLogs, config, Date.now());
    return {
      ...status,
      content: PHASE_CONTENT[status.phase],
      progress: Math.min(1, Math.max(0, status.day / status.cycleLength)),
    };
  }, [flowLogs, config]);

  const phaseFor = useCallback(
    (dateMs: number) =>
      phaseForDate(dateMs, today.lastPeriodStart, today.cycleLength, today.periodLength),
    [today.lastPeriodStart, today.cycleLength, today.periodLength],
  );

  const value = useMemo(
    () => ({ config, flowLogs, today, ready, logFlow, startPeriodToday, setup, phaseFor }),
    [config, flowLogs, today, ready, logFlow, startPeriodToday, setup, phaseFor],
  );

  return <CycleContext.Provider value={value}>{children}</CycleContext.Provider>;
}

export function useCycle(): CycleContextValue {
  const ctx = useContext(CycleContext);
  if (!ctx) throw new Error('useCycle must be used within a CycleProvider');
  return ctx;
}
