import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera } from 'lucide-react';
import { Alert, Avatar, Field, PageLoader, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthProvider';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../lib/supabase';
import type { Lang } from '../lib/types';
import { uploadImage } from '../lib/utils';

export default function Profile() {
  const { t } = useI18n();
  const { session, profile, refreshProfile, changeLanguage } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ full_name: '', phone: '', email: '', language: 'en' as Lang });
  const [avatar, setAvatar] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    if (profile) {
      setForm({ full_name: profile.full_name, phone: profile.phone, email: profile.email ?? session?.user.email ?? '', language: profile.language });
      setAvatar(profile.avatar_url);
    }
  }, [profile, session]);

  if (!profile || !session) return <PageLoader />;

  const onPhoto = async (file?: File) => {
    if (!file) return;
    setUploading(true);
    setMessage(null);
    try {
      const url = await uploadImage('avatars', profile.id, file);
      const { error } = await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
      if (error) throw error;
      setAvatar(url);
      await refreshProfile();
    } catch (e) {
      setMessage({ kind: 'error', text: (e as Error).message });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: form.full_name.trim(), phone: form.phone.trim(), language: form.language })
      .eq('id', profile.id);
    if (error) {
      setSaving(false);
      return setMessage({ kind: 'error', text: error.message });
    }
    let text = t('profile.saved');
    const newEmail = form.email.trim();
    if (newEmail && newEmail !== session.user.email) {
      const { error: emailError } = await supabase.auth.updateUser({ email: newEmail });
      if (emailError) {
        setSaving(false);
        return setMessage({ kind: 'error', text: emailError.message });
      }
      text = t('profile.emailChange');
    }
    changeLanguage(form.language);
    await refreshProfile();
    setSaving(false);
    setMessage({ kind: 'success', text });
  };

  return (
    <div className="container-x max-w-3xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold">{t('profile.title')}</h1>
      <p className="mt-1 text-white/55">{t('profile.subtitle')}</p>

      <div className="card mt-8 p-6 sm:p-8">
        <div className="flex flex-col items-center gap-5 sm:flex-row">
          <div className="relative">
            <Avatar url={avatar} name={form.full_name || form.email} size={96} />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -end-1 flex h-9 w-9 items-center justify-center rounded-full border-2 border-ink-900 bg-gold-400 text-ink-950 hover:brightness-110"
              aria-label={t('profile.changePhoto')}
            >
              {uploading ? <Spinner className="h-4 w-4 text-ink-950" /> : <Camera className="h-4 w-4" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
          </div>
          <div className="text-center sm:text-start">
            <p className="text-xl font-bold">{profile.full_name || '—'}</p>
            <p className="text-sm text-white/50">{session.user.email}</p>
            <span className="chip mt-2 border-gold-400/30 text-gold-300">{t(`role.${profile.role}`)}</span>
          </div>
        </div>

        <form onSubmit={submit} className="mt-8 grid gap-5 sm:grid-cols-2">
          <Field label={t('f.fullName')}>
            <input className="input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
          </Field>
          <Field label={t('f.phone')}>
            <input className="input" type="tel" dir="ltr" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </Field>
          <Field label={t('f.email')}>
            <input className="input" type="email" dir="ltr" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </Field>
          <Field label={t('f.language')}>
            <select className="input" value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value as Lang })}>
              <option value="en">English</option>
              <option value="ar">العربية</option>
            </select>
          </Field>
          {message && (
            <div className="sm:col-span-2">
              <Alert kind={message.kind}>{message.text}</Alert>
            </div>
          )}
          <div className="sm:col-span-2">
            <button className="btn-primary w-full sm:w-auto" disabled={saving}>
              {saving && <Spinner className="h-4 w-4 text-ink-950" />} {t('admin.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
