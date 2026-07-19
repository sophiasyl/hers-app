import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import {
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
import { useCycle } from '@/lib/cycle';
import { useEntries } from '@/lib/entries';
import { radius, spacing, useTheme } from '@/lib/theme';

interface Message {
  id: string;
  role: 'luna' | 'user';
  text: string;
}

const PHASE_TIP: Record<string, string> = {
  MENSTRUAL: 'rest and warmth are genuinely your allies right now',
  FOLLICULAR: 'your rising estrogen is fueling focus and confidence',
  OVULATORY: "you're at a natural peak for energy and connection",
  LUTEAL: 'slowing down and protecting your sleep will help most',
};

export default function LunaScreen() {
  const c = useTheme();
  const { today } = useCycle();
  const { addEntry } = useEntries();
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<Message[]>([
    { id: 'm1', role: 'luna', text: "Welcome back. I'm Luna, your personal guide. How are you holding up today?" },
    {
      id: 'm2',
      role: 'user',
      text: "I'm feeling much better, but still a little anxious about tomorrow's presentation.",
    },
    {
      id: 'm3',
      role: 'luna',
      text: `It's completely normal to feel that way on Day ${today.day}. Your rising hormones can heighten your sensory focus. Shall we turn our conversation into a journal entry?`,
    },
  ]);
  const [draft, setDraft] = useState('');
  const [saved, setSaved] = useState(false);

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    const userMsg: Message = { id: `u${Date.now()}`, role: 'user', text };
    const tip = PHASE_TIP[today.content.label] ?? 'taking it one step at a time will help';
    const reply: Message = {
      id: `l${Date.now()}`,
      role: 'luna',
      text: `Thank you for sharing that. In your ${today.content.label.toLowerCase()} phase, ${tip}. Would you like to turn this into a journal entry?`,
    };
    setMessages((prev) => [...prev, userMsg, reply]);
    setDraft('');
    setSaved(false);
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  };

  const convert = () => {
    const body = messages
      .map((m) => `${m.role === 'luna' ? 'Luna' : 'Me'}: ${m.text}`)
      .join('\n\n');
    const date = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    addEntry({ body, source: 'luna', title: `Chat with Luna · ${date}`, tags: [today.content.label.toLowerCase()] });
    setSaved(true);
  };

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
                m.role === 'luna'
                  ? { backgroundColor: c.surfaceAlt, alignSelf: 'flex-start', borderBottomLeftRadius: radius.sm }
                  : { backgroundColor: c.tanSoft, alignSelf: 'flex-end', borderBottomRightRadius: radius.sm },
              ]}>
              <Text style={[styles.bubbleText, { color: c.text }]}>{m.text}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.footer}>
          {saved ? (
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
                  Save today's conversation with Luna
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.accentText} />
            </Pressable>
          )}

          <View style={[styles.inputBar, { backgroundColor: c.surfaceAlt }]}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="Chat with Luna…"
              placeholderTextColor={c.textTertiary}
              style={[styles.input, { color: c.text }]}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <Pressable onPress={send} style={[styles.sendBtn, { backgroundColor: c.tan }]} accessibilityLabel="Send">
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
