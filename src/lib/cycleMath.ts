// Pure cycle-prediction logic (no React) so it can be unit-tested directly.
// Mirrors how consumer period apps work: detect period start dates from logged
// bleeding days, learn the average cycle/period length from history, and predict
// the next period + fertile window from that.

export type Phase = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal';
export type FlowLevel = 'spotting' | 'light' | 'medium' | 'heavy';

export interface CycleConfig {
  lastPeriodStart: number;
  cycleLength: number;
  periodLength: number;
}

export interface PeriodRecord {
  start: number; // start-of-day ms
  length: number; // days
}

export interface CycleStatus {
  day: number; // 1-based day of current cycle
  phase: Phase;
  cycleLength: number; // predicted/typical
  periodLength: number;
  lastPeriodStart: number;
  nextPeriodStart: number;
  daysUntilNextPeriod: number; // negative when overdue
  isLate: boolean;
  ovulationDay: number; // cycle-day of predicted ovulation
  fertileWindow: [number, number]; // cycle-day range
  history: PeriodRecord[]; // detected periods, ascending
  avgCycleLength: number | null; // from history (null if <2 cycles)
  cycleLengthStdDev: number | null;
  regularity: 'regular' | 'somewhat' | 'irregular' | 'unknown';
  cyclesTracked: number; // number of completed cycles (gaps) observed
}

export const DAY_MS = 86400000;
const MIN_CYCLE = 15; // days; below this two bleed events are the same cycle

