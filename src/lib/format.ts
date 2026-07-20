import type { Entry } from './entries';

export function timeLabel(ts: number): string {
  const d = new Date(ts);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function dayKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function isToday(ts: number): boolean {
  return dayKey(ts) === dayKey(Date.now());
}

// Convert between the app's internal dayKey ("Y-M-D", M is 0-based) and the
// Supabase `date` column format ("YYYY-MM-DD", M is 1-based, zero-padded).
export function appKeyToDbDate(k: string): string {
  const [y, m, d] = k.split('-').map(Number);
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function dbDateToAppKey(s: string): string {
  const [y, m, d] = s.split('-').map(Number);
  return `${y}-${m - 1}-${d}`;
}

export function dbDateToMs(s: string): number {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}

export function msToDbDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dayLabel(ts: number): string {
  const d = new Date(ts);
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(d)) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return d.toLocaleDateString(undefined, { weekday: 'long' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export function greeting(ts: number = Date.now()): string {
  const h = new Date(ts).getHours();
  if (h < 5) return 'Late night';
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export interface DaySection {
  key: string;
  label: string;
  items: Entry[];
}

/** Group entries (already newest-first) into day sections, preserving order. */
export function groupByDay(entries: Entry[]): DaySection[] {
  const sections: DaySection[] = [];
  let current: DaySection | null = null;
  for (const e of entries) {
    const key = dayKey(e.createdAt);
    if (!current || current.key !== key) {
      current = { key, label: dayLabel(e.createdAt), items: [] };
      sections.push(current);
    }
    current.items.push(e);
  }
  return sections;
}
