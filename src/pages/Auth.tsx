import { useEffect, useState, type FormEvent, type InputHTMLAttributes, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Phone, User } from 'lucide-react';
import { PasswordInput, PasswordStrength, isPasswordValid } from '../components/PasswordInput';
import { Segmented } from '../components/Select';
import { Alert, Spinner } from '../components/ui';
import { OAUTH_LANG_KEY, useAuth } from '../context/AuthProvider';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../lib/supabase';
import type { Lang } from '../lib/types';
import { cn } from '../lib/utils';

function AuthShell({
  title,
  subtitle,
  children,
  footer,
  wide,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative flex min-h-[calc(100dvh-72px)] items-center justify-center overflow-hidden px-4 py-6 sm:py-8">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      <div className="pointer-events-none absolute top-10 h-80 w-80 rounded-full bg-gold-500/20 blur-[120px]" />
      <div className={cn('card relative w-full animate-fade-up bg-ink-900/80 p-5 sm:p-7', wide ? 'max-w-xl' : 'max-w-md')}>
        <div className="flex items-center gap-4">
          <img src="/logo.svg" alt="7K Club" className="h-12 w-12 shrink-0 rounded-full ring-1 ring-gold-400/40" />
          <div className="min-w-0">
            <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
            <p className="text-sm text-white/55">{subtitle}</p>
          </div>
        </div>
        <div className="mt-6">{children}</div>
        <p className="mt-5 text-center text-sm text-white/55">{footer}</p>
      </div>
    </div>
  );
}

export function IconInput({ icon, ...props }: { icon: ReactNode } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-white/35">{icon}</span>
      <input {...props} className="input ps-10" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

/** "Continue with Google" — signs in, or creates the account on first use. */
function GoogleButton({ next }: { next: string }) {
  const { t, lang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const go = async () => {
    setBusy(true);
    setError('');
    // A brand-new Google account has no language yet: remember the one they're browsing in.
    try { localStorage.setItem(OAUTH_LANG_KEY, lang); } catch { /* storage unavailable */ }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // Back to the sign-in page, which forwards to `next` once the session is ready.
        redirectTo: `${window.location.origin}/signin${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`,
        queryParams: { prompt: 'select_account' },
      },
    });
    if (error) {
      setBusy(false);
      setError(/not enabled|unsupported provider/i.test(error.message) ? t('auth.googleOff') : error.message);
    }
  };

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="btn w-full bg-white py-3 text-ink-950 shadow-sm hover:bg-white/90 active:scale-[0.98]"
      >
        {busy ? <Spinner className="h-5 w-5 text-ink-950" /> : <GoogleIcon />} {t('auth.google')}
      </button>
      {error && <Alert>{error}</Alert>}
      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-white/35">
        <span className="h-px flex-1 bg-white/10" /> {t('auth.or')} <span className="h-px flex-1 bg-white/10" />
      </div>
    </div>
  );
}

function useRedirectWhenSignedIn() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next') || '/';
  useEffect(() => {
    if (session) navigate(next.startsWith('/') ? next : '/', { replace: true });
  }, [session, next, navigate]);
  return next;
}

export function SignIn() {
  const { t } = useI18n();
  const next = useRedirectWhenSignedIn();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setError(error.message.toLowerCase().includes('invalid') ? t('auth.invalid') : error.message);
  };

  return (
    <AuthShell
      title={t('auth.signin.title')}
      subtitle={t('auth.signin.subtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to={`/signup${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-gold-400 hover:underline">
            {t('nav.signup')}
          </Link>
        </>
      }
    >
      <GoogleButton next={next} />
      <form onSubmit={submit} className="mt-4 space-y-4">
        <label className="block">
          <span className="label">{t('f.email')}</span>
          <IconInput icon={<Mail className="h-4 w-4" />} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        </label>
        <label className="block">
          <span className="label">{t('f.password')}</span>
          <PasswordInput required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <Alert>{error}</Alert>}
        <button className="btn-primary w-full py-3" disabled={busy}>
          {busy && <Spinner className="h-4 w-4 text-ink-950" />} {t('nav.signin')}
        </button>
      </form>
    </AuthShell>
  );
}

export function SignUp() {
  const { t, lang } = useI18n();
  const next = useRedirectWhenSignedIn();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', language: lang as Lang });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const passwordOk = isPasswordValid(form.password);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordOk) return;
    setBusy(true);
    setError('');
    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { full_name: form.full_name.trim(), phone: form.phone.trim(), language: form.language },
        emailRedirectTo: window.location.origin,
      },
    });
    setBusy(false);
    if (error) return setError(/already|registered/i.test(error.message) ? t('err.EMAIL_TAKEN') : error.message);
    // When email confirmation is enabled there is no session yet.
    if (!data.session) setDone(true);
  };

  return (
    <AuthShell
      wide
      title={t('auth.signup.title')}
      subtitle={t('auth.signup.subtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to={`/signin${next !== '/' ? `?next=${encodeURIComponent(next)}` : ''}`} className="font-semibold text-gold-400 hover:underline">
            {t('nav.signin')}
          </Link>
        </>
      }
    >
      {done ? (
        <Alert kind="success">{t('auth.checkEmail')}</Alert>
      ) : (
        <>
          <GoogleButton next={next} />
          <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="label">{t('f.fullName')}</span>
              <IconInput icon={<User className="h-4 w-4" />} required autoComplete="name" value={form.full_name} onChange={set('full_name')} />
            </label>
            <label className="block">
              <span className="label">{t('f.phone')}</span>
              <IconInput icon={<Phone className="h-4 w-4" />} type="tel" required autoComplete="tel" placeholder="01xxxxxxxxx" value={form.phone} onChange={set('phone')} dir="ltr" />
            </label>
            <label className="block sm:col-span-2">
              <span className="label">{t('f.email')}</span>
              <IconInput icon={<Mail className="h-4 w-4" />} type="email" required autoComplete="email" placeholder="name@example.com" value={form.email} onChange={set('email')} dir="ltr" />
            </label>
            <div className="sm:col-span-2">
              <label className="block">
                <span className="label">{t('f.password')}</span>
                <PasswordInput required minLength={8} autoComplete="new-password" value={form.password} onChange={set('password')} />
              </label>
              <PasswordStrength password={form.password} />
            </div>
            <div className="flex items-center justify-between gap-4 sm:col-span-2">
              <span className="text-sm font-medium text-white/70">{t('f.language')}</span>
              <div className="w-48">
                <Segmented<Lang>
                  value={form.language}
                  onChange={(language) => setForm((f) => ({ ...f, language }))}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'ar', label: 'العربية' },
                  ]}
                />
              </div>
            </div>
            {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
            <button className="btn-primary w-full py-3 sm:col-span-2" disabled={busy || !passwordOk}>
              {busy && <Spinner className="h-4 w-4 text-ink-950" />} {t('nav.signup')}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
