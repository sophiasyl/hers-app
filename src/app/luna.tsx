import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/ui';
import { useCycle, type FlowLevel } from '@/lib/cycle';
import { useEntries, type Entry } from '@/lib/entries';
import { dayKey } from '@/lib/format';
import { polishJournal } from '@/lib/journal';
import { LUNA_GREETING, sendToLuna, startChat, type LunaMessage } from '@/lib/luna';
import { useMedication } from '@/lib/medication';
import { useSession } from '@/lib/session';
import { fonts, moodByKey, radius, spacing, useTheme, type MoodKey } from '@/lib/theme';
import { useWellness, type DailyLog } from '@/lib/wellness';

const DAY_MS = 86400000;

// A compact, human-readable digest of the last few days of logging, handed to
// Luna so her replies are grounded in what the user actually recorded.
function buildRecentLogs(
  flowLogs: Record<string, FlowLevel>,
  wellnessLogs: Record<string, DailyLog>,
  medLogs: Record<string, string[]>,
): string {
  const lines: string[] = [];
  for (let i = 0; i < 5; i++) {
    const k = dayKey(Date.now() - i * DAY_MS);
    const flow = flowLogs[k];
    const w = wellnessLogs[k];
    const meds = medLogs[k];
    const parts: string[] = [];
    if (flow) parts.push(`${flow} flow`);
    if (w?.mood) parts.push(`mood ${(moodByKey(w.mood as MoodKey)?.label ?? w.mood).toLowerCase()}`);
    if (w?.symptoms?.length) parts.push(`symptoms ${w.symptoms.join(', ').toLowerCase()}`);
    if (meds?.length) parts.push(`took ${meds.join(', ').toLowerCase()}`);
    if (parts.length) {
      const label = i === 0 ? 'Today' : i === 1 ? 'Yesterday' : `${i} days ago`;
      lines.push(`${label}: ${parts.join('; ')}`);
    }
  }
  return lines.join('\n');
}

function dayFromKey(k: string): number {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m, d).getTime();
}

// Recent diary entries, so Luna can answer questions about the user's past.
function buildJournalContext(entries: Entry[]): string {
  if (!entries.length) return '';
  const lines = entries.slice(0, 10).map((e) => {
    const d = new Date(e.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const title = e.title ? `${e.title} — ` : '';
    return `${d}: ${title}${e.body.replace(/\s+/g, ' ').slice(0, 220)}`;
  });
  return lines.join('\n').slice(0, 2500);
}

// Cross-cycle symptom/mood patterns grouped by phase.
function buildPatternContext(
  wellnessLogs: Record<string, DailyLog>,
  phaseFor: (ms: number) => string,
): string {
  const order = ['menstrual', 'follicular', 'ovulatory', 'luteal'];
  const tally: Record<string, { symptoms: Record<string, number>; moods: Record<string, number> }> = {};
  for (const [k, w] of Object.entries(wellnessLogs)) {
    const phase = phaseFor(dayFromKey(k));
    const t = (tally[phase] ??= { symptoms: {}, moods: {} });
    (w.symptoms ?? []).forEach((s) => (t.symptoms[s] = (t.symptoms[s] ?? 0) + 1));
    if (w.mood) t.moods[w.mood] = (t.moods[w.mood] ?? 0) + 1;
  }
  const parts: string[] = [];
  for (const p of order) {
    const t = tally[p];
    if (!t) continue;
    const topSym = Object.entries(t.symptoms)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([s]) => s.toLowerCase());
    const topMoodKey = Object.entries(t.moods).sort((a, b) => b[1] - a[1])[0]?.[0];
    const bits: string[] = [];
    if (topSym.length) bits.push(`often ${topSym.join(' & ')}`);
    if (topMoodKey) bits.push(`mood usually ${moodByKey(topMoodKey as MoodKey)?.label.toLowerCase() ?? topMoodKey}`);
    if (bits.length) parts.push(`${p[0].toUpperCase()}${p.slice(1)}: ${bits.join('; ')}`);
  }
  return parts.join('\n');
}

const SUGGESTION_CHIPS = [
  'What helped my symptoms last time?',
  'How was my last luteal phase?',
  'Any patterns you notice in me?',
];

const GREETING_ID = 'greeting';

function greetingMsg(): LunaMessage {
  return { id: GREETING_ID, role: 'assistant', content: LUNA_GREETING, createdAt: 0 };
}

function makeMsg(role: LunaMessage['role'], content: string): LunaMessage {
  return { id: `${role[0]}${Date.now()}${Math.round(Math.random() * 1e6)}`, role, content, createdAt: Date.now() };
}

