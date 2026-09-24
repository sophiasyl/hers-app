// The companion (cat) as a living pet: an energy economy + care/growth loop.
//
//  • You EARN energy ⚡ by logging (cycle, mood, symptoms, meds, diary) — once
//    per thing per day, tracked in an `awarded` ledger so it can't be farmed.
//  • You SPEND energy in a little shop on food.
//  • You CARE for the cat — feed (uses food), pet, play — which raises its
//    happiness and XP. Happiness gently fades between visits, so checking in
//    matters. XP levels the cat up and unlocks accessories.
//
// State lives in the `pet_state` table (one RLS-locked row per user).
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useCycle } from './cycle';
import { useEntries } from './entries';
import { dayKey } from './format';
import { useMedication } from './medication';
import { supabase } from './supabase';
import { useWellness } from './wellness';

// ---- Tunable game design ---------------------------------------------------

// Energy earned the first time each thing is logged on a given day.
export const EARN: Record<string, number> = {
  flow: 12, // logged your cycle / period
  mood: 8, // logged how you feel
  symptoms: 6, // logged symptoms
  meds: 5, // logged medication
  diary: 12, // wrote a diary entry
};

export const EARN_LABEL: Record<string, string> = {
  flow: 'logging your cycle',
  mood: 'checking in on your mood',
  symptoms: 'noting your symptoms',
  meds: 'logging medication',
  diary: 'writing in your diary',
};

export interface Food {
  key: string;
  label: string;
  emoji: string;
  cost: number;
  happiness: number;
  xp: number;
}

export const FOODS: Food[] = [
  { key: 'kibble', label: 'Kibble', emoji: '🥣', cost: 15, happiness: 8, xp: 12 },
  { key: 'can', label: 'Wet food', emoji: '🥫', cost: 30, happiness: 16, xp: 24 },
  { key: 'treat', label: 'Fish treat', emoji: '🐟', cost: 55, happiness: 28, xp: 42 },
];

export const foodByKey = (k: string) => FOODS.find((f) => f.key === k);

export interface Accessory {
  key: string;
  label: string;
  emoji: string;
  level: number;
}

export const ACCESSORIES: Accessory[] = [
  { key: 'bow', label: 'Bow', emoji: '🎀', level: 2 },
  { key: 'yarn', label: 'Yarn ball', emoji: '🧶', level: 3 },
  { key: 'cap', label: 'Cap', emoji: '🧢', level: 4 },
  { key: 'shades', label: 'Shades', emoji: '🕶️', level: 5 },
  { key: 'crown', label: 'Crown', emoji: '👑', level: 6 },
  { key: 'star', label: 'Gold star', emoji: '⭐', level: 7 },
];

// Free daily care allowances.
const PET_MAX = 5;
const PLAY_MAX = 3;
const PET_GAIN = { happiness: 3, xp: 2 };
const PLAY_GAIN = { happiness: 6, xp: 7 };

const HAPPINESS_DECAY_PER_DAY = 6; // fades between visits
const MAX_HAPPINESS = 100;

// XP needed to REACH each level (index 0 = level 1).
const LEVEL_XP = [0, 120, 300, 540, 840, 1200, 1650, 2200, 2900, 3700];

export function levelForXp(xp: number): number {
  let lvl = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) lvl = i + 1;
  return lvl;
}

/** Progress within the current level → { level, pct 0..1, toNext }. */
export function levelProgress(xp: number): { level: number; pct: number; toNext: number; max: boolean } {
  const level = levelForXp(xp);
  const floor = LEVEL_XP[level - 1] ?? 0;
  const ceil = LEVEL_XP[level];
  if (ceil == null) return { level, pct: 1, toNext: 0, max: true };
  return { level, pct: Math.max(0, Math.min(1, (xp - floor) / (ceil - floor))), toNext: ceil - xp, max: false };
}

// ---- State -----------------------------------------------------------------

interface CareToday {
  date: string;
  pets: number;
  plays: number;
}

interface PetState {
  energy: number;
  happiness: number;
  xp: number;
  inventory: Record<string, number>;
  unlocked: string[];
  awarded: Record<string, string[]>;
  careToday: CareToday;
  lastCareAt: string | null;
}

const DEFAULT_STATE: PetState = {
  energy: 0,
  happiness: 60,
  xp: 0,
  inventory: {},
  unlocked: [],
  awarded: {},
  careToday: { date: '', pets: 0, plays: 0 },
  lastCareAt: null,
};

export interface PetMood {
  label: string;
  message: string;
}

interface PetContextValue {
  ready: boolean;
  energy: number;
  /** Happiness after gentle decay since last care (what the UI shows). */
  happiness: number;
  xp: number;
  level: number;
  levelPct: number;
  toNext: number;
  maxLevel: boolean;
  inventory: Record<string, number>;
  unlocked: string[];
  petsLeft: number;
  playsLeft: number;
  mood: PetMood;
  /** Transient message for a small toast (earnings / reactions). Auto-clears. */
  flash: string | null;
  buyFood: (key: string) => boolean;
  feed: (key: string) => void;
  pet: () => void;
  play: () => void;
  collectTreat: (amount: number) => void;
  clearFlash: () => void;
}

