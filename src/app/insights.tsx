import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DayDetail } from '@/components/DayDetail';
import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { useCommunity } from '@/lib/community';
import { FLOW_LEVELS, useCycle } from '@/lib/cycle';
import { useEntries } from '@/lib/entries';
import { dayKey } from '@/lib/format';
import { useMedication } from '@/lib/medication';
import { SYMPTOM_CARE, useWellness } from '@/lib/wellness';
import { fonts, MOODS, radius, spacing, useTheme } from '@/lib/theme';

const DAY = 86400000;

function dayFromKey(k: string): number {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m, d).getTime();
}

function formatDay(k: string): string {
  return new Date(dayFromKey(k)).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

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
  const { logs: wellnessLogs } = useWellness();
  const { logs: medLogs } = useMedication();
  const { myPosts } = useCommunity();

  const [historyOpen, setHistoryOpen] = useState(false);
  const [dayDetail, setDayDetail] = useState<string | null>(null);

  const historyDays = useMemo(() => {
    const keys = new Set<string>();
    Object.keys(flowLogs).forEach((k) => keys.add(k));
    Object.keys(wellnessLogs).forEach((k) => keys.add(k));
    Object.keys(medLogs).forEach((k) => keys.add(k));
    entries.forEach((e) => keys.add(dayKey(e.createdAt)));
    myPosts.forEach((p) => keys.add(dayKey(p.createdAt)));
    return Array.from(keys)
      .map((k) => {
        const w = wellnessLogs[k];
        const parts: string[] = [];
        if (flowLogs[k]) parts.push(`${FLOW_LEVELS.find((f) => f.key === flowLogs[k])?.label ?? 'Flow'} flow`);
        if (w?.mood) parts.push(MOODS.find((m) => m.key === w.mood)?.label ?? 'Mood');
        if (w?.symptoms?.length) parts.push(plural(w.symptoms.length, 'symptom'));
        if (medLogs[k]?.length) parts.push(plural(medLogs[k].length, 'med'));
        const nEntries = entries.filter((e) => dayKey(e.createdAt) === k).length;
        if (nEntries) parts.push(`${nEntries} diary`);
        const nPosts = myPosts.filter((p) => dayKey(p.createdAt) === k).length;
        if (nPosts) parts.push(plural(nPosts, 'post'));
        return { key: k, ms: dayFromKey(k), summary: parts.join(' · ') || '—' };
      })
      .sort((a, b) => b.ms - a.ms);
  }, [flowLogs, wellnessLogs, medLogs, entries, myPosts]);

  const wellness = useMemo(() => {
    const arr = Object.values(wellnessLogs);
    const moodCounts = MOODS.map((m) => ({
      key: m.key,
      label: m.label,
      color: m.color,
      count: arr.filter((w) => w.mood === m.key).length,
    }));
    const moodTotal = moodCounts.reduce((a, b) => a + b.count, 0);
    const maxMood = Math.max(1, ...moodCounts.map((m) => m.count));
    const symptomCounts: Record<string, number> = {};
    arr.forEach((w) => (w.symptoms ?? []).forEach((s) => (symptomCounts[s] = (symptomCounts[s] ?? 0) + 1)));
    const topSymptoms = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    return { moodCounts, moodTotal, maxMood, topSymptoms };
  }, [wellnessLogs]);

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

        <Pressable
          onPress={() => setHistoryOpen(true)}
          style={[styles.historyBtn, { backgroundColor: c.green }]}
          accessibilityRole="button"
          accessibilityLabel="Your history">
          <Ionicons name="time-outline" size={20} color={c.accentText} />
          <View style={styles.historyTextWrap}>
            <Text style={[styles.historyTitle, { color: c.accentText }]}>Your history</Text>
            <Text style={[styles.historySub, { color: c.accentText }]}>Logs, diary &amp; posts by day</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.accentText} />
        </Pressable>

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

        <Card variant="outline" style={styles.chartCard}>
          <Text style={[styles.cardTitle, { color: c.text }]}>How you&apos;ve been feeling</Text>
          {wellness.moodTotal > 0 || wellness.topSymptoms.length > 0 ? (
            <>
              {wellness.moodTotal > 0 ? (
                <View style={styles.moodList}>
                  {wellness.moodCounts.map((m) => (
                    <View key={m.key} style={styles.moodRow}>
                      <Text style={[styles.moodLabel, { color: c.textSecondary }]}>{m.label}</Text>
                      <View style={[styles.moodTrack, { backgroundColor: c.surfaceAlt }]}>
                        <View
                          style={[
                            styles.moodFill,
                            { width: `${Math.round((m.count / wellness.maxMood) * 100)}%`, backgroundColor: m.color },
                          ]}
                        />
                      </View>
                      <Text style={[styles.moodCount, { color: c.textTertiary }]}>{m.count}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
              {wellness.topSymptoms.length > 0 ? (
                <>
                  <Text style={[styles.subLabel, { color: c.textTertiary }]}>Most common symptoms</Text>
                  <View style={styles.symptomRows}>
                    {wellness.topSymptoms.map(([name, count]) => (
                      <View key={name} style={styles.symptomRow}>
                        <Text style={[styles.symptomName, { color: c.text }]}>{name}</Text>
                        <Text style={[styles.symptomCount, { color: c.textSecondary }]}>
                          {count}×
                        </Text>
                      </View>
                    ))}
                  </View>

                  <Text style={[styles.subLabel, { color: c.textTertiary }]}>What helps</Text>
                  <View style={styles.careList}>
                    {wellness.topSymptoms.slice(0, 3).map(([name]) => {
                      const care = SYMPTOM_CARE[name];
                      if (!care) return null;
                      return (
                        <View key={name} style={[styles.careCard, { backgroundColor: c.surfaceAlt }]}>
                          <Text style={[styles.careName, { color: c.text }]}>{name}</Text>
                          <View style={styles.careRow}>
                            <Ionicons name="leaf-outline" size={15} color={c.green} style={styles.careIcon} />
                            <Text style={[styles.careText, { color: c.textSecondary }]}>{care.soothe}</Text>
                          </View>
                          <View style={styles.careRow}>
                            <Ionicons name="restaurant-outline" size={15} color={c.green} style={styles.careIcon} />
                            <Text style={[styles.careText, { color: c.textSecondary }]}>Eat: {care.foods}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                  <Text style={[styles.careDisclaimer, { color: c.textTertiary }]}>
                    Gentle suggestions to ease symptoms — not medical advice.
                  </Text>
                </>
              ) : null}
            </>
          ) : (
            <Text style={[styles.emptyChart, { color: c.textTertiary }]}>
              Log your mood and symptoms with “Log today” on the Track tab, and your patterns will
              show up here.
            </Text>
          )}
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

      <Modal visible={historyOpen} transparent animationType="slide" onRequestClose={() => setHistoryOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setHistoryOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: c.text }]}>Your history</Text>
              <Pressable onPress={() => setHistoryOpen(false)} hitSlop={8} accessibilityLabel="Close">
                <Ionicons name="close" size={22} color={c.textTertiary} />
              </Pressable>
            </View>
            {historyDays.length === 0 ? (
              <Text style={[styles.historyEmpty, { color: c.textTertiary }]}>
                Nothing logged yet. Track a day, write a diary entry, or post in Unity — it’ll all show
                up here by day.
              </Text>
            ) : (
              <ScrollView style={styles.historyScroll} showsVerticalScrollIndicator={false}>
                {historyDays.map((day) => (
                  <Pressable
                    key={day.key}
                    onPress={() => {
                      setHistoryOpen(false);
                      setDayDetail(day.key);
                    }}
                    style={[styles.dayRow, { borderBottomColor: c.border }]}>
                    <View style={styles.flex}>
                      <Text style={[styles.dayRowDate, { color: c.text }]}>{formatDay(day.key)}</Text>
                      <Text style={[styles.dayRowSummary, { color: c.textTertiary }]}>{day.summary}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={c.textTertiary} />
                  </Pressable>
                ))}
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <DayDetail dateKey={dayDetail} onClose={() => setDayDetail(null)} />
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
  moodList: { gap: spacing.sm, marginBottom: spacing.md },
  moodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  moodLabel: { fontSize: 13, width: 44 },
  moodTrack: { flex: 1, height: 8, borderRadius: radius.pill, overflow: 'hidden' },
  moodFill: { height: 8, borderRadius: radius.pill, minWidth: 2 },
  moodCount: { fontSize: 12, width: 18, textAlign: 'right' },
  subLabel: { fontSize: 12, letterSpacing: 0.5, marginTop: spacing.sm, marginBottom: spacing.sm },
  symptomRows: { gap: spacing.xs },
  symptomRow: { flexDirection: 'row', justifyContent: 'space-between' },
  symptomName: { fontSize: 14 },
  symptomCount: { fontSize: 14 },
  careList: { gap: spacing.sm },
  careCard: { borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  careName: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  careRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  careIcon: { marginTop: 2 },
  careText: { flex: 1, fontSize: 13, lineHeight: 19 },
  careDisclaimer: { fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  flex: { flex: 1 },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    boxShadow: '0px 6px 16px rgba(80, 74, 58, 0.12)',
  },
  historyTextWrap: { flex: 1 },
  historyTitle: { fontSize: 15, fontWeight: '600' },
  historySub: { fontSize: 13, opacity: 0.85, marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 20, fontFamily: fonts.serif },
  historyEmpty: { fontSize: 15, lineHeight: 22, paddingVertical: spacing.lg },
  historyScroll: {},
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  dayRowDate: { fontSize: 15, fontWeight: '500' },
  dayRowSummary: { fontSize: 13, marginTop: 2 },
});

