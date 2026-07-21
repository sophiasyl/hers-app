import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
import { useEntries } from '@/lib/entries';
import { dayKey } from '@/lib/format';
import { LUNA_GREETING, sendToLuna, startChat, type LunaMessage } from '@/lib/luna';
import { useMedication } from '@/lib/medication';
import { useSession } from '@/lib/session';
import { moodByKey, radius, spacing, useTheme, type MoodKey } from '@/lib/theme';
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

const GREETING_ID = 'greeting';

function greetingMsg(): LunaMessage {
  return { id: GREETING_ID, role: 'assistant', content: LUNA_GREETING, createdAt: 0 };
}

function makeMsg(role: LunaMessage['role'], content: string): LunaMessage {
  return { id: `${role[0]}${Date.now()}${Math.round(Math.random() * 1e6)}`, role, content, createdAt: Date.now() };
}

export default function LunaScreen() {
  const c = useTheme();
  const { today, flowLogs } = useCycle();
  const { addEntry } = useEntries();
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

  const scrollDown = () =>
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));

  const send = async () => {
    const text = draft.trim();
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
      },
    });

    setMessages((prev) => [
      ...prev,
      makeMsg('assistant', 'reply' in result ? result.reply : result.error),
    ]);
    setSending(false);
    scrollDown();
  };

  const convert = () => {
    const real = messages.filter((m) => m.id !== GREETING_ID);
    if (!real.length) return;
    const body = real
      .map((m) => `${m.role === 'assistant' ? 'Luna' : 'Me'}: ${m.content}`)
      .join('\n\n');
    const date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    addEntry({
      body,
      source: 'luna',
      title: `Chat with Luna · ${date}`,
      tags: [today.content.label.toLowerCase()],
    });
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
                <Text style={[styles.savedText, { color: c.green }]}>Saved to your journal in Learn</Text>
              </View>
            ) : (
              <Pressable
                onPress={convert}
                accessibilityRole="button"
                accessibilityLabel="Convert to Journal"
                style={[styles.convert, { backgroundColor: c.green }]}>
                <View>
                  <Text style={[styles.convertTitle, { color: c.accentText }]}>Convert to Journal</Text>
                  <Text style={[styles.convertSub, { color: c.accentText }]}>
                    Save this conversation with Luna
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={c.accentText} />
              </Pressable>
            ))}

          <View style={[styles.inputBar, { backgroundColor: c.surfaceAlt }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Chat with Luna…"
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { color: c.text }]}
              onSubmitEditing={send}
              editable={!sending}
              returnKeyType="send"
            />
            <Pressable
              onPress={send}
              disabled={sending || !draft.trim()}
              style={[styles.sendBtn, { backgroundColor: c.tan, opacity: sending || !draft.trim() ? 0.5 : 1 }]}
              accessibilityLabel="Send">
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
});
