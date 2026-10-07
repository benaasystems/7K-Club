import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, Mail, Phone, User } from 'lucide-react';
import { Alert, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthProvider';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../lib/supabase';
import type { Lang } from '../lib/types';

function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  return (
    <div className="relative flex min-h-[calc(100dvh-72px)] items-center justify-center overflow-hidden px-4 py-12">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_70%)]" />
      <div className="pointer-events-none absolute top-10 h-80 w-80 rounded-full bg-gold-500/20 blur-[120px]" />
      <div className="card relative w-full max-w-md animate-fade-up bg-ink-900/80 p-6 sm:p-8">
        <img src="/logo.svg" alt="7K Club" className="mx-auto mb-5 h-16 w-16 rounded-full ring-1 ring-gold-400/40" />
        <h1 className="text-center text-2xl font-extrabold">{title}</h1>
        <p className="mt-1.5 text-center text-sm text-white/55">{subtitle}</p>
        <div className="mt-7">{children}</div>
        <p className="mt-6 text-center text-sm text-white/55">{footer}</p>
      </div>
    </div>
  );
}

function IconInput({ icon, ...props }: { icon: ReactNode } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-white/35">{icon}</span>
      <input {...props} className="input ps-10" />
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
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <span className="label">{t('f.email')}</span>
          <IconInput icon={<Mail className="h-4 w-4" />} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" />
        </label>
        <label className="block">
          <span className="label">{t('f.password')}</span>
          <IconInput icon={<Lock className="h-4 w-4" />} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} dir="ltr" />
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

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
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
    if (error) return setError(error.message);
    // When email confirmation is enabled there is no session yet.
    if (!data.session) setDone(true);
  };

  return (
    <AuthShell
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
        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="label">{t('f.fullName')}</span>
            <IconInput icon={<User className="h-4 w-4" />} required autoComplete="name" value={form.full_name} onChange={set('full_name')} />
          </label>
          <label className="block">
            <span className="label">{t('f.email')}</span>
            <IconInput icon={<Mail className="h-4 w-4" />} type="email" required autoComplete="email" value={form.email} onChange={set('email')} dir="ltr" />
          </label>
          <label className="block">
            <span className="label">{t('f.phone')}</span>
            <IconInput icon={<Phone className="h-4 w-4" />} type="tel" required autoComplete="tel" value={form.phone} onChange={set('phone')} dir="ltr" />
          </label>
          <label className="block">
            <span className="label">{t('f.password')}</span>
            <IconInput icon={<Lock className="h-4 w-4" />} type="password" required minLength={6} autoComplete="new-password" value={form.password} onChange={set('password')} dir="ltr" />
            <span className="mt-1 block text-xs text-white/40">{t('auth.passwordHint')}</span>
          </label>
          <label className="block">
            <span className="label">{t('f.language')}</span>
            <select className="input" value={form.language} onChange={set('language')}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </label>
          {error && <Alert>{error}</Alert>}
          <button className="btn-primary w-full py-3" disabled={busy}>
            {busy && <Spinner className="h-4 w-4 text-ink-950" />} {t('nav.signup')}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
