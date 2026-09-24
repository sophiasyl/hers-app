// The companion peeking in now and then while you use the app — a small,
// gentle surprise. Slides up from the corner every few minutes, says a tiny
// line, and if you tap it you find a treat (+energy). Auto-dismisses.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePet } from '@/lib/pet';
import { petEmoji, useSession } from '@/lib/session';
import { radius, spacing, useTheme } from '@/lib/theme';

const LINES = [
  '*peeks in* hi!',
  'Mrrp! 🐾',
  'thinking of you',
  'psst… got a treat?',
  'just checking on you 💚',
  '*slow blink*',
];

// First appearance is quick-ish so it's discoverable; later ones are spaced out.
const FIRST_DELAY = 25_000;
const MIN_GAP = 150_000; // ~2.5 min
const MAX_GAP = 300_000; // ~5 min
const VISIBLE_MS = 6000;

const TREAT = 3;

export function CatPopIn() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { collectTreat } = usePet();
  const { profile } = useSession();

  const [visible, setVisible] = useState(false);
  const [line, setLine] = useState(LINES[0]);
  const [caught, setCaught] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appearRef = useRef<() => void>(() => {});

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(
      () => setVisible(false),
    );
    // Schedule the next appearance (via ref to avoid a definition cycle).
    const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
    showTimer.current = setTimeout(() => appearRef.current(), gap);
  }, [anim]);

  const appear = useCallback(() => {
    setLine(LINES[Math.floor(Math.random() * LINES.length)]);
    setCaught(false);
    setVisible(true);
    Animated.timing(anim, {
      toValue: 1,
      duration: 320,
      easing: Easing.out(Easing.back(1.4)),
      useNativeDriver: false,
    }).start();
    hideTimer.current = setTimeout(() => hide(), VISIBLE_MS);
  }, [anim, hide]);

  useEffect(() => {
    appearRef.current = appear;
  }, [appear]);

  useEffect(() => {
    showTimer.current = setTimeout(() => appearRef.current(), FIRST_DELAY);
    return () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const onTap = () => {
    if (!caught) {
      collectTreat(TREAT);
      setCaught(true);
    }
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => hide(), 900);
  };

  if (!visible) return null;

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [120, 0] });

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        { bottom: insets.bottom + 78, opacity: anim, transform: [{ translateY }] },
      ]}>
      <Pressable
        onPress={onTap}
        accessibilityRole="button"
        accessibilityLabel="Your companion is peeking in"
        style={[styles.bubble, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Text style={styles.emoji}>{petEmoji(profile.pet?.key)}</Text>
        <View style={styles.textWrap}>
          <Text style={[styles.name, { color: c.text }]} numberOfLines={1}>
            {profile.pet?.name || 'Your cat'}
          </Text>
          <Text style={[styles.line, { color: c.textSecondary }]} numberOfLines={1}>
            {caught ? `+${TREAT} ⚡ treat!` : line}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: spacing.lg, zIndex: 50 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    maxWidth: 220,
    boxShadow: '0 6px 20px rgba(0,0,0,0.14)',
  },
  emoji: { fontSize: 30 },
  textWrap: { flexShrink: 1 },
  name: { fontSize: 13, fontWeight: '600' },
  line: { fontSize: 13, marginTop: 1 },
});
