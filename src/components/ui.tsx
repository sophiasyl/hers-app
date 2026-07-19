import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useSettings } from '@/lib/settings';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

export function ScreenHeader({ title }: { title: string }) {
  const c = useTheme();
  const { openSettings } = useSettings();
  return (
    <View style={styles.header}>
      <Text style={[styles.brand, { color: c.green }]}>{title}</Text>
      <Pressable onPress={openSettings} hitSlop={8} accessibilityRole="button" accessibilityLabel="Settings">
        <Ionicons name="person-circle-outline" size={28} color={c.textTertiary} />
      </Pressable>
    </View>
  );
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const c = useTheme();
  return (
    <Text style={[styles.section, { color: c.text }, style as never]}>{children}</Text>
  );
}

export function Card({
  children,
  variant = 'cream',
  style,
}: {
  children: ReactNode;
  variant?: 'cream' | 'outline' | 'green';
  style?: StyleProp<ViewStyle>;
}) {
  const c = useTheme();
  const variantStyle: ViewStyle =
    variant === 'green'
      ? { backgroundColor: c.green }
      : variant === 'outline'
        ? { backgroundColor: c.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: c.border }
        : { backgroundColor: c.surfaceAlt };
  return <View style={[styles.card, variantStyle, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  brand: { fontSize: 26, fontFamily: fonts.serif },
  section: { fontSize: 20, fontFamily: fonts.serif, marginBottom: spacing.md },
  card: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    boxShadow: '0px 6px 16px rgba(80, 74, 58, 0.05)',
  },
});
