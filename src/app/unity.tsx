import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { COMMUNITY_POSTS, UPCOMING_CIRCLES, type CommunityPost, type Circle } from '@/lib/content';
import { useCycle } from '@/lib/cycle';
import { moderateText } from '@/lib/moderate';
import { useSession } from '@/lib/session';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

type LivePost = CommunityPost & { hugged: boolean };

export default function UnityScreen() {
  const c = useTheme();
  const { today } = useCycle();
  const { profile } = useSession();
  const me = profile.name?.trim() || 'You';
  const myInitial = (me[0] ?? 'Y').toUpperCase();

  const [posts, setPosts] = useState<LivePost[]>(() =>
    COMMUNITY_POSTS.map((p) => ({ ...p, hugged: false })),
  );
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  const [replyChecking, setReplyChecking] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const toggleHug = (id: string) =>
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, hugged: !p.hugged, hugs: p.hugs + (p.hugged ? -1 : 1) } : p,
      ),
    );

  const toggleComments = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
    setReply('');
    setReplyError(null);
  };

  const submitReply = async (id: string) => {
    const text = reply.trim();
    if (!text || replyChecking) return;
    setReplyChecking(true);
    setReplyError(null);
    const mod = await moderateText(text);
    setReplyChecking(false);
    if (!mod.allowed) {
      setReplyError(mod.reason);
      return;
    }
    setPosts((prev) =>
      prev.map((p) =>
        p.id === id
          ? {
              ...p,
              tips: p.tips + 1,
              comments: [...p.comments, { id: `c${Date.now()}`, author: me, initial: myInitial, body: text }],
            }
          : p,
      ),
    );
    setReply('');
  };

  const submitPost = async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    setPostError(null);
    const mod = await moderateText(text);
    setPosting(false);
    if (!mod.allowed) {
      setPostError(mod.reason);
      return;
    }
    const post: LivePost = {
      id: `mine${Date.now()}`,
      author: me,
      initial: myInitial,
      anonymous: false,
      phase: today.content.label.charAt(0) + today.content.label.slice(1).toLowerCase(),
      badge: 'JUST SHARED',
      body: text,
      hugs: 0,
      tips: 0,
      comments: [],
      hugged: false,
    };
    setPosts((prev) => [post, ...prev]);
    setDraft('');
  };

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

        <Card variant="outline" style={styles.composer}>
          <View style={styles.composerRow}>
            <View style={[styles.avatar, { backgroundColor: c.greenSoft }]}>
              <Text style={[styles.avatarText, { color: c.green }]}>{myInitial}</Text>
            </View>
            <TextInput
              value={draft}
              onChangeText={(t) => {
                setDraft(t);
                if (postError) setPostError(null);
              }}
              placeholder="Share how you're feeling with the Greenhouse…"
              placeholderTextColor={c.textTertiary}
              multiline
              editable={!posting}
              style={[styles.composerInput, { color: c.text }]}
            />
          </View>
          {postError ? (
            <View style={styles.guardRow}>
              <Ionicons name="alert-circle-outline" size={15} color="#C2545A" />
              <Text style={[styles.guardText, { color: '#C2545A' }]}>{postError}</Text>
            </View>
          ) : (
            <Text style={[styles.guidelines, { color: c.textTertiary }]}>
              Be kind. No selling, soliciting, or sharing contact info — posts are checked against our
              community guidelines.
            </Text>
          )}
          <Pressable
            onPress={submitPost}
            disabled={!draft.trim() || posting}
            style={[styles.postBtn, { backgroundColor: draft.trim() && !posting ? c.green : c.surfaceAlt }]}>
            {posting ? (
              <View style={styles.postBtnRow}>
                <ActivityIndicator size="small" color={c.accentText} />
                <Text style={[styles.postBtnText, { color: c.accentText }]}>Checking…</Text>
              </View>
            ) : (
              <Text style={[styles.postBtnText, { color: draft.trim() ? c.accentText : c.textTertiary }]}>
                Share
              </Text>
            )}
          </Pressable>
        </Card>

        <View style={styles.sectionRow}>
          <SectionTitle style={styles.noMargin}>Community Insights</SectionTitle>
          <View style={styles.dropdown}>
            <Text style={[styles.dropdownText, { color: c.textSecondary }]}>Newest</Text>
            <Ionicons name="chevron-down" size={14} color={c.textSecondary} />
          </View>
        </View>

        {posts.map((p) => {
          const open = expanded === p.id;
          return (
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
                <Pressable
                  onPress={() => toggleHug(p.id)}
                  style={styles.metric}
                  accessibilityRole="button"
                  accessibilityLabel={p.hugged ? 'Remove hug' : 'Send a hug'}>
                  <Ionicons
                    name={p.hugged ? 'heart' : 'heart-outline'}
                    size={17}
                    color={p.hugged ? c.green : c.textSecondary}
                  />
                  <Text style={[styles.metricText, { color: p.hugged ? c.green : c.textSecondary }]}>
                    {p.hugs} Hugs
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => toggleComments(p.id)}
                  style={styles.metric}
                  accessibilityRole="button"
                  accessibilityLabel="Show tips">
                  <Ionicons
                    name={open ? 'chatbubble' : 'chatbubble-outline'}
                    size={16}
                    color={open ? c.green : c.textSecondary}
                  />
                  <Text style={[styles.metricText, { color: open ? c.green : c.textSecondary }]}>
                    {p.tips} Tips
                  </Text>
                </Pressable>
              </View>

              {open ? (
                <View style={[styles.thread, { borderTopColor: c.border }]}>
                  {p.comments.map((cm) => (
                    <View key={cm.id} style={styles.comment}>
                      <View style={[styles.commentAvatar, { backgroundColor: c.surfaceAlt }]}>
                        <Text style={[styles.commentAvatarText, { color: c.green }]}>{cm.initial}</Text>
                      </View>
                      <View style={styles.flex}>
                        <Text style={[styles.commentAuthor, { color: c.text }]}>{cm.author}</Text>
                        <Text style={[styles.commentBody, { color: c.textSecondary }]}>{cm.body}</Text>
                      </View>
                    </View>
                  ))}
                  <View style={[styles.replyRow, { backgroundColor: c.surfaceAlt }]}>
                    <TextInput
                      value={reply}
                      onChangeText={(t) => {
                        setReply(t);
                        if (replyError) setReplyError(null);
                      }}
                      placeholder="Share a tip or kind word…"
                      placeholderTextColor={c.textTertiary}
                      style={[styles.replyInput, { color: c.text }]}
                      onSubmitEditing={() => submitReply(p.id)}
                      editable={!replyChecking}
                      returnKeyType="send"
                    />
                    <Pressable
                      onPress={() => submitReply(p.id)}
                      disabled={!reply.trim() || replyChecking}
                      style={[styles.replySend, { backgroundColor: reply.trim() && !replyChecking ? c.green : 'transparent' }]}
                      accessibilityLabel="Send tip">
                      {replyChecking ? (
                        <ActivityIndicator size="small" color={c.green} />
                      ) : (
                        <Ionicons name="send" size={15} color={reply.trim() ? c.accentText : c.textTertiary} />
                      )}
                    </Pressable>
                  </View>
                  {replyError ? (
                    <View style={styles.guardRow}>
                      <Ionicons name="alert-circle-outline" size={14} color="#C2545A" />
                      <Text style={[styles.guardText, { color: '#C2545A' }]}>{replyError}</Text>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </Card>
          );
        })}

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
        featured ? { backgroundColor: c.green } : { backgroundColor: c.surfaceAlt },
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
  greenhouse: { marginBottom: spacing.lg },
  ghTitle: { fontSize: 16, fontWeight: '500', marginBottom: spacing.xs },
  ghBody: { fontSize: 14, lineHeight: 21 },
  composer: { marginBottom: spacing.xl, gap: spacing.md },
  composerRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  composerInput: { flex: 1, fontSize: 15, lineHeight: 21, minHeight: 40, paddingTop: 8, textAlignVertical: 'top' },
  postBtn: { alignSelf: 'flex-end', borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  postBtnText: { fontSize: 14, fontWeight: '600' },
  postBtnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  guidelines: { fontSize: 12, lineHeight: 17 },
  guardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: spacing.xs },
  guardText: { flex: 1, fontSize: 13, lineHeight: 18 },
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
  metric: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 2 },
  metricText: { fontSize: 13, fontWeight: '500' },
  thread: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.md },
  comment: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  commentAvatar: { width: 28, height: 28, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  commentAvatarText: { fontSize: 12, fontWeight: '500' },
  commentAuthor: { fontSize: 13, fontWeight: '500' },
  commentBody: { fontSize: 14, lineHeight: 20, marginTop: 1 },
  replyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.pill,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.xs,
    marginTop: spacing.xs,
  },
  replyInput: { flex: 1, fontSize: 14, paddingVertical: spacing.sm },
  replySend: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
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
