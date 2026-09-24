import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useState } from 'react';
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
import { LESSONS, lessonIndexForTime } from '@/lib/content';
import { useCycle } from '@/lib/cycle';
import { useEntries, type Entry } from '@/lib/entries';
import { polishJournal } from '@/lib/journal';
import { ACCESSORIES, FOODS, foodByKey, usePet } from '@/lib/pet';
import { petEmoji, useSession } from '@/lib/session';
import { useVoiceRecorder } from '@/lib/voice';
import { fonts, MOODS, moodByKey, radius, spacing, useTheme, type MoodKey } from '@/lib/theme';

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
  const petName = pet?.name ?? 'Your companion';
  const petState = usePet();
  const [expanded, setExpanded] = useState<string | null>(null);

  // Companion shop / feeding
  const [shopOpen, setShopOpen] = useState(false);
  const [feedOpen, setFeedOpen] = useState(false);
  const ownedFoods = FOODS.filter((f) => (petState.inventory[f.key] ?? 0) > 0);

  // Journal composer
  const [composer, setComposer] = useState(false);
  const [step, setStep] = useState<'write' | 'preview'>('write');
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState<MoodKey | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiTitle, setAiTitle] = useState('');
  const [aiBody, setAiBody] = useState('');

  // Voice → text: a spoken note gets transcribed and appended into the draft,
  // then flows through the same "turn into a diary entry" step as typing.
  const voice = useVoiceRecorder((text) => {
    setDraft((d) => {
      const trimmed = d.trim();
      return trimmed ? `${trimmed} ${text}` : text;
    });
    setError(null);
  });

  // Daily Lesson rotates through the library — a different one every few hours.
  const [lessonIdx, setLessonIdx] = useState(() => lessonIndexForTime(Date.now()));
  const [lessonReader, setLessonReader] = useState(false);
  const lesson = LESSONS[lessonIdx] ?? LESSONS[0];
  const nextLesson = () => setLessonIdx((i) => (i + 1) % LESSONS.length);

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

  const closeComposer = () => {
    voice.cancel();
    setComposer(false);
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

        <Card variant="green" style={styles.petCard}>
          <View style={styles.petTop}>
            <Text style={[styles.petEmoji, { fontSize: 40 + Math.min(petState.level, 8) * 3 }]}>
              {petEmoji(pet?.key)}
            </Text>
            <View style={styles.flex}>
              <Text style={[styles.seedTitle, { color: c.accentText }]}>{petName}</Text>
              <Text style={[styles.seedMeta, { color: c.accentText }]}>
                {petState.mood.label} · Level {petState.level}
              </Text>
            </View>
            <View style={styles.energyPill}>
              <Text style={[styles.energyText, { color: c.accentText }]}>⚡ {petState.energy}</Text>
            </View>
          </View>

          <Text style={[styles.seedMsg, { color: c.accentText }]}>{petState.mood.message}</Text>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: c.accentText }]}>Happiness</Text>
            <Text style={[styles.statLabel, { color: c.accentText }]}>{petState.happiness}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <View style={[styles.progressFill, { width: `${petState.happiness}%`, backgroundColor: c.tan }]} />
          </View>

          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: c.accentText }]}>Level {petState.level}</Text>
            <Text style={[styles.statLabel, { color: c.accentText }]}>
              {petState.maxLevel ? 'Max level' : `${petState.toNext} XP to level up`}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <View
              style={[styles.progressFill, { width: `${Math.round(petState.levelPct * 100)}%`, backgroundColor: '#FFFFFF' }]}
            />
          </View>

          {petState.flash ? <Text style={[styles.flash, { color: c.accentText }]}>{petState.flash}</Text> : null}

          <View style={styles.careRow}>
            <Pressable
              style={styles.careBtn}
              onPress={() => (ownedFoods.length ? setFeedOpen(true) : setShopOpen(true))}
              accessibilityLabel="Feed your cat">
              <Text style={styles.careEmoji}>🍽️</Text>
              <Text style={[styles.careLabel, { color: c.accentText }]}>Feed</Text>
            </Pressable>
            <Pressable style={styles.careBtn} onPress={petState.pet} accessibilityLabel="Pet your cat">
              <Text style={styles.careEmoji}>🐾</Text>
              <Text style={[styles.careLabel, { color: c.accentText }]}>Pet {petState.petsLeft ? `(${petState.petsLeft})` : ''}</Text>
            </Pressable>
            <Pressable style={styles.careBtn} onPress={petState.play} accessibilityLabel="Play with your cat">
              <Text style={styles.careEmoji}>🧶</Text>
              <Text style={[styles.careLabel, { color: c.accentText }]}>Play {petState.playsLeft ? `(${petState.playsLeft})` : ''}</Text>
            </Pressable>
            <Pressable style={styles.careBtn} onPress={() => setShopOpen(true)} accessibilityLabel="Open cat shop">
              <Text style={styles.careEmoji}>🛒</Text>
              <Text style={[styles.careLabel, { color: c.accentText }]}>Shop</Text>
            </Pressable>
          </View>
        </Card>

        <View style={styles.accRow}>
          {ACCESSORIES.map((a) => {
            const got = petState.unlocked.includes(a.key);
            return (
              <View key={a.key} style={[styles.accChip, { backgroundColor: got ? c.greenSoft : c.surfaceAlt }]}>
                <Text style={[styles.accEmoji, !got && styles.accLocked]}>{a.emoji}</Text>
                <Text style={[styles.accLabel, { color: got ? c.green : c.textTertiary }]}>
                  {got ? a.label : `Lv ${a.level}`}
                </Text>
              </View>
            );
          })}
        </View>

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

        <View style={[styles.sectionRow, styles.topGap]}>
          <SectionTitle style={styles.noMargin}>Daily Lesson</SectionTitle>
          <Pressable onPress={nextLesson} style={styles.nextBtn} accessibilityLabel="Next lesson">
            <Ionicons name="refresh" size={14} color={c.green} />
            <Text style={[styles.nextText, { color: c.green }]}>Next</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => setLessonReader(true)}
          style={[styles.lessonCard, { backgroundColor: lesson.accent }]}
          accessibilityRole="button"
          accessibilityLabel={`Read lesson: ${lesson.title}`}>
          {lesson.image ? (
            <Image source={{ uri: lesson.image }} style={styles.lessonImage} contentFit="cover" transition={200} />
          ) : null}
          <View style={styles.lessonOverlay}>
            <Text style={styles.lessonTitle}>{lesson.title}</Text>
            <Text style={styles.lessonSub}>{lesson.subtitle}</Text>
            <Text style={styles.lessonHint}>Tap to read →</Text>
          </View>
        </Pressable>
      </ScrollView>

      <Modal visible={composer} transparent animationType="slide" onRequestClose={closeComposer}>
        <Pressable style={styles.backdrop} onPress={closeComposer}>
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

                <View style={styles.fieldRow}>
                  <Text style={[styles.fieldLabel, styles.fieldLabelInRow, { color: c.textTertiary }]}>
                    YOUR THOUGHTS
                  </Text>
                  {voice.supported ? (
                    <Pressable
                      onPress={voice.toggle}
                      disabled={voice.state === 'transcribing'}
                      accessibilityLabel={voice.state === 'recording' ? 'Stop recording' : 'Record a voice note'}
                      style={[
                        styles.micBtn,
                        {
                          backgroundColor:
                            voice.state === 'recording' ? '#C2545A' : c.greenSoft,
                        },
                      ]}>
                      {voice.state === 'transcribing' ? (
                        <>
                          <ActivityIndicator size="small" color={c.green} />
                          <Text style={[styles.micText, { color: c.green }]}>Transcribing…</Text>
                        </>
                      ) : voice.state === 'recording' ? (
                        <>
                          <Ionicons name="stop" size={13} color="#FFFFFF" />
                          <Text style={[styles.micText, { color: '#FFFFFF' }]}>Tap to stop</Text>
                        </>
                      ) : (
                        <>
                          <Ionicons name="mic" size={14} color={c.green} />
                          <Text style={[styles.micText, { color: c.green }]}>Speak</Text>
                        </>
                      )}
                    </Pressable>
                  ) : null}
                </View>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  placeholder={
                    voice.supported
                      ? "Jot down what's on your mind — or tap Speak to say it aloud…"
                      : "Jot down whatever's on your mind — messy is fine…"
                  }
                  placeholderTextColor={c.textTertiary}
                  multiline
                  style={[styles.composerInput, { color: c.text, backgroundColor: c.surfaceAlt }]}
                />

                {voice.error ? <Text style={[styles.errorText, { color: '#C2545A' }]}>{voice.error}</Text> : null}
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

      <Modal visible={lessonReader} transparent animationType="slide" onRequestClose={() => setLessonReader(false)}>
        <Pressable style={styles.backdrop} onPress={() => setLessonReader(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <View style={[styles.readerBadge, { backgroundColor: lesson.accent }]}>
              <Text style={styles.readerBadgeText}>LESSON</Text>
            </View>
            <Text style={[styles.readerTitle, { color: c.text }]}>{lesson.title}</Text>
            <Text style={[styles.readerSub, { color: c.textTertiary }]}>{lesson.subtitle}</Text>
            <Text style={[styles.readerBody, { color: c.textSecondary }]}>{lesson.body}</Text>
            <Pressable onPress={nextLesson} style={[styles.saveBtn, { backgroundColor: c.green }]}>
              <Text style={[styles.saveText, { color: c.accentText }]}>Next lesson</Text>
            </Pressable>
            <Pressable onPress={() => setLessonReader(false)} style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: c.textTertiary }]}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={shopOpen} transparent animationType="slide" onRequestClose={() => setShopOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setShopOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <View style={styles.shopHeader}>
              <Text style={[styles.sheetTitle, { color: c.text }]}>Cat shop</Text>
              <Text style={[styles.energyBadge, { color: c.green, backgroundColor: c.greenSoft }]}>
                ⚡ {petState.energy}
              </Text>
            </View>
            <Text style={[styles.shopHint, { color: c.textTertiary }]}>
              Earn energy by logging your cycle, mood, symptoms or meds — or writing your diary.
            </Text>
            {petState.flash ? <Text style={[styles.feedFlash, { color: c.green }]}>{petState.flash}</Text> : null}
            {FOODS.map((f) => {
              const owned = petState.inventory[f.key] ?? 0;
              const canBuy = petState.energy >= f.cost;
              return (
                <View key={f.key} style={[styles.shopItem, { borderColor: c.border }]}>
                  <Text style={styles.shopEmoji}>{f.emoji}</Text>
                  <View style={styles.flex}>
                    <Text style={[styles.shopName, { color: c.text }]}>
                      {f.label}
                      {owned ? `  ×${owned}` : ''}
                    </Text>
                    <Text style={[styles.shopMeta, { color: c.textTertiary }]}>
                      +{f.happiness} happiness · +{f.xp} XP
                    </Text>
                  </View>
                  <Pressable
                    disabled={!canBuy}
                    onPress={() => petState.buyFood(f.key)}
                    style={[styles.buyBtn, { backgroundColor: canBuy ? c.green : c.surfaceAlt }]}>
                    <Text style={[styles.buyText, { color: canBuy ? c.accentText : c.textTertiary }]}>⚡ {f.cost}</Text>
                  </Pressable>
                </View>
              );
            })}
            <Pressable onPress={() => setShopOpen(false)} style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: c.textTertiary }]}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={feedOpen} transparent animationType="slide" onRequestClose={() => setFeedOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setFeedOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Feed {petName}</Text>
            {petState.flash ? <Text style={[styles.feedFlash, { color: c.green }]}>{petState.flash}</Text> : null}
            {FOODS.filter((f) => (petState.inventory[f.key] ?? 0) > 0).length === 0 ? (
              <>
                <Text style={[styles.shopHint, { color: c.textTertiary }]}>
                  No food yet — pop into the shop to buy some.
                </Text>
                <Pressable
                  onPress={() => {
                    setFeedOpen(false);
                    setShopOpen(true);
                  }}
                  style={[styles.saveBtn, { backgroundColor: c.green }]}>
                  <Text style={[styles.saveText, { color: c.accentText }]}>Open shop</Text>
                </Pressable>
              </>
            ) : (
              FOODS.filter((f) => (petState.inventory[f.key] ?? 0) > 0).map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => petState.feed(f.key)}
                  style={[styles.shopItem, { borderColor: c.border }]}>
                  <Text style={styles.shopEmoji}>{f.emoji}</Text>
                  <View style={styles.flex}>
                    <Text style={[styles.shopName, { color: c.text }]}>
                      {f.label} ×{petState.inventory[f.key]}
                    </Text>
                    <Text style={[styles.shopMeta, { color: c.textTertiary }]}>
                      +{f.happiness} happiness · +{f.xp} XP
                    </Text>
                  </View>
                  <Text style={[styles.buyText, { color: c.green }]}>Feed →</Text>
                </Pressable>
              ))
            )}
            <Pressable onPress={() => setFeedOpen(false)} style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: c.textTertiary }]}>Done</Text>
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
  petCard: { gap: spacing.xs },
  petTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  petEmoji: { textAlign: 'center' },
  seedTitle: { fontSize: 16, fontWeight: '500' },
  seedMeta: { fontSize: 13, opacity: 0.85, marginTop: 2 },
  seedMsg: { fontSize: 13, opacity: 0.95, lineHeight: 19, marginTop: 4, marginBottom: spacing.xs },
  energyPill: {
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  energyText: { fontSize: 14, fontWeight: '700' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: 4 },
  statLabel: { fontSize: 11, opacity: 0.9, fontWeight: '600' },
  progressTrack: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: radius.pill },
  flash: { fontSize: 13, fontWeight: '600', marginTop: spacing.sm, opacity: 0.95 },
  careRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  careBtn: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  careEmoji: { fontSize: 20 },
  careLabel: { fontSize: 11, fontWeight: '600' },
  accRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  accChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  accEmoji: { fontSize: 15 },
  accLocked: { opacity: 0.35 },
  accLabel: { fontSize: 11, fontWeight: '600' },
  shopHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  energyBadge: {
    fontSize: 14,
    fontWeight: '700',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    overflow: 'hidden',
  },
  shopHint: { fontSize: 13, lineHeight: 19, marginTop: spacing.xs, marginBottom: spacing.sm },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  shopEmoji: { fontSize: 26 },
  shopName: { fontSize: 15, fontWeight: '500' },
  shopMeta: { fontSize: 12, marginTop: 2 },
  buyBtn: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  buyText: { fontSize: 14, fontWeight: '700' },
  feedFlash: { fontSize: 13, fontWeight: '600', marginBottom: spacing.sm },
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
  lessonHint: { fontSize: 12, color: '#F0EFE6', opacity: 0.85, marginTop: spacing.sm, fontWeight: '600' },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  nextText: { fontSize: 13, fontWeight: '500' },
  readerBadge: { alignSelf: 'flex-start', borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  readerBadgeText: { fontSize: 10, letterSpacing: 1, fontWeight: '700', color: '#FFFFFF' },
  readerTitle: { fontSize: 22, fontFamily: fonts.serif, marginTop: spacing.sm },
  readerSub: { fontSize: 13, marginTop: 2 },
  readerBody: { fontSize: 15, lineHeight: 23, marginTop: spacing.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, gap: spacing.sm },
  sheetTitle: { fontSize: 20, fontFamily: fonts.serif, marginBottom: spacing.xs },
  fieldLabel: { fontSize: 12, letterSpacing: 1, marginTop: spacing.sm },
  fieldLabelInRow: { marginTop: 0 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
  },
  micBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  micText: { fontSize: 12, fontWeight: '600' },
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
