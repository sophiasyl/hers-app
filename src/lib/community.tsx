import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { supabase } from './supabase';

export interface MyPost {
  id: string;
  body: string;
  phase: string | null;
  createdAt: number;
}

interface PostRow {
  id: string;
  body: string;
  phase: string | null;
  created_at: string;
}

function rowToPost(r: PostRow): MyPost {
  return { id: r.id, body: r.body, phase: r.phase, createdAt: Date.parse(r.created_at) };
}

interface CommunityContextValue {
  myPosts: MyPost[];
  ready: boolean;
  addPost: (input: { body: string; phase?: string | null }) => Promise<MyPost | null>;
}

const CommunityContext = createContext<CommunityContextValue | null>(null);

export function CommunityProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [myPosts, setMyPosts] = useState<MyPost[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase
      .from('community_posts')
      .select('id,body,phase,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        if (data) setMyPosts((data as PostRow[]).map(rowToPost));
        setReady(true);
      });
    return () => {
      active = false;
    };
  }, [userId]);

  const addPost = useCallback<CommunityContextValue['addPost']>(
    async ({ body, phase = null }) => {
      const trimmed = body.trim();
      if (!trimmed) return null;
      const { data } = await supabase
        .from('community_posts')
        .insert({ user_id: userId, body: trimmed, phase })
        .select('id,body,phase,created_at')
        .single();
      if (!data) return null;
      const post = rowToPost(data as PostRow);
      setMyPosts((prev) => [post, ...prev]);
      return post;
    },
    [userId],
  );

  const value = useMemo(() => ({ myPosts, ready, addPost }), [myPosts, ready, addPost]);
  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity(): CommunityContextValue {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error('useCommunity must be used within a CommunityProvider');
  return ctx;
}
