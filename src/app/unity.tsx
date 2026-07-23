import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, ScreenHeader, SectionTitle } from '@/components/ui';
import { useCommunity } from '@/lib/community';
import { UPCOMING_CIRCLES, type Circle } from '@/lib/content';
import { useCycle } from '@/lib/cycle';
import { moderateText } from '@/lib/moderate';
import { fonts, radius, spacing, useTheme } from '@/lib/theme';

function ago(ms: number): string {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return 'now';
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function UnityScreen() {
  const c = useTheme();
  const { today } = useCycle();
  const { feed, ready, refresh, addPost, toggleHug, addComment, reportPost, deletePost, deleteComment } =
    useCommunity();

  const phaseTitle = today.content.label.charAt(0) + today.content.label.slice(1).toLowerCase();

  const [draft, setDraft] = useState('');
  const [anon, setAnon] = useState(false);
  const [posting, setPosting] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);

  const [expanded, setExpanded] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replyAnon, setReplyAnon] = useState(false);
  const [replyChecking, setReplyChecking] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const submitPost = async () => {
    const text = draft.trim();
    if (!text || posting) return;
    setPosting(true);
    setPostError(null);
    const mod = await moderateText(text);
    if (!mod.allowed) {
      setPosting(false);
      setPostError(mod.reason);
      return;
    }
    const ok = await addPost({ body: text, phase: phaseTitle, anonymous: anon });
    setPosting(false);
    if (!ok) {
      setPostError('Couldn’t post right now. Please try again.');
      return;
    }
    setDraft('');
  };

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
    if (!mod.allowed) {
      setReplyChecking(false);
      setReplyError(mod.reason);
      return;
    }
    const ok = await addComment(id, { body: text, anonymous: replyAnon });
    setReplyChecking(false);
    if (!ok) {
      setReplyError('Couldn’t send right now. Please try again.');
      return;
    }
    setReply('');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: c.bg }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={c.green} />}>
        <ScreenHeader title="Unity Community" />

        <Card style={styles.greenhouse}>
          <Text style={[styles.ghTitle, { color: c.text }]}>The Greenhouse</Text>
          <Text style={[styles.ghBody, { color: c.textSecondary }]}>
            A shared space with others across their cycles. Be kind — everyone here can see your posts.
          </Text>
        </Card>

        <Card variant="outline" style={styles.composer}>
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
          {postError ? (
            <View style={styles.guardRow}>
              <Ionicons name="alert-circle-outline" size={15} color="#C2545A" />
              <Text style={[styles.guardText, { color: '#C2545A' }]}>{postError}</Text>
            </View>
          ) : null}
          <View style={styles.composerBar}>
            <Pressable
              onPress={() => setAnon((a) => !a)}
              style={[styles.anonToggle, anon && { backgroundColor: c.greenSoft, borderColor: c.green }]}>
              <Ionicons
                name={anon ? 'eye-off' : 'eye-off-outline'}
                size={15}
                color={anon ? c.green : c.textTertiary}
              />
              <Text style={[styles.anonText, { color: anon ? c.green : c.textTertiary }]}>Anonymous</Text>
            </Pressable>
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
          </View>
        </Card>

        <SectionTitle style={styles.noMargin}>Community</SectionTitle>
        <Text style={[styles.feedHint, { color: c.textTertiary }]}>Pull down to refresh · updates live</Text>

        {!ready ? (
          <ActivityIndicator style={styles.loading} color={c.green} />
        ) : feed.length === 0 ? (
          <Text style={[styles.empty, { color: c.textTertiary }]}>
            No posts yet — be the first to share something with the Greenhouse.
          </Text>
        ) : (
          feed.map((p) => {
            const open = expanded === p.id;
            return (
              <Card key={p.id} variant="outline" style={styles.post}>
                <View style={styles.postHeader}>
                  <View style={[styles.avatar, { backgroundColor: c.surfaceAlt }]}>
                    <Text style={[styles.avatarText, { color: c.green }]}>{p.initial}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.author, { color: c.text }]}>{p.author}</Text>
                    <Text style={[styles.phase, { color: c.textTertiary }]}>
                      {p.phase ? `${p.phase} · ` : ''}
                      {ago(p.createdAt)}
                    </Text>
                  </View>
                  {p.mine ? (
                    <Pressable onPress={() => deletePost(p.id)} hitSlop={8} accessibilityLabel="Delete post">
                      <Ionicons name="trash-outline" size={17} color={c.textTertiary} />
                    </Pressable>
                  ) : (
                    <Pressable onPress={() => reportPost(p.id)} hitSlop={8} accessibilityLabel="Report post">
                      <Ionicons name="flag-outline" size={16} color={c.textTertiary} />
                    </Pressable>
                  )}
                </View>

                <Text style={[styles.postBody, { color: c.text }]}>{p.body}</Text>

                <View style={styles.postFooter}>
                  <Pressable onPress={() => toggleHug(p.id)} style={styles.metric} accessibilityLabel="Send a hug">
                    <Ionicons
                      name={p.huggedByMe ? 'heart' : 'heart-outline'}
                      size={17}
                      color={p.huggedByMe ? c.green : c.textSecondary}
                    />
                    <Text style={[styles.metricText, { color: p.huggedByMe ? c.green : c.textSecondary }]}>
                      {p.hugs} Hugs
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => toggleComments(p.id)} style={styles.metric} accessibilityLabel="Show tips">
                    <Ionicons
                      name={open ? 'chatbubble' : 'chatbubble-outline'}
                      size={16}
                      color={open ? c.green : c.textSecondary}
                    />
                    <Text style={[styles.metricText, { color: open ? c.green : c.textSecondary }]}>
                      {p.comments.length} Tips
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
                        {cm.mine ? (
                          <Pressable onPress={() => deleteComment(cm.id)} hitSlop={8} accessibilityLabel="Delete comment">
                            <Ionicons name="close" size={15} color={c.textTertiary} />
                          </Pressable>
                        ) : null}
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
                    <Pressable onPress={() => setReplyAnon((a) => !a)} style={styles.replyAnonRow}>
                      <Ionicons
                        name={replyAnon ? 'checkbox' : 'square-outline'}
                        size={15}
                        color={replyAnon ? c.green : c.textTertiary}
                      />
                      <Text style={[styles.replyAnonText, { color: c.textTertiary }]}>Reply anonymously</Text>
                    </Pressable>
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
          })
        )}

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
    <View style={[styles.circle, featured ? { backgroundColor: c.green } : { backgroundColor: c.surfaceAlt }]}>
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
  composerInput: { fontSize: 15, lineHeight: 21, minHeight: 44, paddingTop: 4, textAlignVertical: 'top' },
  composerBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  anonToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  anonText: { fontSize: 13, fontWeight: '500' },
  postBtn: { borderRadius: radius.pill, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl },
  postBtnText: { fontSize: 14, fontWeight: '600' },
  postBtnRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  guardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  guardText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  circlesHeader: { marginTop: spacing.lg },
  dropdown: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dropdownText: { fontSize: 13 },
  feedHint: { fontSize: 12, marginTop: -spacing.sm, marginBottom: spacing.md },
  loading: { marginVertical: spacing.xl },
  empty: { fontSize: 14, lineHeight: 21, paddingVertical: spacing.md },
  post: { marginBottom: spacing.md },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  avatar: { width: 40, height: 40, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '500' },
  author: { fontSize: 15, fontWeight: '500' },
  phase: { fontSize: 12, marginTop: 1 },
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
  },
  replyInput: { flex: 1, fontSize: 14, paddingVertical: spacing.sm },
  replySend: { width: 32, height: 32, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  replyAnonRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -spacing.xs },
  replyAnonText: { fontSize: 12 },
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
