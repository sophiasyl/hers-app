import { Fredoka_500Medium, Fredoka_600SemiBold } from '@expo-google-fonts/fredoka';
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, useFonts } from '@expo-google-fonts/nunito';
import { Ionicons } from '@expo/vector-icons';
import { Tabs, TabList, TabSlot, TabTrigger, type TabTriggerSlotProps } from 'expo-router/ui';
import { StatusBar } from 'expo-status-bar';
import { Pressable, StyleSheet, Text, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthScreen } from '@/components/AuthScreen';
import { Onboarding } from '@/components/Onboarding';
import '@/lib/applyFonts';
import { CycleProvider } from '@/lib/cycle';
import { EntriesProvider } from '@/lib/entries';
import { SessionProvider, useSession } from '@/lib/session';
import { SettingsProvider, useSettings } from '@/lib/settings';
import { palette, spacing, useTheme } from '@/lib/theme';

function TabButton({
  isFocused,
  label,
  icon,
  ...props
}: TabTriggerSlotProps & { label: string; icon: string }) {
  const c = useTheme();
  const color = isFocused ? c.green : c.textTertiary;
  return (
    <Pressable
      {...props}
      style={styles.tabButton}
      accessibilityRole="button"
      accessibilityState={{ selected: !!isFocused }}>
      <Ionicons name={icon as never} size={22} color={color} />
      <Text style={[styles.tabLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function AppChrome() {
  const c = useTheme();
  const { appearance } = useSettings();
  const system = useColorScheme();
  const dark = appearance === 'system' ? system === 'dark' : appearance === 'dark';
  const insets = useSafeAreaInsets();

  return (
    <>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Tabs style={StyleSheet.flatten([styles.root, { backgroundColor: c.bg }])}>
        <TabSlot style={{ flex: 1 }} />
        <TabList asChild>
          <View
            style={StyleSheet.flatten([
              styles.tabList,
              {
                backgroundColor: c.surface,
                borderTopColor: c.border,
                paddingBottom: Math.max(insets.bottom, spacing.sm),
              },
            ])}>
            <TabTrigger name="index" href="/" asChild>
              <TabButton label="Track" icon="sunny-outline" />
            </TabTrigger>
            <TabTrigger name="luna" href="/luna" asChild>
              <TabButton label="Luna AI" icon="moon-outline" />
            </TabTrigger>
            <TabTrigger name="insights" href="/insights" asChild>
              <TabButton label="Insights" icon="stats-chart-outline" />
            </TabTrigger>
            <TabTrigger name="unity" href="/unity" asChild>
              <TabButton label="Unity" icon="people-outline" />
            </TabTrigger>
            <TabTrigger name="learn" href="/learn" asChild>
              <TabButton label="Learn" icon="book-outline" />
            </TabTrigger>
          </View>
        </TabList>
      </Tabs>
    </>
  );
}

function Gate() {
  const c = useTheme();
  const { ready, email, profile } = useSession();
  if (!ready) return <View style={{ flex: 1, backgroundColor: c.bg }} />;
  if (!email) return <AuthScreen />;
  // Per-account data providers — keyed by email so switching accounts loads
  // that account's own cycle + journal data (a fresh mount).
  return (
    <CycleProvider key={email} userKey={email}>
      <EntriesProvider userKey={email}>
        {profile.onboarded ? <AppChrome /> : <Onboarding />}
      </EntriesProvider>
    </CycleProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Fredoka_500Medium,
    Fredoka_600SemiBold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: palette.light.bg }} />;
  }

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <SettingsProvider>
          <Gate />
        </SettingsProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  tabList: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.sm,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: spacing.xs,
  },
  tabLabel: { fontSize: 10 },
});
