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

import { PETS, useSession } from '@/lib/session';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

type Mode = 'welcome' | 'signup' | 'login';

export function AuthScreen() {
  const c = useTheme();
  const { signUp, logIn } = useSession();
  const [mode, setMode] = useState<Mode>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const go = (m: Mode) => {
    setError(null);
    setMode(m);
  };

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = mode === 'signup' ? await signUp(name, email, password) : await logIn(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Something went wrong.');
  };

  if (mode === 'welcome') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
        <View style={styles.welcome}>
          <View style={styles.petsRow}>
            {PETS.slice(0, 4).map((p) => (
              <Text key={p.key} style={styles.welcomePet}>
                {p.emoji}
              </Text>
            ))}
          </View>
          <Text style={[styles.brand, { color: c.green }]}>Hers.</Text>
          <Text style={[styles.tagline, { color: c.textSecondary }]}>
            Understand your cycle, your mood, and your body — with a little friend to grow alongside
            you.
          </Text>
          <View style={styles.welcomeButtons}>
            <Pressable onPress={() => go('signup')} style={[styles.primaryBtn, { backgroundColor: c.green }]}>
              <Text style={[styles.primaryText, { color: c.accentText }]}>Get started</Text>
            </Pressable>
            <Pressable onPress={() => go('login')} style={styles.linkBtn}>
              <Text style={[styles.linkText, { color: c.textSecondary }]}>
                I already have an account
              </Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const isSignup = mode === 'signup';
  const canSubmit = isSignup ? name && email && password : email && password;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.formContent} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: c.text }]}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </Text>

          {isSignup ? (
            <Field label="Name" value={name} onChange={setName} placeholder="Your name" />
          ) : null}
          <Field
            label="Email"
            value={email}
            onChange={setEmail}
            placeholder="you@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Password"
            value={password}
            onChange={setPassword}
            placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
            secureTextEntry
          />

          {error ? <Text style={[styles.error, { color: '#C2545A' }]}>{error}</Text> : null}

          <Pressable
            onPress={submit}
            disabled={!canSubmit || busy}
            style={[styles.primaryBtn, { backgroundColor: canSubmit ? c.green : c.surfaceAlt }]}>
            <Text style={[styles.primaryText, { color: canSubmit ? c.accentText : c.textTertiary }]}>
              {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Log in'}
            </Text>
          </Pressable>

          <Pressable onPress={() => go(isSignup ? 'login' : 'signup')} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: c.textSecondary }]}>
              {isSignup ? 'I already have an account' : 'New here? Create an account'}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'email-address' | 'default';
  autoCapitalize?: 'none' | 'sentences';
}) {
  const c = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: c.textSecondary }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textTertiary}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, { backgroundColor: c.surfaceAlt, color: c.text }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  welcome: { flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl, gap: spacing.lg },
  petsRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm },
  welcomePet: { fontSize: 40 },
  brand: { fontSize: 44, fontFamily: fonts.serif, textAlign: 'center' },
  tagline: { fontSize: 16, lineHeight: 24, textAlign: 'center', paddingHorizontal: spacing.md },
  welcomeButtons: { gap: spacing.sm, marginTop: spacing.lg },
  formContent: { flexGrow: 1, justifyContent: 'center', padding: spacing.xl, gap: spacing.md },
  title: { fontSize: 28, fontFamily: fonts.serif, marginBottom: spacing.md },
  field: { gap: 6 },
  fieldLabel: { fontSize: 13 },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: 16,
  },
  error: { fontSize: 14, marginTop: spacing.xs },
  primaryBtn: {
    borderRadius: radius.pill,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginTop: spacing.sm,
    boxShadow: '0px 6px 16px rgba(80, 74, 58, 0.12)',
  },
  primaryText: { fontSize: 16, fontWeight: '600' },
  linkBtn: { alignItems: 'center', paddingVertical: spacing.md },
  linkText: { fontSize: 14, fontWeight: '500' },
});
