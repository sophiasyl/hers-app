import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useSession } from './session';
import {
  fonts,
  radius,
  SettingsContext,
  spacing,
  THEMES,
  useTheme,
  type Appearance,
  type SettingsValue,
} from './theme';

const STORAGE_KEY = 'hers.settings.v1';

export function useSettings(): SettingsValue {
  return useContext(SettingsContext);
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [themeKey, setThemeKeyState] = useState('forest');
  const [appearance, setAppearanceState] = useState<Appearance>('system');
  const [ready, setReady] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!active || !raw) return;
        try {
          const parsed = JSON.parse(raw) as { themeKey?: string; appearance?: Appearance };
          if (parsed.themeKey) setThemeKeyState(parsed.themeKey);
          if (parsed.appearance) setAppearanceState(parsed.appearance);
        } catch {
          // ignore corrupt store
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const persist = useCallback((key: string, appr: Appearance) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ themeKey: key, appearance: appr })).catch(() => {});
  }, []);

  const setThemeKey = useCallback(
    (k: string) => {
      setThemeKeyState(k);
      persist(k, appearance);
    },
    [appearance, persist],
  );

  const setAppearance = useCallback(
    (a: Appearance) => {
      setAppearanceState(a);
      persist(themeKey, a);
    },
    [themeKey, persist],
  );

  const value = useMemo<SettingsValue>(
    () => ({
      themeKey,
      appearance,
      ready,
      settingsOpen,
      setThemeKey,
      setAppearance,
      openSettings: () => setSettingsOpen(true),
      closeSettings: () => setSettingsOpen(false),
    }),
    [themeKey, appearance, ready, settingsOpen, setThemeKey, setAppearance],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
      <SettingsModal />
    </SettingsContext.Provider>
  );
}

const APPEARANCES: { key: Appearance; label: string }[] = [
  { key: 'system', label: 'System' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

function SettingsModal() {
  const c = useTheme();
  const { settingsOpen, closeSettings, themeKey, appearance, setThemeKey, setAppearance } = useSettings();
  const { profile, email, logOut } = useSession();

  return (
    <Modal visible={settingsOpen} transparent animationType="slide" onRequestClose={closeSettings}>
      <Pressable style={styles.backdrop} onPress={closeSettings}>
        <Pressable style={[styles.sheet, { backgroundColor: c.surface }]} onPress={() => {}}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: c.text }]}>Settings</Text>
            <Pressable onPress={closeSettings} hitSlop={8} accessibilityLabel="Close settings">
              <Ionicons name="close" size={24} color={c.textTertiary} />
            </Pressable>
          </View>

          <Text style={[styles.label, { color: c.textTertiary }]}>APPEARANCE</Text>
          <View style={[styles.segment, { backgroundColor: c.surfaceAlt }]}>
            {APPEARANCES.map((a) => {
              const sel = appearance === a.key;
              return (
                <Pressable
                  key={a.key}
                  onPress={() => setAppearance(a.key)}
                  style={[styles.segItem, sel && { backgroundColor: c.surface }]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: sel }}>
                  <Text style={[styles.segText, { color: sel ? c.text : c.textSecondary }]}>{a.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={[styles.label, { color: c.textTertiary, marginTop: spacing.lg }]}>ACCENT COLOR</Text>
          <View style={styles.swatches}>
            {THEMES.map((t) => {
              const sel = themeKey === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setThemeKey(t.key)}
                  style={styles.swatchWrap}
                  accessibilityRole="button"
                  accessibilityLabel={t.label}
                  accessibilityState={{ selected: sel }}>
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: t.primary, borderColor: sel ? c.text : 'transparent' },
                    ]}>
                    {sel ? <Ionicons name="checkmark" size={20} color="#FFFFFF" /> : null}
                  </View>
                  <Text style={[styles.swatchLabel, { color: sel ? c.text : c.textTertiary }]}>{t.label}</Text>
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.account, { borderTopColor: c.border }]}>
            <View style={styles.accountInfo}>
              <Text style={[styles.accountName, { color: c.text }]}>{profile.name || 'You'}</Text>
              {email ? <Text style={[styles.accountEmail, { color: c.textTertiary }]}>{email}</Text> : null}
            </View>
            <Pressable
              onPress={() => {
                closeSettings();
                logOut();
              }}
              style={[styles.logoutBtn, { borderColor: c.border }]}>
              <Text style={[styles.logoutText, { color: '#C2545A' }]}>Log out</Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  title: { fontSize: 22, fontFamily: fonts.serif },
  label: { fontSize: 12, letterSpacing: 1, marginBottom: spacing.sm },
  segment: { flexDirection: 'row', borderRadius: radius.md, padding: 3 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm, borderRadius: radius.sm },
  segText: { fontSize: 14, fontWeight: '500' },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.lg, marginTop: spacing.xs },
  swatchWrap: { alignItems: 'center', gap: spacing.xs, width: 56 },
  swatch: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  swatchLabel: { fontSize: 11 },
  account: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 15, fontWeight: '500' },
  accountEmail: { fontSize: 13, marginTop: 2 },
  logoutBtn: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  logoutText: { fontSize: 14, fontWeight: '500' },
});
