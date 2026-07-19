import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
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

import { useCycle } from '@/lib/cycle';
import { PETS, useSession } from '@/lib/session';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

const DAY = 86400000;
const STEPS = 3;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

export function Onboarding() {
  const c = useTheme();
  const { profile, completeOnboarding } = useSession();
  const { setup } = useCycle();

  const [step, setStep] = useState(0);
  const [name, setName] = useState(profile.name ?? '');
  const [daysAgo, setDaysAgo] = useState(5);
  const [cycleLength, setCycleLength] = useState(28);
  const [periodLength, setPeriodLength] = useState(5);
  const [petKey, setPetKey] = useState<string | null>(null);
  const [petName, setPetName] = useState('');

  const lastPeriodDate = new Date(startOfDay(Date.now()) - daysAgo * DAY).toLocaleDateString(
    undefined,
    { weekday: 'short', month: 'short', day: 'numeric' },
  );

  const canNext = step === 0 ? name.trim().length > 0 : step === 2 ? !!petKey : true;

  const finish = () => {
    if (!petKey) return;
    setup({
      lastPeriodStart: startOfDay(Date.now()) - daysAgo * DAY,
      cycleLength,
      periodLength,
    });
    const label = PETS.find((p) => p.key === petKey)?.label ?? 'Friend';
    completeOnboarding({ name, pet: { key: petKey, name: petName.trim() || label } });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.dots}>
          {Array.from({ length: STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: i === step ? c.green : c.surfaceAlt, width: i === step ? 22 : 8 },
              ]}
            />
          ))}
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {step === 0 ? (
            <View style={styles.stepBody}>
              <Text style={[styles.q, { color: c.text }]}>What should we call you?</Text>
              <Text style={[styles.sub, { color: c.textSecondary }]}>
                Hi! I&apos;m Luna. Let&apos;s set things up together.
              </Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor={c.textTertiary}
                style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
              />
            </View>
          ) : null}

          {step === 1 ? (
            <View style={styles.stepBody}>
              <Text style={[styles.q, { color: c.text }]}>Tell us about your cycle</Text>
              <Text style={[styles.sub, { color: c.textSecondary }]}>
                Rough estimates are fine — it gets smarter as you log.
              </Text>
              <Stepper
                label="Last period started"
                value={daysAgo}
                min={0}
                max={45}
                onChange={setDaysAgo}
                display={daysAgo === 0 ? 'Today' : `${daysAgo} days ago`}
                caption={lastPeriodDate}
              />
              <Stepper
                label="Average cycle length"
                value={cycleLength}
                min={21}
                max={40}
                onChange={setCycleLength}
                display={`${cycleLength} days`}
              />
              <Stepper
                label="Period length"
                value={periodLength}
                min={2}
                max={10}
                onChange={setPeriodLength}
                display={`${periodLength} days`}
              />
            </View>
          ) : null}

          {step === 2 ? (
            <View style={styles.stepBody}>
              <Text style={[styles.q, { color: c.text }]}>Pick your pet friend</Text>
              <Text style={[styles.sub, { color: c.textSecondary }]}>
                They&apos;ll grow as you check in and care for yourself.
              </Text>
              <View style={styles.petGrid}>
                {PETS.map((p) => {
                  const sel = petKey === p.key;
                  return (
                    <Pressable
                      key={p.key}
                      onPress={() => setPetKey(p.key)}
                      accessibilityRole="button"
                      accessibilityLabel={p.label}
                      accessibilityState={{ selected: sel }}
                      style={[
                        styles.petCard,
                        { backgroundColor: sel ? c.greenSoft : c.surfaceAlt, borderColor: sel ? c.green : 'transparent' },
                      ]}>
                      <Text style={styles.petEmoji}>{p.emoji}</Text>
                      <Text style={[styles.petLabel, { color: c.text }]}>{p.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {petKey ? (
                <TextInput
                  value={petName}
                  onChangeText={setPetName}
                  placeholder={`Name your ${PETS.find((p) => p.key === petKey)?.label.toLowerCase()}`}
                  placeholderTextColor={c.textTertiary}
                  style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
                />
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {step > 0 ? (
            <Pressable onPress={() => setStep(step - 1)} style={styles.backBtn} accessibilityLabel="Back">
              <Ionicons name="chevron-back" size={22} color={c.textSecondary} />
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
          <Pressable
            onPress={() => (step < STEPS - 1 ? setStep(step + 1) : finish())}
            disabled={!canNext}
            style={[styles.nextBtn, { backgroundColor: canNext ? c.green : c.surfaceAlt }]}>
            <Text style={[styles.nextText, { color: canNext ? c.accentText : c.textTertiary }]}>
              {step < STEPS - 1 ? 'Continue' : "Let's go"}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Stepper({
  label,
  value,
  min,
  max,
  onChange,
  display,
  caption,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
  display: string;
  caption?: string;
}) {
  const c = useTheme();
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  return (
    <View style={[styles.stepper, { backgroundColor: c.surfaceAlt }]}>
      <View style={styles.flex}>
        <Text style={[styles.stepperLabel, { color: c.textSecondary }]}>{label}</Text>
        <Text style={[styles.stepperValue, { color: c.text }]}>{display}</Text>
        {caption ? <Text style={[styles.stepperCaption, { color: c.textTertiary }]}>{caption}</Text> : null}
      </View>
      <View style={styles.stepperControls}>
        <Pressable onPress={dec} style={[styles.round, { borderColor: c.border }]} accessibilityLabel={`Decrease ${label}`}>
          <Ionicons name="remove" size={18} color={c.text} />
        </Pressable>
        <Pressable onPress={inc} style={[styles.round, { borderColor: c.border }]} accessibilityLabel={`Increase ${label}`}>
          <Ionicons name="add" size={18} color={c.text} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: spacing.lg },
  dot: { height: 8, borderRadius: radius.pill },
  content: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  stepBody: { gap: spacing.md },
  q: { fontSize: 26, fontFamily: fonts.serif },
  sub: { fontSize: 15, lineHeight: 22, marginBottom: spacing.sm },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  stepperLabel: { fontSize: 13 },
  stepperValue: { fontSize: 18, fontFamily: fonts.serif, marginTop: 2 },
  stepperCaption: { fontSize: 12, marginTop: 2 },
  stepperControls: { flexDirection: 'row', gap: spacing.sm },
  round: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  petGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, justifyContent: 'space-between' },
  petCard: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  petEmoji: { fontSize: 40 },
  petLabel: { fontSize: 13, fontWeight: '500' },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  nextBtn: {
    flex: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    boxShadow: '0px 6px 16px rgba(80, 74, 58, 0.12)',
  },
  nextText: { fontSize: 16, fontWeight: '600' },
});