export function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function daysBetween(a: number, b: number): number {
  return Math.round((b - a) / DAY_MS);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Turn logged bleeding days (dateKey "Y-M-D", M 0-based) into period records. */
export function detectPeriods(flowLogs: Record<string, FlowLevel>): PeriodRecord[] {
  const days = Object.keys(flowLogs)
    .map((k) => {
      const [y, m, d] = k.split('-').map(Number);
      return new Date(y, m, d).getTime();
    })
    .sort((a, b) => a - b);
  if (!days.length) return [];

  // consecutive-day streaks (tolerate a single missed day inside a period)
  const streaks: { start: number; end: number }[] = [];
  let cur = { start: days[0], end: days[0] };
  for (let i = 1; i < days.length; i++) {
    if (daysBetween(days[i - 1], days[i]) <= 2) cur.end = days[i];
    else {
      streaks.push(cur);
      cur = { start: days[i], end: days[i] };
    }
  }
  streaks.push(cur);

  const periods: PeriodRecord[] = [];
  for (const s of streaks) {
    const len = daysBetween(s.start, s.end) + 1;
    if (!periods.length) {
      periods.push({ start: s.start, length: len });
      continue;
    }
    const prev = periods[periods.length - 1];
    if (daysBetween(prev.start, s.start) >= MIN_CYCLE) {
      periods.push({ start: s.start, length: len });
    } else if (daysBetween(prev.start + (prev.length - 1) * DAY_MS, s.start) <= 3) {
      // continuation of the same period's bleeding
      prev.length = daysBetween(prev.start, s.end) + 1;
    }
    // otherwise: mid-cycle spotting — ignore for cycle detection
  }
  return periods;
}

function phaseForDay(day: number, cycleLength: number, periodLength: number, ovulationDay: number): Phase {
  if (day <= periodLength) return 'menstrual';
  if (day >= ovulationDay - 1 && day <= ovulationDay + 1) return 'ovulatory';
  if (day < ovulationDay - 1) return 'follicular';
  return 'luteal';
}

/** Phase for an arbitrary date, projected from the current cycle anchor. */
export function phaseForDate(
  dateMs: number,
  lastPeriodStart: number,
  cycleLength: number,
  periodLength: number,
): Phase {
  const diff = Math.floor((startOfDay(dateMs) - startOfDay(lastPeriodStart)) / DAY_MS);
  const mod = ((diff % cycleLength) + cycleLength) % cycleLength;
  return phaseForDay(mod + 1, cycleLength, periodLength, cycleLength - 14);
}

export function deriveCycle(
  flowLogs: Record<string, FlowLevel>,
  config: CycleConfig,
  now: number,
): CycleStatus {
  const today = startOfDay(now);
  const history = detectPeriods(flowLogs);

  let avgCycleLength: number | null = null;
  let stdDev: number | null = null;
  let cyclesTracked = 0;
  if (history.length >= 2) {
    const gaps: number[] = [];
    for (let i = 1; i < history.length; i++) gaps.push(daysBetween(history[i - 1].start, history[i].start));
    const recent = gaps.slice(-6);
    cyclesTracked = gaps.length;
    const mean = recent.reduce((a, b) => a + b, 0) / recent.length;
    avgCycleLength = Math.round(mean);
    stdDev = Math.sqrt(recent.reduce((a, b) => a + (b - mean) ** 2, 0) / recent.length);
  }

  const cycleLength = clamp(avgCycleLength ?? config.cycleLength ?? 28, 21, 45);

  let periodLength = clamp(config.periodLength ?? 5, 1, 10);
  if (history.length) {
    const lens = history.slice(-6).map((p) => p.length);
    periodLength = clamp(Math.round(lens.reduce((a, b) => a + b, 0) / lens.length), 1, 10);
  }

  const lastPeriodStart = history.length
    ? history[history.length - 1].start
    : startOfDay(config.lastPeriodStart);

  const day = Math.floor((today - lastPeriodStart) / DAY_MS) + 1;
  const nextPeriodStart = lastPeriodStart + cycleLength * DAY_MS;
  const daysUntilNextPeriod = daysBetween(today, nextPeriodStart);
  const isLate = daysUntilNextPeriod < 0;
  const ovulationDay = cycleLength - 14;
  const fertileWindow: [number, number] = [Math.max(1, ovulationDay - 3), ovulationDay + 1];
  const phase = phaseForDay(day, cycleLength, periodLength, ovulationDay);

  let regularity: CycleStatus['regularity'] = 'unknown';
  if (stdDev != null) regularity = stdDev <= 2 ? 'regular' : stdDev <= 4 ? 'somewhat' : 'irregular';

  return {
    day,
    phase,
    cycleLength,
    periodLength,
    lastPeriodStart,
    nextPeriodStart,
    daysUntilNextPeriod,
    isLate,
    ovulationDay,
    fertileWindow,
    history,
    avgCycleLength,
    cycleLengthStdDev: stdDev,
    regularity,
    cyclesTracked,
  };
}

// ── Conception (pregnancy) likelihood for today ──────────────────────────────
// A qualitative estimate mirroring how consumer apps present fertility: highest
// on/just-before ovulation, tapering across the fertile window, low elsewhere.
// This is an ESTIMATE from logged cycles — never present it as contraception.

export type ConceptionLevel = 'very-low' | 'low' | 'medium' | 'high' | 'peak';

export interface ConceptionChance {
  level: ConceptionLevel;
  index: number; // 0..4, for a segmented bar
  label: string;
  note: string;
  uncertain: boolean; // true when the cycle is irregular/late so the estimate is shaky
}

const CONCEPTION_LABEL: Record<ConceptionLevel, string> = {
  'very-low': 'Very low',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  peak: 'Very high',
};

const CONCEPTION_INDEX: Record<ConceptionLevel, number> = {
  'very-low': 0,
  low: 1,
  medium: 2,
  high: 3,
  peak: 4,
};

export function conceptionChance(status: CycleStatus): ConceptionChance {
  const { day, ovulationDay, periodLength, isLate, regularity } = status;
  const d = day - ovulationDay; // days relative to predicted ovulation

  let level: ConceptionLevel;
  if (day <= periodLength) {
    level = 'very-low';
  } else if (d === -1 || d === 0) {
    level = 'peak';
  } else if (d === -2 || d === 1) {
    level = 'high';
  } else if (d === -3) {
    level = 'medium';
  } else if (d === -4 || d === -5) {
    level = 'low';
  } else {
    level = 'very-low';
  }

  const note: Record<ConceptionLevel, string> = {
    peak: "You're in your fertile peak — pregnancy is most likely right now.",
    high: "You're in your fertile window — pregnancy is quite possible around now.",
    medium: 'Your fertile window is near — the chance is starting to rise.',
    low: 'The chance is low today, but your fertile window is approaching.',
    'very-low': "You're outside your estimated fertile window, so pregnancy is unlikely today.",
  };

  return {
    level,
    index: CONCEPTION_INDEX[level],
    label: CONCEPTION_LABEL[level],
    note: note[level],
    uncertain: isLate || regularity === 'irregular' || regularity === 'unknown',
  };
}
