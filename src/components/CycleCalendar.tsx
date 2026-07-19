import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui';
import { FLOW_LEVELS, PHASE_CONTENT, useCycle, type Phase } from '@/lib/cycle';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const COL = '14.2857%';

const PHASE_LABEL: Record<Phase, string> = {
  menstrual: 'Period',
  follicular: 'Follicular',
  ovulatory: 'Fertile',
  luteal: 'Luteal',
};
const LEGEND: Phase[] = ['menstrual', 'follicular', 'ovulatory', 'luteal'];

function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function CycleCalendar() {
  const c = useTheme();
  const { phaseFor, flowLogs } = useCycle();
  const todayKey = startOfDay(Date.now());

  const [view, setView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { year, month } = view;
  const monthName = new Date(year, month, 1).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const changeMonth = (delta: number) => {
    const next = new Date(year, month + delta, 1);
    setView({ year: next.getFullYear(), month: next.getMonth() });
  };

  return (
    <Card>
      <View style={styles.header}>
        <Pressable onPress={() => changeMonth(-1)} hitSlop={8} accessibilityLabel="Previous month">
          <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
        </Pressable>
        <Text style={[styles.month, { color: c.text }]}>{monthName}</Text>
        <Pressable onPress={() => changeMonth(1)} hitSlop={8} accessibilityLabel="Next month">
          <Ionicons name="chevron-forward" size={20} color={c.textSecondary} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={i} style={[styles.weekday, { color: c.textTertiary }]}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((d, i) => {
          if (d === null) return <View key={i} style={styles.cell} />;
          const dateMs = new Date(year, month, d).getTime();
          const logged = flowLogs[`${year}-${month}-${d}`];
          const phaseColor = PHASE_CONTENT[phaseFor(dateMs)].color;
          // Actual logged period days get a solid fill; predicted phases a light tint.
          const bg = logged
            ? (FLOW_LEVELS.find((f) => f.key === logged)?.color ?? '#C2545A') + '66'
            : phaseColor + '2E';
          const isToday = startOfDay(dateMs) === todayKey;
          return (
            <View key={i} style={styles.cell}>
              <View
                style={[
                  styles.dayCircle,
                  { backgroundColor: bg },
                  isToday && { borderWidth: 2, borderColor: c.green },
                ]}>
                <Text
                  style={[styles.dayNum, { color: c.text }, isToday && { fontFamily: fonts.bodyBold }]}>
                  {d}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <View style={styles.legend}>
        {LEGEND.map((p) => (
          <View key={p} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: PHASE_CONTENT[p].color }]} />
            <Text style={[styles.legendText, { color: c.textSecondary }]}>{PHASE_LABEL[p]}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  month: { fontSize: 16, fontFamily: fonts.serif },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekday: { width: COL, textAlign: 'center', fontSize: 11 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: COL, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: { fontSize: 13 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.md,
    justifyContent: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12 },
});
