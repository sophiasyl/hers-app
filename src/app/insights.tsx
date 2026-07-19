import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { FLOW_LEVELS, useCycle } from '@/lib/cycle';
import { useEntries } from '@/lib/entries';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

const DAY = 86400000;

const REGULARITY_NOTE: Record<string, string> = {
  regular: 'Your cycles are regular — they vary by only a day or two. Predictions here are reliable.',
  somewhat: 'Your cycles are fairly regular, with a little natural variation month to month.',
  irregular:
    'Your cycles vary quite a bit right now. That’s common — a few more logged cycles will sharpen your predictions.',
  unknown: 'Log a couple of periods and your cycle-length trend will appear here.',
};

export default function InsightsScreen() {
  const c = useTheme();
  const { today, flowLogs } = useCycle();
  const { entries } = useEntries();

  const stats = useMemo(() => {
    const history = today.history;
    const gaps: number[] = [];
    for (let i = 1; i < history.length; i++) {
      gaps.push(Math.round((history[i].start - history[i - 1].start) / DAY));
    }
    const bars = gaps.slice(-8);
    const avgCycle = today.avgCycleLength ?? today.cycleLength;
    const isEstimate = today.avgCycleLength == null;
    const daysLogged = Object.keys(flowLogs).length;
    const flowCounts = FLOW_LEVELS.map((f) => ({
      ...f,
      count: Object.values(flowLogs).filter((v) => v === f.key).length,
    }));
    const topFlow = flowCounts.filter((f) => f.count > 0).sort((a, b) => b.count - a.count)[0];
    return {
      bars,
      avgCycle,
      isEstimate,
      avgPeriod: today.periodLength,
      cyclesTracked: today.cyclesTracked,
      regularity: today.regularity,
      periodsLogged: history.length,
      daysLogged,
      reflections: entries.length,
      topFlow,
    };
  }, [today, flowLogs, entries.length]);

  const maxBar = Math.max(1, ...stats.bars);

  const logged = [
    { icon: 'water-outline', label: 'Periods logged', value: `${stats.periodsLogged}` },
    { icon: 'calendar-outline', label: 'Days tracked', value: `${stats.daysLogged}` },
    { icon: 'book-outline', label: 'Reflections written', value: `${stats.reflections}` },
    ...(stats.topFlow
      ? [{ icon: 'pulse-outline', label: 'Most-logged flow', value: stats.topFlow.label }]
      : []),
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Cycle Insights" />

        <SectionTitle>Your cycle analytics</SectionTitle>
        <View style={styles.metrics}>
          <Card style={styles.metric}>
            <Text style={[styles.metricValue, { color: c.green }]}>{stats.avgCycle}</Text>
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>AVG CYCLE (DAYS)</Text>
          </Card>
          <Card style={styles.metric}>
            <Text style={[styles.metricValue, { color: c.green }]}>{stats.avgPeriod}</Text>
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>AVG PERIOD (DAYS)</Text>
          </Card>
          <Card style={styles.metric}>
            <Text style={[styles.metricValue, { color: c.green }]}>{stats.cyclesTracked}</Text>
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>CYCLES TRACKED</Text>
          </Card>
        </View>
        {stats.isEstimate ? (
          <Text style={[styles.estimate, { color: c.textTertiary }]}>
            Based on your onboarding estimate — these refine automatically as you log real periods.
          </Text>
        ) : null}

        <Card variant="outline" style={styles.chartCard}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Cycle length trend</Text>
          {stats.bars.length >= 2 ? (
            <View style={styles.chart}>
              {stats.bars.map((v, i) => {
                const peak = i === stats.bars.length - 1;
                return (
                  <View key={i} style={styles.barCol}>
                    <View
                      style={[
                        styles.bar,
                        { height: Math.max(6, Math.round((v / maxBar) * 104)), backgroundColor: peak ? c.tan : c.surfaceAlt },
                      ]}
                    />
                    <Text style={[styles.barLabel, { color: c.textTertiary }]}>{v}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <Text style={[styles.emptyChart, { color: c.textTertiary }]}>
              Not enough data yet — each bar is the length of a past cycle. Log your next period and
              this fills in.
            </Text>
          )}
          <Text style={[styles.note, { color: c.textSecondary }]}>{REGULARITY_NOTE[stats.regularity]}</Text>
        </Card>

        <Card style={styles.feelCard}>
          <Text style={[styles.cardTitle, { color: c.text }]}>What you&apos;ve logged</Text>
          <View style={styles.feelList}>
            {logged.map((row) => (
              <View key={row.label} style={styles.feelRow}>
                <Ionicons name={row.icon as never} size={20} color={c.green} style={styles.feelIcon} />
                <Text style={[styles.feelText, { color: c.text }]}>{row.label}</Text>
                <Text style={[styles.feelValue, { color: c.text }]}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  metrics: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  metric: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg, paddingHorizontal: spacing.xs },
  metricValue: { fontSize: 28, fontFamily: fonts.serif },
  metricLabel: { fontSize: 10, letterSpacing: 0.5, marginTop: spacing.xs, textAlign: 'center' },
  estimate: { fontSize: 12, lineHeight: 18, marginBottom: spacing.lg },
  chartCard: { marginBottom: spacing.lg, marginTop: spacing.sm },
  cardTitle: { fontSize: 16, fontWeight: '500', marginBottom: spacing.md },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 130,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  barCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 4 },
  bar: { width: '100%', borderRadius: radius.sm, minHeight: 6 },
  barLabel: { fontSize: 11 },
  emptyChart: { fontSize: 14, lineHeight: 21, marginBottom: spacing.md },
  note: { fontSize: 13, lineHeight: 20 },
  feelCard: {},
  feelList: { gap: spacing.md },
  feelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  feelIcon: {},
  feelText: { flex: 1, fontSize: 15 },
  feelValue: { fontSize: 15, fontFamily: fonts.serif },
});
