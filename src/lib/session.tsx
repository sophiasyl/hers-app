import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

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

const ACCOUNTS_KEY = 'hers.accounts.v1';
const SESSION_KEY = 'hers.session.v1';
const PROFILES_KEY = 'hers.profiles.v1';

// NOTE: local-only placeholder auth (passwords stored on-device). Phase 2 swaps
// this for Supabase auth (hashing + server sessions).
interface Account {
  name: string;
  password: string;
}
type Accounts = Record<string, Account>;

const EMPTY_PROFILE: Profile = { onboarded: false, name: '', pet: null };

interface AuthResult {
  ok: boolean;
  error?: string;
}

interface SessionValue {
  ready: boolean;
  email: string | null;
  profile: Profile;
  signUp: (name: string, email: string, password: string) => Promise<AuthResult>;
  logIn: (email: string, password: string) => Promise<AuthResult>;
  logOut: () => void;
  completeOnboarding: (data: { name: string; pet: Pet }) => void;
}

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Accounts>({});
  const [email, setEmail] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [[, a], [, s], [, p]] = await AsyncStorage.multiGet([
          ACCOUNTS_KEY,
          SESSION_KEY,
          PROFILES_KEY,
        ]);
        if (!active) return;
        if (a) setAccounts(JSON.parse(a));
        if (s) setEmail(JSON.parse(s).email ?? null);
        if (p) setProfiles(JSON.parse(p));
      } catch {
        // ignore corrupt store
      } finally {
        if (active) setReady(true);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  // Current account's profile (per-account, so switching login shows its own data).
  const profile: Profile = (email && profiles[email]) || EMPTY_PROFILE;

  const signUp = useCallback<SessionValue['signUp']>(
    async (name, em, password) => {
      const e = em.trim().toLowerCase();
      if (!name.trim()) return { ok: false, error: 'Please enter your name.' };
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) return { ok: false, error: 'Enter a valid email.' };
      if (password.length < 6) return { ok: false, error: 'Password must be at least 6 characters.' };
      if (accounts[e]) return { ok: false, error: 'An account with this email already exists.' };
      const nextAccounts: Accounts = { ...accounts, [e]: { name: name.trim(), password } };
      const nextProfiles: Record<string, Profile> = {
        ...profiles,
        [e]: { onboarded: false, name: name.trim(), pet: null },
      };
      setAccounts(nextAccounts);
      setProfiles(nextProfiles);
      setEmail(e);
      await AsyncStorage.multiSet([
        [ACCOUNTS_KEY, JSON.stringify(nextAccounts)],
        [SESSION_KEY, JSON.stringify({ email: e })],
        [PROFILES_KEY, JSON.stringify(nextProfiles)],
      ]);
      return { ok: true };
    },
    [accounts, profiles],
  );

  const logIn = useCallback<SessionValue['logIn']>(
    async (em, password) => {
      const e = em.trim().toLowerCase();
      const acc = accounts[e];
      if (!acc) return { ok: false, error: 'No account found for this email.' };
      if (acc.password !== password) return { ok: false, error: 'Incorrect password.' };
      setEmail(e);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({ email: e }));
      return { ok: true };
    },
    [accounts],
  );

  const logOut = useCallback(() => {
    setEmail(null);
    AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
  }, []);

  const completeOnboarding = useCallback<SessionValue['completeOnboarding']>(
    ({ name, pet }) => {
      if (!email) return;
      setProfiles((prev) => {
        const cur = prev[email] || EMPTY_PROFILE;
        const next = { ...prev, [email]: { onboarded: true, name: name.trim() || cur.name, pet } };
        AsyncStorage.setItem(PROFILES_KEY, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [email],
  );

  const value = useMemo<SessionValue>(
    () => ({ ready, email, profile, signUp, logIn, logOut, completeOnboarding }),
    [ready, email, profile, signUp, logIn, logOut, completeOnboarding],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
