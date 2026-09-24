// The companion peeking in now and then while you use the app — a small,
// gentle surprise. Slides up from the corner, says a tiny line, and if you tap
// it you find a treat (+energy). Auto-dismisses.
//
// How often it appears is controlled by the "Companion" scale in Settings
// (catLevel 0 off · 1 gentle · 2 balanced · 3 playful). Changing the scale
// makes the cat peek in almost immediately, as a live preview.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { usePet } from '@/lib/pet';
import { petEmoji, useSession } from '@/lib/session';
import { useSettings } from '@/lib/settings';
import { radius, spacing, useTheme } from '@/lib/theme';

const LINES = [
  '*peeks in* hi!',
  'Mrrp! 🐾',
  'thinking of you',
  'psst… got a treat?',
  'just checking on you 💚',
  '*slow blink*',
];

// Per interactivity level: how soon the first peek, and the gap between peeks.
function timingFor(level: number): { first: number; min: number; max: number } {
  if (level >= 3) return { first: 8000, min: 45_000, max: 90_000 }; // playful
  if (level === 2) return { first: 18_000, min: 150_000, max: 300_000 }; // balanced
  return { first: 35_000, min: 360_000, max: 600_000 }; // gentle
}

const PREVIEW_DELAY = 1600; // quick peek right after you change the scale
const VISIBLE_MS = 6000;
const TREAT = 3;

export function CatPopIn() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { collectTreat } = usePet();
  const { profile } = useSession();
  const { catLevel } = useSettings();

  const [visible, setVisible] = useState(false);
  const [line, setLine] = useState(LINES[0]);
  const [caught, setCaught] = useState(false);

  const anim = useRef(new Animated.Value(0)).current;
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appearRef = useRef<() => void>(() => {});
  const gapRef = useRef(timingFor(2));
  const firstRun = useRef(true);

  const hide = useCallback(() => {
    Animated.timing(anim, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: false }).start(
      () => setVisible(false),
    );
    // Schedule the next appearance (via ref to avoid a definition cycle).
    const g = gapRef.current;
    const gap = g.min + Math.random() * (g.max - g.min);
    showTimer.current = setTimeout(() => appearRef.current(), gap);
  }, [anim]);

  const appear = useCallback(() => {
    setLine(LINES[Math.floor(Math.random() * LINES.length)]);
    setCaught(false);
    setVisible(true);
    anim.setValue(0);
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

  // (Re)schedule whenever the interactivity level changes.
  useEffect(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    if (hideTimer.current) clearTimeout(hideTimer.current);

    if (catLevel <= 0) {
      // Off: hide anything showing and schedule nothing.
      anim.setValue(0);
      setVisible(false);
      firstRun.current = false;
      return;
    }

    gapRef.current = timingFor(catLevel);
    // On first mount honour the level's first-delay; when the user changes the
    // scale, peek almost immediately so they see the effect.
    const delay = firstRun.current ? gapRef.current.first : PREVIEW_DELAY;
    firstRun.current = false;
    showTimer.current = setTimeout(() => appearRef.current(), delay);

    return () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [catLevel, anim]);

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
      style={[styles.wrap, { bottom: insets.bottom + 78, opacity: anim, transform: [{ translateY }] }]}>
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
