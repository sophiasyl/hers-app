// The companion peeking in now and then while you use the app — a small,
// gentle surprise. Slides up from the corner, says a tiny line, and if you tap
// it you find a treat (+energy). Auto-dismisses.
//
// How often it appears is controlled by the "Companion" scale in Settings
// (catLevel 0 off · 1 gentle · 2 balanced · 3 playful). Changing the scale
// makes the cat peek in almost immediately, as a live preview.
//
// NOTE: visibility is driven by plain state + a CSS transition (not RN
// Animated), because on react-native-web an Animated opacity animation started
// just before mount can get stuck at 0, leaving the bubble invisible. On web we
// also anchor with position:fixed so it can't land below the fold.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
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
  if (level >= 3) return { first: 6000, min: 45_000, max: 90_000 }; // playful
  if (level === 2) return { first: 15_000, min: 150_000, max: 300_000 }; // balanced
  return { first: 30_000, min: 360_000, max: 600_000 }; // gentle
}

const PREVIEW_DELAY = 1400; // quick peek right after you change the scale
const VISIBLE_MS = 6500;
const EXIT_MS = 300;
const TREAT = 3;

export function CatPopIn() {
  const c = useTheme();
  const insets = useSafeAreaInsets();
  const { collectTreat } = usePet();
  const { profile } = useSession();
  const { catLevel } = useSettings();

  const [mounted, setMounted] = useState(false); // in the DOM
  const [shown, setShown] = useState(false); // slid in (drives the transition)
  const [line, setLine] = useState(LINES[0]);
  const [caught, setCaught] = useState(false);

  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enterTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appearRef = useRef<() => void>(() => {});
  const gapRef = useRef(timingFor(2));
  const firstRun = useRef(true);

  const clearAll = () => {
    for (const t of [showTimer, hideTimer, enterTimer]) if (t.current) clearTimeout(t.current);
  };

  const hide = useCallback(() => {
    setShown(false); // slide/fade out
    hideTimer.current = setTimeout(() => setMounted(false), EXIT_MS);
    // Schedule the next appearance (via ref to avoid a definition cycle).
    const g = gapRef.current;
    const gap = g.min + Math.random() * (g.max - g.min);
    showTimer.current = setTimeout(() => appearRef.current(), gap);
  }, []);

  const appear = useCallback(() => {
    setLine(LINES[Math.floor(Math.random() * LINES.length)]);
    setCaught(false);
    setMounted(true);
    setShown(false);
    enterTimer.current = setTimeout(() => setShown(true), 40); // next tick → slide in
    hideTimer.current = setTimeout(() => hide(), VISIBLE_MS);
  }, [hide]);

  useEffect(() => {
    appearRef.current = appear;
  }, [appear]);

  // (Re)schedule whenever the interactivity level changes.
  useEffect(() => {
    clearAll();
    if (catLevel <= 0) {
      setShown(false);
      setMounted(false);
      firstRun.current = false;
      return;
    }
    gapRef.current = timingFor(catLevel);
    // First mount honours the level's delay; a change peeks in almost at once.
    const delay = firstRun.current ? gapRef.current.first : PREVIEW_DELAY;
    firstRun.current = false;
    showTimer.current = setTimeout(() => appearRef.current(), delay);
    return clearAll;
  }, [catLevel]);

  const onTap = () => {
    if (!caught) {
      collectTreat(TREAT);
      setCaught(true);
    }
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => hide(), 1000);
  };

  if (!mounted) return null;

  // Web: fixed to the viewport + a CSS transition (robust; no rAF dependency).
  const webStyle =
    Platform.OS === 'web'
      ? ({
          position: 'fixed',
          transitionProperty: 'opacity, transform',
          transitionDuration: '260ms',
          transitionTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
        } as unknown as object)
      : {};

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        webStyle,
        { bottom: insets.bottom + 84, opacity: shown ? 1 : 0, transform: [{ translateY: shown ? 0 : 22 }] },
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
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: spacing.lg, zIndex: 9999 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    maxWidth: 230,
    boxShadow: '0 6px 22px rgba(0,0,0,0.18)',
  },
  emoji: { fontSize: 30 },
  textWrap: { flexShrink: 1 },
  name: { fontSize: 13, fontWeight: '600' },
  line: { fontSize: 13, marginTop: 1 },
});
