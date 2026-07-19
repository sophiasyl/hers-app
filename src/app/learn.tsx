import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { DAILY_LESSON } from '@/lib/content';
import { useCycle } from '@/lib/cycle';
import { useEntries, type Entry } from '@/lib/entries';
import { dayKey } from '@/lib/format';
import { petEmoji, useSession } from '@/lib/session';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

function petStage(level: number): string {
  if (level <= 1) return 'Hatchling';
  if (level <= 3) return 'Baby';
  if (level <= 6) return 'Growing';
  return 'Grown';
}

function computeStreak(entries: Entry[]): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map((e) => dayKey(e.createdAt)));
  let streak = 0;
  const cursor = new Date();
  while (days.has(dayKey(cursor.getTime()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default function LearnScreen() {
  const c = useTheme();
  const { today } = useCycle();
  const { entries, addEntry } = useEntries();
  const { profile } = useSession();
  const pet = profile.pet;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [draft, setDraft] = useState('');

  const { level, streak, progress } = useMemo(() => {
    const lvl = Math.floor(entries.length / 3) + 1;
    return { level: lvl, streak: computeStreak(entries), progress: (entries.length % 3) / 3 };
  }, [entries]);

  const saveReflection = () => {
    if (!draft.trim()) return;
    addEntry({ body: draft, source: 'manual' });
    setDraft('');
    setComposer(false);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Education & Archive" />

        <Card variant="green" style={styles.seed}>
          <Text style={[styles.petEmoji, { fontSize: 36 + Math.min(level, 8) * 3 }]}>
            {petEmoji(pet?.key)}
          </Text>
          <View style={styles.flex}>
            <Text style={[styles.seedTitle, { color: c.accentText }]}>{pet?.name ?? 'Your companion'}</Text>
            <Text style={[styles.seedMeta, { color: c.accentText }]}>
              {petStage(level)} · Level {level} · {streak} day streak
            </Text>
            <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: c.tan }]} />
            </View>
          </View>
        </Card>

        <SectionTitle style={styles.topGap}>Today's Personal Insight</SectionTitle>
        <View style={styles.insightList}>
          {today.content.personalInsights.map((ins) => (
            <View key={ins.title} style={styles.insightRow}>
              <View style={[styles.insightIcon, { backgroundColor: c.greenSoft }]}>
                <Ionicons name={ins.icon as never} size={18} color={c.green} />
              </View>
              <View style={styles.flex}>
                <Text style={[styles.insightTitle, { color: c.text }]}>{ins.title}</Text>
                <Text style={[styles.insightBody, { color: c.textSecondary }]}>
                  {ins.body.replace('{day}', String(today.day))}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.sectionRow, styles.topGap]}>
          <SectionTitle style={styles.noMargin}>Past Journals & Reflections</SectionTitle>
          <Pressable onPress={() => setComposer(true)} style={styles.addBtn} accessibilityLabel="New reflection">
            <Ionicons name="add" size={18} color={c.green} />
          </Pressable>
        </View>

        {entries.length === 0 ? (
          <Text style={[styles.empty, { color: c.textTertiary }]}>
            No reflections yet. Add one, or save a chat from Luna.
          </Text>
        ) : (
          entries.map((e) => {
            const open = expanded === e.id;
            const date = new Date(e.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const heading = e.title ?? `${date}: ${e.body.split('\n')[0].slice(0, 40)}`;
            return (
              <Pressable key={e.id} onPress={() => setExpanded(open ? null : e.id)}>
                <Card variant="outline" style={styles.journal}>
                  <View style={styles.journalHeader}>
                    <View style={[styles.journalIcon, { backgroundColor: c.surfaceAlt }]}>
                      <Ionicons
                        name={e.source === 'luna' ? 'moon-outline' : 'partly-sunny-outline'}
                        size={16}
                        color={c.green}
                      />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.journalTitle, { color: c.text }]} numberOfLines={open ? undefined : 1}>
                        {heading}
                      </Text>
                      <Text style={[styles.journalSub, { color: c.textTertiary }]}>
                        {e.source === 'luna' ? 'Luna AI Summary' : 'Reflection'} · {date}
                      </Text>
                    </View>
                    <Ionicons name={open ? 'chevron-up' : 'chevron-forward'} size={18} color={c.textTertiary} />
                  </View>
                  {open ? <Text style={[styles.journalBody, { color: c.textSecondary }]}>{e.body}</Text> : null}
                </Card>
              </Pressable>
            );
          })
        )}

        <SectionTitle style={styles.topGap}>Daily Lesson</SectionTitle>
        <View style={styles.lessonCard}>
          <Image source={{ uri: DAILY_LESSON.image }} style={styles.lessonImage} contentFit="cover" transition={200} />
          <View style={styles.lessonOverlay}>
            <Text style={styles.lessonTitle}>{DAILY_LESSON.title}</Text>
            <Text style={styles.lessonSub}>{DAILY_LESSON.subtitle}</Text>
          </View>
        </View>
      </ScrollView>

      <Modal visible={composer} transparent animationType="slide" onRequestClose={() => setComposer(false)}>
        <Pressable style={styles.backdrop} onPress={() => setComposer(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>New reflection</Text>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="What's on your mind?"
              placeholderTextColor={c.textTertiary}
              multiline
              style={[styles.composerInput, { color: c.text, backgroundColor: c.surfaceAlt }]}
            />
            <Pressable
              onPress={saveReflection}
              style={[styles.saveBtn, { backgroundColor: draft.trim() ? c.green : c.surfaceAlt }]}>
              <Text style={[styles.saveText, { color: draft.trim() ? c.accentText : c.textTertiary }]}>Save</Text>
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
  flex: { flex: 1 },
  noMargin: { marginBottom: 0 },
  topGap: { marginTop: spacing.xl },
  seed: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  petEmoji: { textAlign: 'center' },
  seedTitle: { fontSize: 16, fontWeight: '500' },
  seedMeta: { fontSize: 13, opacity: 0.85, marginTop: 2, marginBottom: spacing.md },
  progressTrack: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: radius.pill },
  insightList: { gap: spacing.lg },
  insightRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  insightIcon: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  insightTitle: { fontSize: 15, fontWeight: '500', marginBottom: 2 },
  insightBody: { fontSize: 14, lineHeight: 21 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  addBtn: { width: 30, height: 30, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 14, lineHeight: 21, paddingVertical: spacing.sm },
  journal: { marginBottom: spacing.md },
  journalHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  journalIcon: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  journalTitle: { fontSize: 14, fontWeight: '500' },
  journalSub: { fontSize: 12, marginTop: 2 },
  journalBody: { fontSize: 14, lineHeight: 21, marginTop: spacing.md },
  lessonCard: { borderRadius: radius.lg, overflow: 'hidden', height: 170 },
  lessonImage: { width: '100%', height: '100%' },
  lessonOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(20,22,15,0.45)',
  },
  lessonTitle: { fontSize: 18, fontFamily: fonts.serif, color: '#FFFFFF' },
  lessonSub: { fontSize: 13, color: '#F0EFE6', marginTop: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.md },
  sheetTitle: { fontSize: 20, fontFamily: fonts.serif },
  composerInput: {
    minHeight: 120,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    lineHeight: 23,
    textAlignVertical: 'top',
  },
  saveBtn: { borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center' },
  saveText: { fontSize: 15, fontWeight: '600' },
});
