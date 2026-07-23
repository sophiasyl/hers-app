import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CycleCalendar } from '@/components/CycleCalendar';
import { CycleRing } from '@/components/CycleRing';
import { DayDetail } from '@/components/DayDetail';
import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { FLOW_LEVELS, useCycle, type FlowLevel } from '@/lib/cycle';
import { conceptionChance, type ConceptionLevel } from '@/lib/cycleMath';
import { dayKey } from '@/lib/format';
import { MEDICATIONS, useMedication } from '@/lib/medication';
import { SYMPTOMS, useWellness } from '@/lib/wellness';
import { fonts, MOODS, moodByKey, radius, spacing, useTheme, type MoodKey } from '@/lib/theme';

function trendColor(trend: string, c: ReturnType<typeof useTheme>) {
  if (trend === '↑') return c.green;
  if (trend === '↓') return '#C2545A';
  return c.textTertiary;
}

// Colour scale for the pregnancy-chance meter (low → high).
const CHANCE_COLORS: Record<ConceptionLevel, string> = {
  'very-low': '#7FB069',
  low: '#B7C36B',
  medium: '#E0A458',
  high: '#D77A61',
  peak: '#C2545A',
};

export default function TrackScreen() {
  const c = useTheme();
  const { today, flowLogs, logFlow } = useCycle();
  const { logs: wellnessLogs, saveDay } = useWellness();
  const { logs: medLogs, saveDay: saveMeds } = useMedication();

  const todayKey = dayKey(Date.now());
  const loggedFlow = flowLogs[todayKey];
  const todayWellness = wellnessLogs[todayKey];
  const todayMeds = medLogs[todayKey];

  const chance = conceptionChance(today);

  const [modal, setModal] = useState(false);
  const [flow, setFlow] = useState<FlowLevel | null>(null);
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([]);

  const [medModal, setMedModal] = useState(false);
  const [meds, setMeds] = useState<string[]>([]);
  const [customMed, setCustomMed] = useState('');
  const [dayDetail, setDayDetail] = useState<string | null>(null);

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

  const openMeds = () => {
    setMeds(todayMeds ?? []);
    setCustomMed('');
    setMedModal(true);
  };

  const toggleMed = (m: string) =>
    setMeds((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));

  const addCustomMed = () => {
    const m = customMed.trim();
    if (!m) return;
    setMeds((prev) => (prev.some((x) => x.toLowerCase() === m.toLowerCase()) ? prev : [...prev, m]));
    setCustomMed('');
  };

  const saveMedication = () => {
    saveMeds(todayKey, meds);
    setMedModal(false);
  };

  const customMeds = meds.filter((m) => !MEDICATIONS.includes(m));

  const summary = [
    loggedFlow ? FLOW_LEVELS.find((f) => f.key === loggedFlow)?.label : null,
    todayWellness?.mood ? moodByKey(todayWellness.mood)?.label : null,
    todayWellness?.symptoms?.length
      ? `${todayWellness.symptoms.length} symptom${todayWellness.symptoms.length === 1 ? '' : 's'}`
      : null,
    todayMeds?.length ? `${todayMeds.length} med${todayMeds.length === 1 ? '' : 's'}` : null,
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

        <Card style={styles.chanceCard}>
          <View style={styles.chanceHeader}>
            <View style={styles.chanceTitleRow}>
              <Ionicons name="heart-outline" size={17} color={CHANCE_COLORS[chance.level]} />
              <Text style={[styles.chanceTitle, { color: c.text }]}>Chance of pregnancy today</Text>
            </View>
            <View style={[styles.chancePill, { backgroundColor: CHANCE_COLORS[chance.level] + '24' }]}>
              <Text style={[styles.chancePillText, { color: CHANCE_COLORS[chance.level] }]}>
                {chance.label}
              </Text>
            </View>
          </View>

          <View style={styles.segments}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.segment,
                  { backgroundColor: i <= chance.index ? CHANCE_COLORS[chance.level] : c.border },
                ]}
              />
            ))}
          </View>

          <Text style={[styles.chanceNote, { color: c.textSecondary }]}>{chance.note}</Text>
          <Text style={[styles.chanceCaveat, { color: c.textTertiary }]}>
            {chance.uncertain ? 'Your cycle looks irregular, so this is a rough estimate. ' : ''}
            An estimate from your cycle — not a substitute for contraception.
          </Text>
        </Card>

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

        <Pressable
          onPress={openMeds}
          style={[styles.medCta, { borderColor: c.border, backgroundColor: c.surface }]}
          accessibilityRole="button"
          accessibilityLabel="Log medication">
          <MaterialCommunityIcons name="pill" size={18} color={c.green} />
          <Text style={[styles.medCtaText, { color: c.text }]}>Log medication</Text>
        </Pressable>

        {summary.length > 0 ? (
          <Text style={[styles.loggedNote, { color: c.textTertiary }]}>Today: {summary.join(' · ')}</Text>
        ) : null}

        <SectionTitle style={styles.calendarTitle}>Cycle calendar</SectionTitle>
        <Text style={[styles.calendarHint, { color: c.textTertiary }]}>Tap any day to see what you logged.</Text>
        <CycleCalendar onDayPress={(ms) => setDayDetail(dayKey(ms))} />
      </ScrollView>

      <DayDetail dateKey={dayDetail} onClose={() => setDayDetail(null)} />

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

      <Modal visible={medModal} transparent animationType="slide" onRequestClose={() => setMedModal(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMedModal(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Medication today</Text>
            <Text style={[styles.sheetSub, { color: c.textSecondary }]}>
              Tap what you took today, or add your own.
            </Text>

            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.chipWrap}>
                {MEDICATIONS.map((m) => {
                  const sel = meds.includes(m);
                  return (
                    <Pressable
                      key={m}
                      onPress={() => toggleMed(m)}
                      accessibilityLabel={m}
                      accessibilityState={{ selected: sel }}
                      style={[
                        styles.symptomChip,
                        {
                          backgroundColor: sel ? c.green : c.surfaceAlt,
                          borderColor: sel ? c.green : c.border,
                        },
                      ]}>
                      <Text style={[styles.symptomText, { color: sel ? c.accentText : c.text }]}>{m}</Text>
                    </Pressable>
                  );
                })}
                {customMeds.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => toggleMed(m)}
                    accessibilityLabel={`${m}, tap to remove`}
                    style={[styles.symptomChip, { backgroundColor: c.green, borderColor: c.green }]}>
                    <Text style={[styles.symptomText, { color: c.accentText }]}>{m}  ✕</Text>
                  </Pressable>
                ))}
              </View>

              <View style={styles.customRow}>
                <TextInput
                  value={customMed}
                  onChangeText={setCustomMed}
                  placeholder="Add another medicine…"
                  placeholderTextColor={c.textTertiary}
                  style={[styles.customInput, { backgroundColor: c.surfaceAlt, color: c.text }]}
                  onSubmitEditing={addCustomMed}
                  returnKeyType="done"
                />
                <Pressable
                  onPress={addCustomMed}
                  disabled={!customMed.trim()}
                  accessibilityLabel="Add medicine"
                  style={[styles.addBtn, { backgroundColor: c.tan, opacity: customMed.trim() ? 1 : 0.5 }]}>
                  <Ionicons name="add" size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            </ScrollView>

            <Pressable onPress={saveMedication} style={[styles.saveBtn, { backgroundColor: c.green }]}>
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
  calendarHint: { fontSize: 13, marginTop: -spacing.sm, marginBottom: spacing.md },
  chanceCard: { marginBottom: spacing.lg },
  chanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  chanceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  chanceTitle: { fontSize: 16, fontWeight: '500' },
  chancePill: { borderRadius: radius.pill, paddingVertical: 4, paddingHorizontal: spacing.md },
  chancePillText: { fontSize: 13, fontWeight: '600' },
  segments: { flexDirection: 'row', gap: 6, marginBottom: spacing.md },
  segment: { flex: 1, height: 8, borderRadius: radius.pill },
  chanceNote: { fontSize: 14, lineHeight: 21 },
  chanceCaveat: { fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
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
  medCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
  },
  medCtaText: { fontSize: 15, fontWeight: '600' },
  loggedNote: { fontSize: 13, textAlign: 'center', marginTop: spacing.md },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
  },
  sheetTitle: { fontSize: 22, fontFamily: fonts.serif, marginBottom: spacing.md },
  sheetSub: { fontSize: 14, marginTop: -spacing.sm, marginBottom: spacing.sm, lineHeight: 20 },
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
  customRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.lg },
  customInput: {
    flex: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 15,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  saveText: { fontSize: 16, fontWeight: '600' },
});
