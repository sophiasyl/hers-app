import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from './supabase';

export interface FeedComment {
  id: string; // db id (for delete)
  author: string;
  initial: string;
  body: string;
  createdAt: number;
  mine: boolean;
}

export interface FeedPost {
  id: string;
  author: string;
  initial: string;
  anonymous: boolean;
  phase: string | null;
  body: string;
  createdAt: number;
  hugs: number;
  huggedByMe: boolean;
  comments: FeedComment[];
  mine: boolean;
}

export interface MyPost {
  id: string;
  body: string;
  phase: string | null;
  createdAt: number;
}

interface PostRow {
  id: string;
  user_id: string | null;
  author_name: string | null;
  anonymous: boolean;
  phase: string | null;
  body: string;
  seed_hugs: number;
  created_at: string;
}
interface HugRow {
  post_id: string;
  user_id: string;
}
interface CommentRow {
  id: string;
  post_id: string;
  user_id: string | null;
  author_name: string | null;
  anonymous: boolean;
  body: string;
  created_at: string;
}

interface CommunityContextValue {
  feed: FeedPost[];
  myPosts: MyPost[];
  ready: boolean;
  refresh: () => void;
  addPost: (input: { body: string; phase?: string | null; anonymous: boolean }) => Promise<boolean>;
  toggleHug: (postId: string) => void;
  addComment: (postId: string, input: { body: string; anonymous: boolean }) => Promise<boolean>;
  reportPost: (postId: string) => void;
  deletePost: (postId: string) => void;
  deleteComment: (commentId: string) => void;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

function displayName(anonymous: boolean, name: string | null): string {
  return anonymous ? 'Anonymous' : name?.trim() || 'Someone';
}
function initialOf(name: string): string {
  return (name[0] ?? 'A').toUpperCase();
}

export function CommunityProvider({
  userId,
  authorName,
  children,
}: {
  userId: string;
  authorName: string;
  children: ReactNode;
}) {
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [hugs, setHugs] = useState<HugRow[]>([]);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [reports, setReports] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  const load = useCallback(async () => {
    const [p, h, cm, r] = await Promise.all([
      supabase.from('community_posts').select('*').order('created_at', { ascending: false }).limit(200),
      supabase.from('community_hugs').select('post_id,user_id'),
      supabase.from('community_comments').select('*').order('created_at', { ascending: true }),
      supabase.from('community_reports').select('post_id'),
    ]);
    if (p.data) setPosts(p.data as PostRow[]);
    if (h.data) setHugs(h.data as HugRow[]);
    if (cm.data) setComments(cm.data as CommentRow[]);
    if (r.data) setReports((r.data as { post_id: string }[]).map((x) => x.post_id));
    setReady(true);
  }, []);

  // Load + subscribe to realtime changes (debounced re-fetch on any change).
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    let active = true;
    load();
    const bump = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (active) load();
      }, 600);
    };
    const channel = supabase
      .channel('community-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_posts' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_hugs' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'community_comments' }, bump)
      .subscribe();
    return () => {
      active = false;
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const feed = useMemo<FeedPost[]>(() => {
    const hugCount = new Map<string, number>();
    const myHug = new Set<string>();
    for (const h of hugs) {
      hugCount.set(h.post_id, (hugCount.get(h.post_id) ?? 0) + 1);
      if (h.user_id === userId) myHug.add(h.post_id);
    }
    const byPost = new Map<string, FeedComment[]>();
    for (const cm of comments) {
      const name = displayName(cm.anonymous, cm.author_name);
      const arr = byPost.get(cm.post_id) ?? [];
      arr.push({
        id: cm.id,
        author: name,
        initial: initialOf(name),
        body: cm.body,
        createdAt: Date.parse(cm.created_at),
        mine: cm.user_id === userId,
      });
      byPost.set(cm.post_id, arr);
    }
    const reported = new Set(reports);
    return posts
      .filter((p) => !reported.has(p.id))
      .map((p) => {
        const name = displayName(p.anonymous, p.author_name);
        return {
          id: p.id,
          author: name,
          initial: initialOf(name),
          anonymous: p.anonymous,
          phase: p.phase,
          body: p.body,
          createdAt: Date.parse(p.created_at),
          hugs: (p.seed_hugs ?? 0) + (hugCount.get(p.id) ?? 0),
          huggedByMe: myHug.has(p.id),
          comments: byPost.get(p.id) ?? [],
          mine: p.user_id === userId,
        };
      });
  }, [posts, hugs, comments, reports, userId]);

  const myPosts = useMemo<MyPost[]>(
    () =>
      posts
        .filter((p) => p.user_id === userId)
        .map((p) => ({ id: p.id, body: p.body, phase: p.phase, createdAt: Date.parse(p.created_at) })),
    [posts, userId],
  );

  const addPost = useCallback<CommunityContextValue['addPost']>(
    async ({ body, phase = null, anonymous }) => {
      const trimmed = body.trim();
      if (!trimmed) return false;
      const { data, error } = await supabase
        .from('community_posts')
        .insert({ user_id: userId, author_name: authorName, anonymous, phase, body: trimmed })
        .select('*')
        .single();
      if (error || !data) return false;
      setPosts((prev) => [data as PostRow, ...prev]);
      return true;
    },
    [userId, authorName],
  );

  const toggleHug = useCallback<CommunityContextValue['toggleHug']>(
    (postId) => {
      const has = hugs.some((h) => h.post_id === postId && h.user_id === userId);
      if (has) {
        setHugs((prev) => prev.filter((h) => !(h.post_id === postId && h.user_id === userId)));
        supabase.from('community_hugs').delete().match({ post_id: postId, user_id: userId }).then(() => {});
      } else {
        setHugs((prev) => [...prev, { post_id: postId, user_id: userId }]);
        supabase.from('community_hugs').insert({ post_id: postId, user_id: userId }).then(() => {});
      }
    },
    [hugs, userId],
  );

  const addComment = useCallback<CommunityContextValue['addComment']>(
    async (postId, { body, anonymous }) => {
      const trimmed = body.trim();
      if (!trimmed) return false;
      const { data, error } = await supabase
        .from('community_comments')
        .insert({ post_id: postId, user_id: userId, author_name: authorName, anonymous, body: trimmed })
        .select('*')
        .single();
      if (error || !data) return false;
      setComments((prev) => [...prev, data as CommentRow]);
      return true;
    },
    [userId, authorName],
  );

  const reportPost = useCallback<CommunityContextValue['reportPost']>(
    (postId) => {
      setReports((prev) => (prev.includes(postId) ? prev : [...prev, postId]));
      supabase.from('community_reports').insert({ post_id: postId, reporter_id: userId }).then(() => {});
    },
    [userId],
  );

  const deletePost = useCallback<CommunityContextValue['deletePost']>((postId) => {
    setPosts((prev) => prev.filter((p) => p.id !== postId));
    supabase.from('community_posts').delete().eq('id', postId).then(() => {});
  }, []);

  const deleteComment = useCallback<CommunityContextValue['deleteComment']>((commentId) => {
    setComments((prev) => prev.filter((cm) => cm.id !== commentId));
    supabase.from('community_comments').delete().eq('id', commentId).then(() => {});
  }, []);

  const value = useMemo(
    () => ({
      feed,
      myPosts,
      ready,
      refresh: load,
      addPost,
      toggleHug,
      addComment,
      reportPost,
      deletePost,
      deleteComment,
    }),
    [feed, myPosts, ready, load, addPost, toggleHug, addComment, reportPost, deletePost, deleteComment],
  );

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within a CommunityProvider');
  return ctx;
}
