import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CycleCalendar } from '@/components/CycleCalendar';
import { CycleRing } from '@/components/CycleRing';
import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { FLOW_LEVELS, useCycle, type FlowLevel } from '@/lib/cycle';
import { dayKey } from '@/lib/format';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

function trendColor(trend: string, c: ReturnType<typeof useTheme>) {
  if (trend === '↑') return c.green;
  if (trend === '↓') return '#C2545A';
  return c.textTertiary;
}

export default function TrackScreen() {
  const c = useTheme();
  const { today, flowLogs, logFlow, startPeriodToday } = useCycle();
  const [modal, setModal] = useState(false);
  const loggedToday = flowLogs[dayKey(Date.now())];

  const onLog = (level: FlowLevel) => {
    logFlow(level);
    setModal(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Hers." />

        <View style={styles.ringWrap}>
          <CycleRing
            progress={today.progress}
            day={today.day}
            label={today.content.label}
            color={c.green}
          />
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
            {today.daysUntilNextPeriod === 1
              ? 'Next period starts tomorrow'
              : `Next period in ${today.daysUntilNextPeriod} days`}
          </Text>
        </View>

        <Card style={styles.logicCard}>
          <Text style={[styles.logicTitle, { color: c.text }]}>Today's Body Logic</Text>
          <Text style={[styles.logicBody, { color: c.textSecondary }]}>{today.content.bodyLogic}</Text>
        </Card>

        <Pressable
          onPress={() => setModal(true)}
          style={[styles.cta, { backgroundColor: c.tan }]}
          accessibilityRole="button">
          <Text style={[styles.ctaText, { color: '#FFFFFF' }]}>Log Today's Flow</Text>
        </Pressable>
        {loggedToday ? (
          <Text style={[styles.loggedNote, { color: c.textTertiary }]}>
            Logged today: {FLOW_LEVELS.find((f) => f.key === loggedToday)?.label}
          </Text>
        ) : null}

        <SectionTitle style={styles.calendarTitle}>Cycle calendar</SectionTitle>
        <CycleCalendar />
      </ScrollView>

      <Modal visible={modal} transparent animationType="slide" onRequestClose={() => setModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Log today's flow</Text>
            <View style={styles.flowRow}>
              {FLOW_LEVELS.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => onLog(f.key)}
                  style={[styles.flowChip, { borderColor: f.color, backgroundColor: f.color + '1A' }]}>
                  <View style={[styles.flowDot, { backgroundColor: f.color }]} />
                  <Text style={[styles.flowLabel, { color: c.text }]}>{f.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable
              onPress={() => {
                startPeriodToday();
                setModal(false);
              }}
              style={[styles.startBtn, { backgroundColor: c.green }]}>
              <Text style={[styles.startText, { color: c.accentText }]}>My period started today</Text>
            </Pressable>
            <Text style={[styles.startHint, { color: c.textTertiary }]}>
              This recalibrates your cycle to Day 1.
            </Text>
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
  hormones: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
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
    gap: spacing.md,
  },
  sheetTitle: { fontSize: 20, fontFamily: fonts.serif, marginBottom: spacing.xs },
  flowRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
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
  startBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  startText: { fontSize: 15, fontWeight: '500' },
  startHint: { fontSize: 12, textAlign: 'center' },
});