const PetContext = createContext<PetContextValue | null>(null);

function daysBetween(fromISO: string | null, now: number): number {
  if (!fromISO) return 0;
  const then = new Date(fromISO).getTime();
  if (Number.isNaN(then)) return 0;
  return Math.max(0, Math.floor((now - then) / 86_400_000));
}

function decayedHappiness(s: PetState, now: number): number {
  const d = daysBetween(s.lastCareAt, now);
  return Math.max(0, Math.min(MAX_HAPPINESS, Math.round(s.happiness - HAPPINESS_DECAY_PER_DAY * d)));
}

function moodFor(happiness: number, petName: string): PetMood {
  if (happiness >= 80)
    return { label: 'Thriving', message: `${petName} is thriving — you've been so good to both of you 💚` };
  if (happiness >= 55)
    return { label: 'Content', message: `${petName} is content and purring beside you.` };
  if (happiness >= 30)
    return { label: 'Settling in', message: `${petName} perked up — a little more care would help.` };
  return { label: 'Sleepy', message: `${petName} is dozing — feed or pet them to perk them right up.` };
}

// Keep the awarded ledger from growing forever.
function pruneAwarded(awarded: Record<string, string[]>): Record<string, string[]> {
  const keys = Object.keys(awarded).sort();
  if (keys.length <= 4) return awarded;
  const keep = keys.slice(-4);
  const out: Record<string, string[]> = {};
  for (const k of keep) out[k] = awarded[k];
  return out;
}

