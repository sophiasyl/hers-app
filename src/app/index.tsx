import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CycleCalendar } from '@/components/CycleCalendar';
import { CycleRing } from '@/components/CycleRing';
import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { FLOW_LEVELS, useCycle, type FlowLevel } from '@/lib/cycle';
import { dayKey } from '@/lib/format';
import { SYMPTOMS, useWellness } from '@/lib/wellness';
import { fonts, MOODS, moodByKey, radius, spacing, useTheme, type MoodKey } from '@/lib/theme';

function trendColor(trend: string, c: ReturnType<typeof useTheme>) {
  if (trend === '↑') return c.green;
  if (trend === '↓') return '#C2545A';
  return c.textTertiary;
}

export default function TrackScreen() {
  const c = useTheme();
  const { today, flowLogs, logFlow } = useCycle();
  const { logs: wellnessLogs, saveDay } = useWellness();

  const todayKey = dayKey(Date.now());
  const loggedFlow = flowLogs[todayKey];
  const todayWellness = wellnessLogs[todayKey];

  const [modal, setModal] = useState(false);
  const [flow, setFlow] = useState<FlowLevel | null>(null);
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);

  const open = () => {
    setFlow(loggedFlow ?? null);
    setMood(todayWellness?.mood ?? null);
    setSymptoms(todayWellness?.symptoms ?? []);
    setModal(true);
  };

  const toggleSymptom = (s: string) =>
    setSymptoms((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const save = () => {
    if (flow) logFlow(flow);
    saveDay(todayKey, { mood, symptoms });
    setModal(false);
  };

  const summary = [
    loggedFlow ? FLOW_LEVELS.find((f) => f.key === loggedFlow)?.label : null,
    todayWellness?.mood ? moodByKey(todayWellness.mood)?.label : null,
    todayWellness?.symptoms?.length
      ? `${todayWellness.symptoms.length} symptom${todayWellness.symptoms.length === 1 ? '' : 's'}`
      : null,
  ].filter(Boolean);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Hers." />

        <View style={styles.ringWrap}>
          <CycleRing progress={today.progress} day={today.day} label={today.content.label} color={c.green} />
        </View>

        <View style={styles.hormones}>
          {today.content.hormones.map((h) => (
            <View key={h.name} style={styles.hormone}>
              <Text style={[styles.hormoneName, { color: c.text }]}>{h.name}</Text>
              <Text style={[styles.hormoneState, { color: c.textSecondary }]}>{h.state}</Text>
              <Text style={[styles.hormoneTrend, { color: trendColor(h.trend, c) }]}>{h.trend}</Text>
            </View>
          ))}
        </View>

        <View style={styles.nextPeriod}>
          <Ionicons name="water" size={15} color="#C2545A" />
          <Text style={[styles.nextPeriodText, { color: c.textSecondary }]}>
            {today.isLate
              ? `Period ${Math.abs(today.daysUntilNextPeriod)} ${Math.abs(today.daysUntilNextPeriod) === 1 ? 'day' : 'days'} late`
              : today.daysUntilNextPeriod === 0
                ? 'Period expected today'
                : today.daysUntilNextPeriod === 1
                  ? 'Next period starts tomorrow'
                  : `Next period in ${today.daysUntilNextPeriod} days`}
          </Text>
        </View>

        <Card style={styles.logicCard}>
          <Text style={[styles.logicTitle, { color: c.text }]}>Today's Body Logic</Text>
          <Text style={[styles.logicBody, { color: c.textSecondary }]}>{today.content.bodyLogic}</Text>
        </Card>

        <Pressable
          onPress={open}
          style={[styles.cta, { backgroundColor: c.tan }]}
          accessibilityRole="button"
          accessibilityLabel="Log today">
          <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>Log today</Text>
        </Pressable>
        {summary.length > 0 ? (
          <Text style={[styles.loggedNote, { color: c.textTertiary }]}>Today: {summary.join(' · ')}</Text>
        ) : null}

        <SectionTitle style={styles.calendarTitle}>Cycle calendar</SectionTitle>
        <CycleCalendar />
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Log today</Text>

            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>FLOW</Text>
              <View style={styles.chipWrap}>
                {FLOW_LEVELS.map((f) => {
                  const sel = flow === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => setFlow(sel ? null : f.key)}
                      accessibilityLabel={`Flow ${f.label}`}
                      style={[
                        styles.flowChip,
                        { borderColor: f.color, backgroundColor: sel ? f.color + '33' : 'transparent' },
                      ]}>
                      <View style={[styles.flowDot, { backgroundColor: f.color }]} />
                      <Text style={[styles.flowLabel, { color: c.text }]}>{f.label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>MOOD</Text>
              <View style={styles.moodRow}>
                {MOODS.map((m) => {
                  const sel = mood === m.key;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => setMood(sel ? null : m.key)}
                      accessibilityLabel={`Mood ${m.label}`}
                      style={[styles.moodItem, sel && { backgroundColor: m.color + '24' }]}>
                      <MaterialCommunityIcons
                        name={m.icon as never}
                        size={30}
                        color={sel ? m.color : c.textTertiary}
                      />
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>SYMPTOMS</Text>
              <View style={styles.chipWrap}>
                {SYMPTOMS.map((s) => {
                  const sel = symptoms.includes(s);
                  return (
                    <Pressable
                      key={s}
                      onPress={() => toggleSymptom(s)}
                      accessibilityLabel={s}
                      accessibilityState={{ selected: sel }}
                      style={[
                        styles.symptomChip,
                        {
                          backgroundColor: sel ? c.green : c.surfaceAlt,
                          borderColor: sel ? c.green : c.border,
                        },
                      ]}>
                      <Text style={[styles.symptomText, { color: sel ? c.accentText : c.text }]}>{s}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable onPress={save} style={[styles.saveBtn, { backgroundColor: c.green }]}>
              <Text style={[styles.saveText, { color: c.accentText }]}>Save</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  ringWrap: { alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.lg },
  hormones: { flexDirection: 'row', justifyContent: 'center', gap: spacing.xl, marginBottom: spacing.md },
  hormone: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  hormoneName: { fontSize: 14, fontWeight: '500' },
  hormoneState: { fontSize: 14 },
  hormoneTrend: { fontSize: 15, fontWeight: '500' },
  nextPeriod: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginBottom: spacing.xl,
  },
  nextPeriodText: { fontSize: 14, fontWeight: '500' },
  calendarTitle: { marginTop: spacing.xl },
  logicCard: { marginBottom: spacing.lg },
  logicTitle: { fontSize: 16, fontWeight: '500', marginBottom: spacing.sm },
  logicBody: { fontSize: 15, lineHeight: 23 },
  cta: {
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    boxShadow: '0px 6px 16px rgba(80, 74, 58, 0.12)',
  },
  ctaText: { fontSize: 16, fontWeight: '600' },
  loggedNote: { fontSize: 13, textAlign: 'center', marginTop: spacing.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
  },
  sheetTitle: { fontSize: 22, fontFamily: fonts.serif, marginBottom: spacing.md },
  sheetScroll: { maxHeight: 400 },
  sectionLabel: { fontSize: 12, letterSpacing: 1, marginTop: spacing.md, marginBottom: spacing.sm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  flowChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  flowDot: { width: 12, height: 12, borderRadius: 6 },
  flowLabel: { fontSize: 14, fontWeight: '500' },
  moodRow: { flexDirection: 'row', gap: spacing.xs },
  moodItem: { padding: spacing.sm, borderRadius: radius.pill },
  symptomChip: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  symptomText: { fontSize: 14 },
  saveBtn: {
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveText: { fontSize: 16, fontWeight: '600' },
});
