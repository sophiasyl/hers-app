import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Modal, Platform, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { deleteMyData, exportMyData } from './privacy';
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
  const { profile, email, userId, logOut } = useSession();

  const [exporting, setExporting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const onExport = async () => {
    if (!userId || exporting) return;
    setExporting(true);
    try {
      const json = JSON.stringify(await exportMyData(userId), null, 2);
      const g = globalThis as unknown as {
        document?: { createElement: (t: string) => Record<string, unknown> & { click: () => void } };
        Blob?: new (parts: string[], opts: { type: string }) => unknown;
        URL?: { createObjectURL: (b: unknown) => string; revokeObjectURL: (u: string) => void };
      };
      if (Platform.OS === 'web' && g.document && g.Blob && g.URL) {
        const url = g.URL.createObjectURL(new g.Blob([json], { type: 'application/json' }));
        const a = g.document.createElement('a');
        a.href = url;
        a.download = 'hers-my-data.json';
        a.click();
        g.URL.revokeObjectURL(url);
      } else {
        await Share.share({ message: json });
      }
    } catch {
      // ignore
    }
    setExporting(false);
  };

  const onDelete = async () => {
    if (!userId || deleting) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setDeleting(true);
    try {
      await deleteMyData(userId);
    } catch {
      // ignore
    }
    setDeleting(false);
    setConfirmDelete(false);
    closeSettings();
    logOut();
  };

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

          <View style={[styles.privacy, { borderTopColor: c.border }]}>
            <Text style={[styles.label, { color: c.textTertiary }]}>YOUR PRIVACY</Text>
            <Text style={[styles.privacyText, { color: c.textSecondary }]}>
              Your data is yours. We never sell it, and it’s protected so only you can read it — Luna and
              the community only ever see what you choose to share.
            </Text>
            <Pressable
              onPress={onExport}
              disabled={exporting}
              style={[styles.privacyBtn, { borderColor: c.border }]}>
              <Ionicons name="download-outline" size={16} color={c.text} />
              <Text style={[styles.privacyBtnText, { color: c.text }]}>
                {exporting ? 'Preparing…' : 'Export my data'}
              </Text>
            </Pressable>
            <Pressable
              onPress={onDelete}
              disabled={deleting}
              style={[styles.privacyBtn, { borderColor: confirmDelete ? '#C2545A' : c.border }]}>
              <Ionicons name="trash-outline" size={16} color="#C2545A" />
              <Text style={[styles.privacyBtnText, { color: '#C2545A' }]}>
                {deleting ? 'Deleting…' : confirmDelete ? 'Tap again to permanently delete' : 'Delete my data'}
              </Text>
            </Pressable>
            {confirmDelete ? (
              <Text style={[styles.privacyWarn, { color: c.textTertiary }]}>
                This erases all your logs, diary, chats and posts. It can’t be undone.
              </Text>
            ) : null}
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
  privacy: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  privacyText: { fontSize: 13, lineHeight: 19, marginBottom: spacing.xs },
  privacyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.pill,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  privacyBtnText: { fontSize: 14, fontWeight: '500' },
  privacyWarn: { fontSize: 12, lineHeight: 17 },
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
