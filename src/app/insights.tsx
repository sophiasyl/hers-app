import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { INSIGHTS } from '@/lib/content';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

export default function InsightsScreen() {
  const c = useTheme();
  const maxBar = Math.max(...INSIGHTS.volatility);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Cycle Insights" />

        <SectionTitle>Past Cycle Analytics</SectionTitle>
        <View style={styles.metrics}>
          <Card style={styles.metric}>
            <Text style={[styles.metricValue, { color: c.green }]}>{INSIGHTS.anxietyPrevalence}%</Text>
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>ANXIETY PREVALENCE</Text>
          </Card>
          <Card style={styles.metric}>
            <Text style={[styles.metricValue, { color: c.green }]}>{INSIGHTS.nextDayFluctuation}%</Text>
            <Text style={[styles.metricLabel, { color: c.textSecondary }]}>NEXT-DAY FLUCTUATION</Text>
          </Card>
        </View>

        <Card variant="outline" style={styles.chartCard}>
          <Text style={[styles.cardTitle, { color: c.text }]}>Volatility Trend</Text>
          <View style={styles.chart}>
            {INSIGHTS.volatility.map((v, i) => {
              const peak = v === maxBar;
              return (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      height: `${Math.round((v / maxBar) * 100)}%`,
                      backgroundColor: peak ? c.tan : c.surfaceAlt,
                    },
                  ]}
                />
              );
            })}
          </View>
          <Text style={[styles.note, { color: c.textSecondary }]}>{INSIGHTS.volatilityNote}</Text>
        </Card>

        <Card style={styles.feelCard}>
          <Text style={[styles.cardTitle, { color: c.text }]}>What Made You Feel Better</Text>
          <View style={styles.feelList}>
            {INSIGHTS.feelBetter.map((f) => (
              <View key={f.title} style={styles.feelRow}>
                <Ionicons name={f.icon as never} size={20} color={c.green} style={styles.feelIcon} />
                <Text style={[styles.feelText, { color: c.text }]}>
                  <Text style={styles.feelTitle}>{f.title}: </Text>
                  {f.detail}
                </Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  metrics: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg },
  metric: { flex: 1, alignItems: 'center', paddingVertical: spacing.xl },
  metricValue: { fontSize: 30, fontFamily: fonts.serif },
  metricLabel: { fontSize: 11, letterSpacing: 1, marginTop: spacing.xs, textAlign: 'center' },
  chartCard: { marginBottom: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '500', marginBottom: spacing.md },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 120,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  bar: { flex: 1, borderRadius: radius.sm, minHeight: 6 },
  note: { fontSize: 13, lineHeight: 20 },
  feelCard: {},
  feelList: { gap: spacing.md },
  feelRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  feelIcon: { marginTop: 1 },
  feelText: { flex: 1, fontSize: 14, lineHeight: 21 },
  feelTitle: { fontWeight: '500' },
});
