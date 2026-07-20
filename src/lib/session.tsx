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

export interface Pet {
  key: string;
  name: string;
}

export interface Profile {
  onboarded: boolean;
  name: string;
  pet: Pet | null;
}

export const PETS: { key: string; label: string; emoji: string }[] = [
  { key: 'cat', label: 'Cat', emoji: '🐱' },
  { key: 'bunny', label: 'Bunny', emoji: '🐰' },
  { key: 'fox', label: 'Fox', emoji: '🦊' },
  { key: 'penguin', label: 'Penguin', emoji: '🐧' },
  { key: 'bear', label: 'Bear', emoji: '🐻' },
  { key: 'panda', label: 'Panda', emoji: '🐼' },
];

export function petEmoji(key: string | undefined | null): string {
  return PETS.find((p) => p.key === key)?.emoji ?? '🌱';
}

const EMPTY_PROFILE: Profile = { onboarded: false, name: '', pet: null };

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface SessionValue {
  ready: boolean;
  email: string | null;
  userId: string | null;
  profile: Profile;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  logIn: (email: string, password: string) => Promise<AuthResult>;
  logOut: () => void;
  completeOnboarding: (data: { name: string; pet: Pet }) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

interface ProfileRow {
  name: string | null;
  pet_key: string | null;
  pet_name: string | null;
  onboarded: boolean | null;
}

function toProfile(row: ProfileRow | null): Profile {
  if (!row) return EMPTY_PROFILE;
  return {
    onboarded: !!row.onboarded,
    name: row.name ?? '',
    pet: row.pet_key ? { key: row.pet_key, name: row.pet_name ?? '' } : null,
  };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);

  const loadProfile = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('name,pet_key,pet_name,onboarded')
      .eq('id', uid)
      .maybeSingle();
    setProfile(toProfile(data as ProfileRow | null));
  }, []);

  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!active) return;
        const u = data.session?.user ?? null;
        setUserId(u?.id ?? null);
        setEmail(u?.email ?? null);
        if (u) await loadProfile(u.id);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUserId(u?.id ?? null);
      setEmail(u?.email ?? null);
      if (u) loadProfile(u.id);
      else setProfile(EMPTY_PROFILE);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback<SessionValue['signUp']>(async (name, em, password) => {
    const e = em.trim().toLowerCase();
    if (!name.trim()) return { ok: false, error: 'Please enter your name.' };
    const { data, error } = await supabase.auth.signUp({ email: e, password });
    if (error) return { ok: false, error: error.message };
    if (!data.session) return { ok: false, error: 'Check your email to confirm, then log in.' };
    await supabase.from('profiles').update({ name: name.trim() }).eq('id', data.user!.id);
    setProfile((p) => ({ ...p, name: name.trim() }));
    return { ok: true };
  }, []);

  const logIn = useCallback<SessionValue['logIn']>(async (em, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: em.trim().toLowerCase(),
      password,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  }, []);

  const logOut = useCallback(() => {
    supabase.auth.signOut().catch(() => {});
  }, []);

  const completeOnboarding = useCallback<SessionValue['completeOnboarding']>(
    ({ name, pet }) => {
      if (!userId) return;
      const trimmed = name.trim();
      setProfile((p) => ({ onboarded: true, name: trimmed || p.name, pet }));
      supabase
        .from('profiles')
        .update({ onboarded: true, name: trimmed || null, pet_key: pet.key, pet_name: pet.name })
        .eq('id', userId)
        .then(() => {});
    },
    [userId],
  );

  const value = useMemo<SessionValue>(
    () => ({ ready, email, userId, profile, signUp, logIn, logOut, completeOnboarding }),
    [ready, email, userId, profile, signUp, logIn, logOut, completeOnboarding],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
