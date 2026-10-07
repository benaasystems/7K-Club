import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isConfigured, supabase } from '../lib/supabase';
import type { Lang, Profile } from '../lib/types';
import { useI18n } from '../i18n/I18nProvider';

interface AuthValue {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  changeLanguage: (lang: Lang) => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setLang } = useI18n();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(isConfigured);
  const [profileLoading, setProfileLoading] = useState(false);
  const userId = session?.user.id;

  useEffect(() => {
    if (!isConfigured) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setSessionLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (id: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', id).maybeSingle();
    setProfile((data as Profile) ?? null);
    return data as Profile | null;
  }, []);

  // Load the profile whenever the signed-in user changes, and apply their saved language.
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setProfileLoading(true);
    loadProfile(userId)
      .then((p) => p?.language && setLang(p.language))
      .finally(() => setProfileLoading(false));
  }, [userId, loadProfile, setLang]);

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [userId, loadProfile]);

  const changeLanguage = useCallback(
    (lang: Lang) => {
      setLang(lang);
      if (userId) {
        setProfile((p) => (p ? { ...p, language: lang } : p));
        supabase.from('profiles').update({ language: lang }).eq('id', userId).then(() => undefined);
      }
    },
    [userId, setLang],
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ session, profile, loading: sessionLoading || profileLoading, refreshProfile, changeLanguage, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
