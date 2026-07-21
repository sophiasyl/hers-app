import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { DAILY_LESSON } from '@/lib/content';
import { useCycle } from '@/lib/cycle';
import { useEntries, type Entry } from '@/lib/entries';
import { dayKey } from '@/lib/format';
import { polishJournal } from '@/lib/journal';
import { petEmoji, useSession } from '@/lib/session';
import { fonts, MOODS, moodByKey, radius, spacing, useTheme, type MoodKey } from '@/lib/theme';

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

const SOURCE_META: Record<Entry['source'], { icon: string; label: string }> = {
  ai: { icon: 'sparkles-outline', label: 'Diary' },
  luna: { icon: 'moon-outline', label: 'Luna AI' },
  manual: { icon: 'partly-sunny-outline', label: 'Reflection' },
};

export default function LearnScreen() {
  const c = useTheme();
  const { today } = useCycle();
  const { entries, addEntry } = useEntries();
  const { profile } = useSession();
  const pet = profile.pet;
  const [expanded, setExpanded] = useState<string | null>(null);

  // Journal composer
  const [composer, setComposer] = useState(false);
  const [step, setStep] = useState<'write' | 'preview'>('write');
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState('');
  const [aiBody, setAiBody] = useState('');

  const { level, streak, progress } = useMemo(() => {
    const lvl = Math.floor(entries.length / 3) + 1;
    return { level: lvl, streak: computeStreak(entries), progress: (entries.length % 3) / 3 };
  }, [entries]);

  const openComposer = () => {
    setStep('write');
    setDraft('');
    setMood(null);
    setError(null);
    setAiTitle('');
    setAiBody('');
    setGenerating(false);
    setComposer(true);
  };

  const turnIntoJournal = async () => {
    const text = draft.trim();
    if (!text || generating) return;
    setGenerating(true);
    setError(null);
    const res = await polishJournal({
      text,
      mood: mood ? moodByKey(mood)?.label : undefined,
      phase: today.content.label,
      day: today.day,
    });
    setGenerating(false);
    if ('error' in res) {
      setError(res.error);
      return;
    }
    setAiTitle(res.title);
    setAiBody(res.body);
    setStep('preview');
  };

  const saveAi = () => {
    const bodyText = aiBody.trim();
    if (!bodyText) return;
    addEntry({ body: bodyText, title: aiTitle.trim() || undefined, mood, source: 'ai' });
    setComposer(false);
  };

  const saveRaw = () => {
    const text = draft.trim();
    if (!text) return;
    addEntry({ body: text, mood, source: 'manual' });
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
          <SectionTitle style={styles.noMargin}>Your Diary</SectionTitle>
          <Pressable onPress={openComposer} style={styles.addBtn} accessibilityLabel="New journal entry">
            <Ionicons name="add" size={18} color={c.green} />
          </Pressable>
        </View>

        <Pressable
          onPress={openComposer}
          style={[styles.newEntryCta, { backgroundColor: c.greenSoft }]}
          accessibilityRole="button"
          accessibilityLabel="Write a journal entry">
          <Ionicons name="sparkles" size={16} color={c.green} />
          <Text style={[styles.newEntryText, { color: c.green }]}>
            Jot down how you feel — Luna turns it into a diary entry
          </Text>
        </Pressable>

        {entries.length === 0 ? (
          <Text style={[styles.empty, { color: c.textTertiary }]}>
            No diary entries yet. Tap above to write your first — or save a chat from Luna.
          </Text>
        ) : (
          entries.map((e) => {
            const open = expanded === e.id;
            const date = new Date(e.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const meta = SOURCE_META[e.source] ?? SOURCE_META.manual;
            const heading = e.title ?? `${date}: ${e.body.split('\n')[0].slice(0, 40)}`;
            return (
              <Pressable key={e.id} onPress={() => setExpanded(open ? null : e.id)}>
                <Card variant="outline" style={styles.journal}>
                  <View style={styles.journalHeader}>
                    <View style={[styles.journalIcon, { backgroundColor: c.surfaceAlt }]}>
                      <Ionicons name={meta.icon as never} size={16} color={c.green} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={[styles.journalTitle, { color: c.text }]} numberOfLines={open ? undefined : 1}>
                        {heading}
                      </Text>
                      <Text style={[styles.journalSub, { color: c.textTertiary }]}>
                        {meta.label} · {date}
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
            {step === 'write' ? (
              <>
                <Text style={[styles.sheetTitle, { color: c.text }]}>New diary entry</Text>

                <Text style={[styles.fieldLabel, { color: c.textTertiary }]}>HOW ARE YOU FEELING?</Text>
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
                          size={28}
                          color={sel ? m.color : c.textTertiary}
                        />
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={[styles.fieldLabel, { color: c.textTertiary }]}>YOUR THOUGHTS</Text>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder="Jot down whatever's on your mind — messy is fine…"
                  placeholderTextColor={c.textTertiary}
                  multiline
                  style={[styles.composerInput, { color: c.text, backgroundColor: c.surfaceAlt }]}
                />

                {error ? <Text style={[styles.errorText, { color: '#C2545A' }]}>{error}</Text> : null}

                <Pressable
                  onPress={turnIntoJournal}
                  disabled={!draft.trim() || generating}
                  style={[styles.saveBtn, { backgroundColor: draft.trim() && !generating ? c.green : c.surfaceAlt }]}>
                  {generating ? (
                    <View style={styles.btnRow}>
                      <ActivityIndicator size="small" color={c.accentText} />
                      <Text style={[styles.saveText, { color: c.accentText }]}>Writing your entry…</Text>
                    </View>
                  ) : (
                    <View style={styles.btnRow}>
                      <Ionicons name="sparkles" size={16} color={draft.trim() ? c.accentText : c.textTertiary} />
                      <Text style={[styles.saveText, { color: draft.trim() ? c.accentText : c.textTertiary }]}>
                        Turn into a diary entry
                      </Text>
                    </View>
                  )}
                </Pressable>

                <Pressable onPress={saveRaw} disabled={!draft.trim() || generating} style={styles.linkBtn}>
                  <Text style={[styles.linkText, { color: c.textTertiary }]}>Save my notes as-is</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={[styles.sheetTitle, { color: c.text }]}>Your entry</Text>
                <Text style={[styles.fieldLabel, { color: c.textTertiary }]}>TITLE</Text>
                <TextInput
                  value={aiTitle}
                  onChangeText={setAiTitle}
                  style={[styles.titleInput, { color: c.text, backgroundColor: c.surfaceAlt }]}
                />
                <Text style={[styles.fieldLabel, { color: c.textTertiary }]}>ENTRY (edit freely)</Text>
                <TextInput
                  value={aiBody}
                  onChangeText={setAiBody}
                  multiline
                  style={[styles.composerInput, { color: c.text, backgroundColor: c.surfaceAlt }]}
                />
                <Pressable onPress={saveAi} style={[styles.saveBtn, { backgroundColor: c.green }]}>
                  <Text style={[styles.saveText, { color: c.accentText }]}>Save to my diary</Text>
                </Pressable>
                <View style={styles.previewActions}>
                  <Pressable onPress={() => setStep('write')} style={styles.linkBtn}>
                    <Text style={[styles.linkText, { color: c.textTertiary }]}>← Back to notes</Text>
                  </Pressable>
                  <Pressable onPress={turnIntoJournal} disabled={generating} style={styles.linkBtn}>
                    <Text style={[styles.linkText, { color: c.green }]}>
                      {generating ? 'Rewriting…' : '↻ Rewrite'}
                    </Text>
                  </Pressable>
                </View>
              </>
            )}
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
  newEntryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  newEntryText: { fontSize: 14, fontWeight: '500', flex: 1 },
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
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  sheetTitle: { fontSize: 20, fontFamily: fonts.serif, marginBottom: spacing.xs },
  fieldLabel: { fontSize: 12, letterSpacing: 1, marginTop: spacing.sm },
  moodRow: { flexDirection: 'row', gap: spacing.xs },
  moodItem: { padding: spacing.sm, borderRadius: radius.pill },
  composerInput: {
    minHeight: 120,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    lineHeight: 23,
    textAlignVertical: 'top',
  },
  titleInput: { borderRadius: radius.md, padding: spacing.md, fontSize: 16 },
  errorText: { fontSize: 13, marginTop: spacing.xs },
  btnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  saveBtn: { borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  saveText: { fontSize: 15, fontWeight: '600' },
  linkBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  linkText: { fontSize: 14, fontWeight: '500' },
  previewActions: { flexDirection: 'row', justifyContent: 'space-between' },
});
