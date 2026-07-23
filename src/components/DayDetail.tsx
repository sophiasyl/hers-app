import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useCommunity } from '@/lib/community';
import { FLOW_LEVELS, useCycle } from '@/lib/cycle';
import { useEntries } from '@/lib/entries';
import { dayKey } from '@/lib/format';
import { useMedication } from '@/lib/medication';
import { fonts, moodByKey, radius, spacing, useTheme, type MoodKey } from '@/lib/theme';
import { useWellness } from '@/lib/wellness';

function parseDayKey(k: string): Date {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m, d);
}

export function DayDetail({ dateKey, onClose }: { dateKey: string | null; onClose: () => void }) {
  const c = useTheme();
  const { flowLogs } = useCycle();
  const { logs: wellnessLogs } = useWellness();
  const { logs: medLogs } = useMedication();
  const { entries } = useEntries();
  const { myPosts } = useCommunity();

  const visible = dateKey != null;
  const key = dateKey ?? '';
  const flow = flowLogs[key];
  const flowLabel = FLOW_LEVELS.find((f) => f.key === flow);
  const w = wellnessLogs[key];
  const mood = w?.mood ? moodByKey(w.mood as MoodKey) : undefined;
  const symptoms = w?.symptoms ?? [];
  const meds = medLogs[key] ?? [];
  const dayEntries = entries.filter((e) => dayKey(e.createdAt) === key);
  const dayPosts = myPosts.filter((p) => dayKey(p.createdAt) === key);

  const empty =
    !flow && !mood && symptoms.length === 0 && meds.length === 0 && dayEntries.length === 0 && dayPosts.length === 0;

  const label = dateKey ? parseDayKey(dateKey).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }) : '';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text }]}>{label}</Text>
            <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Close">
              <Ionicons name="close" size={22} color={c.textTertiary} />
            </Pressable>
          </View>

          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            {empty ? (
              <Text style={[styles.empty, { color: c.textTertiary }]}>Nothing logged on this day.</Text>
            ) : (
              <>
                {flowLabel ? (
                  <Row label="Flow" c={c}>
                    <View style={styles.chipRow}>
                      <View style={[styles.dot, { backgroundColor: flowLabel.color }]} />
                      <Text style={[styles.value, { color: c.text }]}>{flowLabel.label}</Text>
                    </View>
                  </Row>
                ) : null}

                {mood ? (
                  <Row label="Mood" c={c}>
                    <Text style={[styles.value, { color: mood.color }]}>{mood.label}</Text>
                  </Row>
                ) : null}

                {symptoms.length > 0 ? (
                  <Row label="Symptoms" c={c}>
                    <View style={styles.wrap}>
                      {symptoms.map((s) => (
                        <View key={s} style={[styles.tag, { backgroundColor: c.surfaceAlt }]}>
                          <Text style={[styles.tagText, { color: c.text }]}>{s}</Text>
                        </View>
                      ))}
                    </View>
                  </Row>
                ) : null}

                {meds.length > 0 ? (
                  <Row label="Medication" c={c}>
                    <View style={styles.wrap}>
                      {meds.map((m) => (
                        <View key={m} style={[styles.tag, { backgroundColor: c.greenSoft }]}>
                          <Text style={[styles.tagText, { color: c.green }]}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  </Row>
                ) : null}

                {dayEntries.length > 0 ? (
                  <Row label="Diary" c={c}>
                    {dayEntries.map((e) => (
                      <View key={e.id} style={[styles.block, { backgroundColor: c.surfaceAlt }]}>
                        {e.title ? <Text style={[styles.blockTitle, { color: c.text }]}>{e.title}</Text> : null}
                        <Text style={[styles.blockBody, { color: c.textSecondary }]}>{e.body}</Text>
                      </View>
                    ))}
                  </Row>
                ) : null}

                {dayPosts.length > 0 ? (
                  <Row label="Your posts" c={c}>
                    {dayPosts.map((p) => (
                      <View key={p.id} style={[styles.block, { backgroundColor: c.surfaceAlt }]}>
                        <Text style={[styles.blockBody, { color: c.textSecondary }]}>{p.body}</Text>
                      </View>
                    ))}
                  </Row>
                ) : null}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Row({ label, c, children }: { label: string; c: ReturnType<typeof useTheme>; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: c.textTertiary }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    maxHeight: '80%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  title: { fontSize: 20, fontFamily: fonts.serif, flex: 1 },
  scroll: {},
  empty: { fontSize: 15, lineHeight: 22, paddingVertical: spacing.lg },
  section: { marginBottom: spacing.lg },
  sectionLabel: { fontSize: 11, letterSpacing: 1, marginBottom: spacing.sm },
  value: { fontSize: 15, fontWeight: '500' },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  tagText: { fontSize: 13 },
  block: { borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.sm },
  blockTitle: { fontSize: 14, fontWeight: '600', marginBottom: 4 },
  blockBody: { fontSize: 14, lineHeight: 21 },
});