export default function LunaScreen() {
  const c = useTheme();
  const { today, flowLogs, phaseFor } = useCycle();
  const { addEntry, entries } = useEntries();
  const { logs: wellnessLogs } = useWellness();
  const { logs: medLogs } = useMedication();
  const { userId, profile } = useSession();
  const scrollRef = useRef<ScrollView>(null);

  // Each visit is a fresh chat: state resets to just the greeting on every mount.
  const [messages, setMessages] = useState<LunaMessage[]>(() => [greetingMsg()]);
  const [chatId, setChatId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [saved, setSaved] = useState(false);

  // Turn-chat-into-diary flow
  const [converting, setConverting] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [aiTitle, setAiTitle] = useState('');
  const [aiBody, setAiBody] = useState('');

  const scrollDown = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  const send = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || sending || !userId) return;

    const userMsg = makeMsg('user', text);
    const next = [...messages, userMsg];
    setMessages(next);
    setDraft('');
    setSaved(false);
    setSending(true);
    scrollDown();

    // Create the chat lazily on the first message so empty visits don't clutter
    // history (and prior-chat memory).
    let id = chatId;
    if (!id) {
      id = await startChat(userId);
      setChatId(id);
    }
    if (!id) {
      setMessages((prev) => [...prev, makeMsg('assistant', "I couldn't start our chat just now. Please try again.")]);
      setSending(false);
      return;
    }

    // Claude gets the real exchanges only — drop the local greeting so the
    // message list starts with a user turn.
    const history = next.filter((m) => m.id !== GREETING_ID);
    const result = await sendToLuna({
      userId,
      chatId: id,
      history,
      context: {
        name: profile.name || undefined,
        petName: profile.pet?.name || undefined,
        phase: today.content.label,
        day: today.day,
        daysUntilNextPeriod: today.daysUntilNextPeriod,
        recentLogs: buildRecentLogs(flowLogs, wellnessLogs, medLogs) || undefined,
        journalContext: buildJournalContext(entries) || undefined,
        patternContext: buildPatternContext(wellnessLogs, phaseFor) || undefined,
      },
    });

    setMessages((prev) => [
      ...prev,
      makeMsg('assistant', 'reply' in result ? result.reply : result.error),
    ]);
    setSending(false);
    scrollDown();
  };

  const convert = async () => {
    const real = messages.filter((m) => m.id !== GREETING_ID);
    if (!real.length || converting) return;
    const transcript = real
      .map((m) => `${m.role === 'assistant' ? 'Luna' : 'Me'}: ${m.content}`)
      .join('\n\n');
    setConverting(true);
    setConvertError(null);
    const res = await polishJournal({
      text: transcript,
      kind: 'conversation',
      phase: today.content.label,
      day: today.day,
    });
    setConverting(false);
    if ('error' in res) {
      setConvertError(res.error);
      return;
    }
    setAiTitle(res.title);
    setAiBody(res.body);
    setPreviewOpen(true);
  };

  const saveDiary = () => {
    const bodyText = aiBody.trim();
    if (!bodyText) return;
    addEntry({
      body: bodyText,
      title: aiTitle.trim() || undefined,
      source: 'luna',
      tags: [today.content.label.toLowerCase()],
    });
    setPreviewOpen(false);
    setSaved(true);
  };

  const hasConversation = messages.some((m) => m.role === 'user');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.headerWrap}>
          <ScreenHeader title="Luna AI Companion" />
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}>
          {messages.map((m) => (
            <View
              key={m.id}
              style={[
                styles.bubble,
                m.role === 'assistant'
                  ? { backgroundColor: c.surfaceAlt, alignSelf: 'flex-start', borderBottomLeftRadius: radius.sm }
                  : { backgroundColor: c.tanSoft, alignSelf: 'flex-end', borderBottomRightRadius: radius.sm },
              ]}>
              <Text style={[styles.bubbleText, { color: c.text }]}>{m.content}</Text>
            </View>
          ))}
          {sending && (
            <View
              style={[
                styles.bubble,
                styles.typing,
                { backgroundColor: c.surfaceAlt, alignSelf: 'flex-start', borderBottomLeftRadius: radius.sm },
              ]}>
              <ActivityIndicator size="small" color={c.textTertiary} />
              <Text style={[styles.typingText, { color: c.textTertiary }]}>Luna is thinking…</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.footer}>
          {hasConversation &&
            (saved ? (
              <View style={[styles.savedBanner, { backgroundColor: c.greenSoft }]}>
                <Ionicons name="checkmark-circle" size={18} color={c.green} />
                <Text style={[styles.savedText, { color: c.green }]}>Saved to your diary in Learn</Text>
              </View>
            ) : (
              <>
                <Pressable
                  onPress={convert}
                  disabled={converting}
                  accessibilityRole="button"
                  accessibilityLabel="Turn this chat into a diary entry"
                  style={[styles.convert, { backgroundColor: c.green }]}>
                  <View style={styles.flex}>
                    <Text style={[styles.convertTitle, { color: c.accentText }]}>
                      {converting ? 'Writing your entry…' : 'Turn this chat into a diary entry'}
                    </Text>
                    <Text style={[styles.convertSub, { color: c.accentText }]}>
                      Luna writes it up for your Learn diary
                    </Text>
                  </View>
                  {converting ? (
                    <ActivityIndicator size="small" color={c.accentText} />
                  ) : (
                    <Ionicons name="sparkles" size={18} color={c.accentText} />
                  )}
                </Pressable>
                {convertError ? (
                  <Text style={[styles.convertErr, { color: '#C2545A' }]}>{convertError}</Text>
                ) : null}
              </>
            ))}

          {!hasConversation ? (
            <View style={styles.chips}>
              {SUGGESTION_CHIPS.map((chip) => (
                <Pressable
                  key={chip}
                  onPress={() => send(chip)}
                  style={[styles.chip, { backgroundColor: c.surfaceAlt, borderColor: c.border }]}
                  accessibilityRole="button"
                  accessibilityLabel={chip}>
                  <Ionicons name="sparkles-outline" size={12} color={c.green} />
                  <Text style={[styles.chipText, { color: c.text }]}>{chip}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={[styles.inputBar, { backgroundColor: c.surfaceAlt }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Chat with Luna…"
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { color: c.text }]}
              onSubmitEditing={() => send()}
              editable={!sending}
              returnKeyType="send"
            />
            <Pressable
              onPress={() => send()}
              disabled={sending || !draft.trim()}
              style={[styles.sendBtn, { backgroundColor: c.tan, opacity: sending || !draft.trim() ? 0.5 : 1 }]}
              accessibilityLabel="Send">
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <Modal
        visible={previewOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setPreviewOpen(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
            <Text style={[styles.sheetTitle, { color: c.text }]}>Your diary entry</Text>
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
              style={[styles.bodyInput, { color: c.text, backgroundColor: c.surfaceAlt }]}
            />
            <Pressable onPress={saveDiary} style={[styles.diarySave, { backgroundColor: c.green }]}>
              <Text style={[styles.diarySaveText, { color: c.accentText }]}>Save to my diary</Text>
            </Pressable>
            <View style={styles.previewActions}>
              <Pressable onPress={() => setPreviewOpen(false)} style={styles.linkBtn}>
                <Text style={[styles.linkText, { color: c.textTertiary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  setPreviewOpen(false);
                  convert();
                }}
                disabled={converting}
                style={styles.linkBtn}>
                <Text style={[styles.linkText, { color: c.green }]}>↻ Rewrite</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  headerWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  messages: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, gap: spacing.md },
  bubble: { maxWidth: '85%', borderRadius: radius.lg, padding: spacing.md },
  bubbleText: { fontSize: 15, lineHeight: 22 },
  typing: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  typingText: { fontSize: 14 },
  footer: { padding: spacing.lg, gap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  convert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  convertTitle: { fontSize: 15, fontWeight: '500' },
  convertSub: { fontSize: 13, opacity: 0.85, marginTop: 2 },
  savedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  savedText: { fontSize: 14, fontWeight: '500' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingLeft: spacing.lg,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
  },
  input: { flex: 1, fontSize: 15, paddingVertical: spacing.sm },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  convertErr: { fontSize: 13, marginTop: spacing.xs, marginHorizontal: spacing.sm },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  sheetTitle: { fontSize: 20, fontFamily: fonts.serif, marginBottom: spacing.xs },
  fieldLabel: { fontSize: 12, letterSpacing: 1, marginTop: spacing.sm },
  titleInput: { borderRadius: radius.md, padding: spacing.md, fontSize: 16 },
  bodyInput: {
    minHeight: 160,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 16,
    lineHeight: 23,
    textAlignVertical: 'top',
  },
  diarySave: { borderRadius: radius.pill, paddingVertical: spacing.md, alignItems: 'center', marginTop: spacing.sm },
  diarySaveText: { fontSize: 15, fontWeight: '600' },
  previewActions: { flexDirection: 'row', justifyContent: 'space-between' },
  linkBtn: { paddingVertical: spacing.sm, alignItems: 'center' },
  linkText: { fontSize: 14, fontWeight: '500' },
});