export function PetProvider({
  userId,
  petName,
  children,
}: {
  userId: string;
  petName: string;
  children: ReactNode;
}) {
  const { flowLogs } = useCycle();
  const { logs: wellnessLogs } = useWellness();
  const { logs: medLogs } = useMedication();
  const { entries } = useEntries();

  const [state, setState] = useState<PetState>(DEFAULT_STATE);
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFlash = useCallback((msg: string) => {
    setFlash(msg);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(null), 3200);
  }, []);

  const persist = useCallback(
    (next: PetState) => {
      supabase
        .from('pet_state')
        .upsert({
          user_id: userId,
          energy: next.energy,
          happiness: next.happiness,
          xp: next.xp,
          inventory: next.inventory,
          unlocked: next.unlocked,
          awarded: next.awarded,
          care_today: next.careToday,
          last_care_at: next.lastCareAt,
          updated_at: new Date().toISOString(),
        })
        .then(() => {});
    },
    [userId],
  );

  // Load (or create) this user's pet row.
  useEffect(() => {
    let active = true;
    setReady(false);
    supabase
      .from('pet_state')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data) {
          const loaded: PetState = {
            energy: data.energy ?? 0,
            happiness: data.happiness ?? 60,
            xp: data.xp ?? 0,
            inventory: (data.inventory as Record<string, number>) ?? {},
            unlocked: (data.unlocked as string[]) ?? [],
            awarded: (data.awarded as Record<string, string[]>) ?? {},
            careToday: (data.care_today as CareToday) ?? { date: '', pets: 0, plays: 0 },
            lastCareAt: data.last_care_at ?? null,
          };
          setState(loaded);
        } else {
          setState(DEFAULT_STATE);
          persist(DEFAULT_STATE);
        }
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [userId, persist]);

  // Reconcile daily earnings: grant energy for anything logged today that hasn't
  // been rewarded yet. Reads the freshest state via a ref to avoid a loop.
  useEffect(() => {
    if (!ready) return;
    const s = stateRef.current;
    const today = dayKey(Date.now());
    const got = new Set(s.awarded[today] ?? []);
    const newlyGot: string[] = [];
    let add = 0;
    const check = (type: string, cond: boolean) => {
      if (cond && !got.has(type)) {
        add += EARN[type] ?? 0;
        newlyGot.push(type);
      }
    };
    const w = wellnessLogs[today];
    check('flow', !!flowLogs[today]);
    check('mood', !!w?.mood);
    check('symptoms', !!(w?.symptoms && w.symptoms.length));
    check('meds', !!(medLogs[today] && medLogs[today].length));
    check('diary', entries.some((e) => dayKey(e.createdAt) === today));

    if (add > 0) {
      const awarded = pruneAwarded({ ...s.awarded, [today]: [...got, ...newlyGot] });
      const next = { ...s, energy: s.energy + add, awarded };
      setState(next);
      persist(next);
      const first = newlyGot[0];
      showFlash(`+${add} ⚡ for ${EARN_LABEL[first] ?? 'checking in'}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, flowLogs, wellnessLogs, medLogs, entries]);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  // Reset the free daily allowances if the day rolled over.
  const careToday = useMemo<CareToday>(() => {
    const td = dayKey(Date.now());
    return state.careToday.date === td ? state.careToday : { date: td, pets: 0, plays: 0 };
  }, [state.careToday]);

  const now = Date.now();
  const happiness = decayedHappiness(state, now);
  const { level, pct, toNext, max } = levelProgress(state.xp);
  const mood = useMemo(() => moodFor(happiness, petName || 'Your cat'), [happiness, petName]);

  const applyCare = useCallback(
    (deltaHappiness: number, deltaXp: number, patch: Partial<PetState>, message: string) => {
      const s = stateRef.current;
      const cur = decayedHappiness(s, Date.now());
      const nextXp = s.xp + deltaXp;
      const nextLevel = levelForXp(nextXp);
      const unlocked = [...s.unlocked];
      for (const a of ACCESSORIES) if (a.level <= nextLevel && !unlocked.includes(a.key)) unlocked.push(a.key);
      const leveledUp = nextLevel > levelForXp(s.xp);
      const next: PetState = {
        ...s,
        ...patch,
        happiness: Math.max(0, Math.min(MAX_HAPPINESS, cur + deltaHappiness)),
        xp: nextXp,
        unlocked,
        lastCareAt: new Date().toISOString(),
      };
      setState(next);
      persist(next);
      if (leveledUp) {
        const acc = ACCESSORIES.find((a) => a.level === nextLevel);
        showFlash(acc ? `Level ${nextLevel}! Unlocked ${acc.emoji} ${acc.label}` : `Level ${nextLevel}! 🎉`);
      } else {
        showFlash(message);
      }
    },
    [persist, showFlash],
  );

  const buyFood = useCallback(
    (key: string): boolean => {
      const s = stateRef.current;
      const food = foodByKey(key);
      if (!food || s.energy < food.cost) {
        showFlash('Not enough energy yet — log something to earn more ⚡');
        return false;
      }
      const inventory = { ...s.inventory, [key]: (s.inventory[key] ?? 0) + 1 };
      const next = { ...s, energy: s.energy - food.cost, inventory };
      setState(next);
      persist(next);
      showFlash(`Bought ${food.emoji} ${food.label}`);
      return true;
    },
    [persist, showFlash],
  );

  const feed = useCallback(
    (key: string) => {
      const s = stateRef.current;
      const food = foodByKey(key);
      if (!food || (s.inventory[key] ?? 0) <= 0) {
        showFlash(`No ${food?.label ?? 'food'} left — buy some in the shop`);
        return;
      }
      const inventory = { ...s.inventory, [key]: s.inventory[key] - 1 };
      applyCare(food.happiness, food.xp, { inventory }, `${food.emoji} Yum! ${food.label} — happiness up`);
    },
    [applyCare, showFlash],
  );

  const pet = useCallback(() => {
    const td = dayKey(Date.now());
    const ct = stateRef.current.careToday.date === td ? stateRef.current.careToday : { date: td, pets: 0, plays: 0 };
    if (ct.pets >= PET_MAX) {
      showFlash("You've given plenty of pets today — try feeding or come back tomorrow 🐾");
      return;
    }
    applyCare(PET_GAIN.happiness, PET_GAIN.xp, { careToday: { ...ct, pets: ct.pets + 1 } }, 'Purr… 🐾');
  }, [applyCare, showFlash]);

  const play = useCallback(() => {
    const td = dayKey(Date.now());
    const ct = stateRef.current.careToday.date === td ? stateRef.current.careToday : { date: td, pets: 0, plays: 0 };
    if (ct.plays >= PLAY_MAX) {
      showFlash("They're tuckered out from playing — come back tomorrow 🧶");
      return;
    }
    applyCare(PLAY_GAIN.happiness, PLAY_GAIN.xp, { careToday: { ...ct, plays: ct.plays + 1 } }, 'So much fun! 🧶');
  }, [applyCare, showFlash]);

  const collectTreat = useCallback(
    (amount: number) => {
      const s = stateRef.current;
      const next = { ...s, energy: s.energy + amount };
      setState(next);
      persist(next);
      showFlash(`Found a treat! +${amount} ⚡`);
    },
    [persist, showFlash],
  );

  const clearFlash = useCallback(() => setFlash(null), []);

  const value = useMemo<PetContextValue>(
    () => ({
      ready,
      energy: state.energy,
      happiness,
      xp: state.xp,
      level,
      levelPct: pct,
      toNext,
      maxLevel: max,
      inventory: state.inventory,
      unlocked: state.unlocked,
      petsLeft: Math.max(0, PET_MAX - careToday.pets),
      playsLeft: Math.max(0, PLAY_MAX - careToday.plays),
      mood,
      flash,
      buyFood,
      feed,
      pet,
      play,
      collectTreat,
      clearFlash,
    }),
    [
      ready,
      state.energy,
      state.xp,
      state.inventory,
      state.unlocked,
      happiness,
      level,
      pct,
      toNext,
      max,
      careToday.pets,
      careToday.plays,
      mood,
      flash,
      buyFood,
      feed,
      pet,
      play,
      collectTreat,
      clearFlash,
    ],
  );

  return <PetContext.Provider value={value}>{children}</PetContext.Provider>;
}

export function usePet(): PetContextValue {
  const ctx = useContext(PetContext);
  if (!ctx) throw new Error('usePet must be used within a PetProvider');
  return ctx;
}
