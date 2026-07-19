import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { COMMUNITY_POSTS, UPCOMING_CIRCLES, type Circle } from '@/lib/content';
import { useCycle } from '@/lib/cycle';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

export default function UnityScreen() {
  const c = useTheme();
  const { today } = useCycle();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Unity Community" />

        <Card style={styles.greenhouse}>
          <Text style={[styles.ghTitle, { color: c.text }]}>The Greenhouse</Text>
          <Text style={[styles.ghBody, { color: c.textSecondary }]}>
            Find support from others on Day {today.day} of their cycle.
          </Text>
        </Card>

        <View style={styles.sectionRow}>
          <SectionTitle style={styles.noMargin}>Community Insights</SectionTitle>
          <View style={styles.dropdown}>
            <Text style={[styles.dropdownText, { color: c.textSecondary }]}>Newest</Text>
            <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
          </View>
        </View>

        {COMMUNITY_POSTS.map((p) => (
          <Card key={p.id} variant="outline" style={styles.post}>
            <View style={styles.postHeader}>
              <View style={[styles.avatar, { backgroundColor: c.surfaceAlt }]}>
                <Text style={[styles.avatarText, { color: c.green }]}>{p.initial}</Text>
              </View>
              <View style={styles.flex}>
                <Text style={[styles.author, { color: c.text }]}>{p.author}</Text>
                <Text style={[styles.phase, { color: c.textTertiary }]}>Phase: {p.phase}</Text>
              </View>
              <View style={[styles.badge, { backgroundColor: c.greenSoft }]}>
                <Text style={[styles.badgeText, { color: c.green }]}>{p.badge}</Text>
              </View>
            </View>
            <Text style={[styles.postBody, { color: c.text }]}>{p.body}</Text>
            <View style={styles.postFooter}>
              <View style={styles.metric}>
                <Ionicons name="heart-outline" size={16} color={c.textSecondary} />
                <Text style={[styles.metricText, { color: c.textSecondary }]}>{p.hugs} Hugs</Text>
              </View>
              <View style={styles.metric}>
                <Ionicons name="chatbubble-outline" size={16} color={c.textSecondary} />
                <Text style={[styles.metricText, { color: c.textSecondary }]}>{p.tips} Tips</Text>
              </View>
            </View>
          </Card>
        ))}

        <View style={[styles.sectionRow, styles.circlesHeader]}>
          <SectionTitle style={styles.noMargin}>Upcoming Circles</SectionTitle>
          <View style={styles.dropdown}>
            <Ionicons name="location-outline" size={14} color={c.green} />
            <Text style={[styles.dropdownText, { color: c.green }]}>View Map</Text>
          </View>
        </View>

        {UPCOMING_CIRCLES.map((circle, i) => (
          <CircleRow key={circle.id} circle={circle} featured={i === 0} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

function CircleRow({ circle, featured }: { circle: Circle; featured: boolean }) {
  const c = useTheme();
  const fg = featured ? c.accentText : c.text;
  const sub = featured ? c.accentText : c.textTertiary;
  return (
    <View
      style={[
        styles.circle,
        featured
          ? { backgroundColor: c.green }
          : { backgroundColor: c.surfaceAlt },
      ]}>
      <View style={styles.dateBlock}>
        <Text style={[styles.dateDay, { color: fg }]}>{circle.day}</Text>
        <Text style={[styles.dateMonth, { color: sub }]}>{circle.month}</Text>
      </View>
      <View style={styles.flex}>
        <Text style={[styles.circleTitle, { color: fg }]}>{circle.title}</Text>
        <Text style={[styles.circleMeta, { color: sub }]}>
          {circle.place} · {circle.time}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={sub} />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },
  flex: { flex: 1 },
  noMargin: { marginBottom: 0 },
  greenhouse: { marginBottom: spacing.xl },
  ghTitle: { fontSize: 16, fontWeight: '500', marginBottom: spacing.xs },
  ghBody: { fontSize: 14, lineHeight: 21 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  circlesHeader: { marginTop: spacing.lg },
  dropdown: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dropdownText: { fontSize: 13 },
  post: { marginBottom: spacing.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '500' },
  author: { fontSize: 15, fontWeight: '500' },
  phase: { fontSize: 12 },
  badge: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeText: { fontSize: 10, letterSpacing: 0.5, fontWeight: '500' },
  postBody: { fontSize: 15, lineHeight: 22, marginBottom: spacing.md },
  postFooter: { flexDirection: 'row', gap: spacing.xl },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metricText: { fontSize: 13 },
  circle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  dateBlock: { alignItems: 'center', width: 36 },
  dateDay: { fontSize: 20, fontFamily: fonts.serif },
  dateMonth: { fontSize: 10, letterSpacing: 1, marginTop: 2 },
  circleTitle: { fontSize: 15, fontWeight: '500' },
  circleMeta: { fontSize: 13, marginTop: 2 },
});
