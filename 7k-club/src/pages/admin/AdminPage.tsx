import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Eye, EyeOff, Home, Megaphone, Pencil, Plus, Search, Settings2, Trash2, Users } from 'lucide-react';
import { ImageUpload } from '../../components/ImageUpload';
import { Alert, Avatar, Empty, Field, Modal, PageLoader, Spinner, Tabs } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { supabase } from '../../lib/supabase';
import type { Announcement, Branch, Profile, Role, SiteSettings } from '../../lib/types';
import { setSiteSettingsCache } from '../../lib/useSiteSettings';
import { tr } from '../../lib/utils';
import { AnnouncementForm, BranchForm } from './forms';

type Tab = 'branches' | 'content' | 'users';

export default function AdminPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = (['branches', 'content', 'users'].includes(params.get('tab') ?? '') ? params.get('tab') : 'branches') as Tab;

  return (
    <div className="container-x py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold">{t('admin.title')}</h1>
      <p className="mt-1 text-white/55">{t('admin.subtitle')}</p>
      <div className="mt-8">
        <Tabs<Tab>
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          options={[
            { value: 'branches', label: <><Building2 className="h-4 w-4" /> {t('admin.tab.branches')}</> },
            { value: 'content', label: <><Home className="h-4 w-4" /> {t('admin.tab.content')}</> },
            { value: 'users', label: <><Users className="h-4 w-4" /> {t('admin.tab.users')}</> },
          ]}
        />
      </div>
      <div className="mt-8">
        {tab === 'branches' && <BranchesAdmin />}
        {tab === 'content' && <ContentAdmin />}
        {tab === 'users' && <UsersAdmin />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BranchesAdmin() {
  const { t, lang } = useI18n();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('branches').select('*').order('sort_order').order('created_at');
    setBranches((data as Branch[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (b: Branch) => {
    await supabase.from('branches').update({ is_active: !b.is_active }).eq('id', b.id);
    load();
  };
  const remove = async (b: Branch) => {
    if (!window.confirm(`${tr(b, 'name', lang)} — ${t('admin.confirmDelete')}`)) return;
    await supabase.from('branches').delete().eq('id', b.id);
    load();
  };

  if (!branches) return <PageLoader />;

  return (
    <>
      <div className="mb-5 flex justify-end">
        <button className="btn-primary" onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> {t('admin.newBranch')}
        </button>
      </div>
      {branches.length === 0 ? (
        <Empty icon={<Building2 className="h-10 w-10" />} text={t('admin.empty')} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => (
            <div key={b.id} className="card flex flex-col overflow-hidden">
              <div className="relative h-32 bg-gradient-to-br from-gold-500/20 to-ink-800">
                {b.image_url ? <img src={b.image_url} alt="" className="h-full w-full object-cover" /> : <img src="/logo.svg" alt="" className="absolute inset-0 m-auto h-16 w-16 opacity-80" />}
                <span className={`chip absolute end-3 top-3 ${b.is_active ? 'border-emerald-400/30 bg-emerald-500/20 text-emerald-200' : 'bg-ink-950/70'}`}>
                  {b.is_active ? t('admin.active') : t('admin.hidden')}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-4">
                <p className="font-bold">{tr(b, 'name', lang)}</p>
                <p className="text-sm text-white/50">{tr(b, 'address', lang)}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link to={`/admin/branches/${b.id}`} className="btn-primary btn-sm">
                    <Settings2 className="h-3.5 w-3.5" /> {t('admin.manage')}
                  </Link>
                  <button className="btn-ghost btn-sm" onClick={() => toggle(b)} title={b.is_active ? t('admin.hidden') : t('admin.active')}>
                    {b.is_active ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => remove(b)} aria-label={t('admin.delete')}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={creating} onClose={() => setCreating(false)} title={t('admin.newBranch')} wide>
        <BranchForm
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ContentAdmin() {
  const { t, lang } = useI18n();
  const [ads, setAds] = useState<Announcement[] | null>(null);
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('announcements').select('*').order('sort_order').order('created_at');
    setAds((data as Announcement[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const remove = async (a: Announcement) => {
    if (!window.confirm(t('admin.confirmDelete'))) return;
    await supabase.from('announcements').delete().eq('id', a.id);
    load();
  };
  const toggle = async (a: Announcement) => {
    await supabase.from('announcements').update({ is_active: !a.is_active }).eq('id', a.id);
    load();
  };

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold"><Megaphone className="h-5 w-5 text-gold-400" /> {t('admin.ads.title')}</h2>
            <p className="text-sm text-white/50">{t('admin.ads.subtitle')}</p>
          </div>
          <button className="btn-primary self-start" onClick={() => setEditing('new')}>
            <Plus className="h-4 w-4" /> {t('admin.newAd')}
          </button>
        </div>
        {!ads ? (
          <Spinner />
        ) : ads.length === 0 ? (
          <Empty text={t('admin.ads.empty')} />
        ) : (
          <div className="space-y-3">
            {ads.map((a) => (
              <div key={a.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {a.image_url && <img src={a.image_url} alt="" className="h-20 w-full rounded-xl object-cover sm:w-32" />}
                <div className="min-w-0 flex-1">
                  <p className="font-bold">{tr(a, 'title', lang)}</p>
                  <p className="line-clamp-2 whitespace-pre-line text-sm text-white/55">{tr(a, 'body', lang)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button className="btn-ghost btn-sm" onClick={() => toggle(a)} title={a.is_active ? t('admin.hidden') : t('admin.active')}>
                    {a.is_active ? <Eye className="h-3.5 w-3.5 text-emerald-300" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                  <button className="btn-ghost btn-sm" onClick={() => setEditing(a)}>
                    <Pencil className="h-3.5 w-3.5" /> {t('admin.edit')}
                  </button>
                  <button className="btn-danger btn-sm" onClick={() => remove(a)} aria-label={t('admin.delete')}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <AboutForm />

      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? t('admin.newAd') : t('admin.editAd')} wide>
        {editing && (
          <AnnouncementForm
            ad={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function AboutForm() {
  const { t } = useI18n();
  const [f, setF] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setF(data as SiteSettings));
  }, []);

  if (!f) return <Spinner />;
  const set = (k: keyof SiteSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const { id: _id, ...rest } = f;
    const { data, error } = await supabase.from('site_settings').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', 1).select().single();
    setSaving(false);
    if (error) return setMsg({ kind: 'error', text: error.message });
    setSiteSettingsCache(data as SiteSettings);
    setMsg({ kind: 'success', text: t('admin.saved') });
  };

  return (
    <section>
      <h2 className="text-xl font-bold">{t('admin.about.title')}</h2>
      <p className="mb-5 text-sm text-white/50">{t('admin.about.subtitle')}</p>
      <form onSubmit={submit} className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field label={t('f.aboutEn')}><textarea className="input min-h-[160px]" value={f.about_en} onChange={set('about_en')} /></Field>
        <Field label={t('f.aboutAr')}><textarea className="input min-h-[160px]" dir="rtl" value={f.about_ar} onChange={set('about_ar')} /></Field>
        <div className="sm:col-span-2"><ImageUpload folder="about" value={f.about_image_url} onChange={(about_image_url) => setF({ ...f, about_image_url })} /></div>
        <Field label={t('f.phone')}><input className="input" dir="ltr" value={f.phone} onChange={set('phone')} /></Field>
        <Field label={t('f.email')}><input className="input" dir="ltr" type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label={t('f.addressEn')}><input className="input" value={f.address_en} onChange={set('address_en')} /></Field>
        <Field label={t('f.addressAr')}><input className="input" dir="rtl" value={f.address_ar} onChange={set('address_ar')} /></Field>
        <Field label={t('f.instagram')}><input className="input" dir="ltr" type="url" value={f.instagram_url} onChange={set('instagram_url')} /></Field>
        <Field label={t('f.facebook')}><input className="input" dir="ltr" type="url" value={f.facebook_url} onChange={set('facebook_url')} /></Field>
        {msg && <div className="sm:col-span-2"><Alert kind={msg.kind}>{msg.text}</Alert></div>}
        <div className="flex justify-end sm:col-span-2">
          <button className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-ink-950" />} {t('admin.save')}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function UsersAdmin() {
  const { t, lang } = useI18n();
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [q, setQ] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const [u, b] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('branches').select('*').order('sort_order'),
    ]);
    setUsers((u.data as Profile[]) ?? []);
    setBranches((b.data as Branch[]) ?? []);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const update = async (u: Profile, patch: Partial<Pick<Profile, 'role' | 'branch_id'>>) => {
    setSavingId(u.id);
    setError('');
    const { error } = await supabase.from('profiles').update(patch).eq('id', u.id);
    setSavingId(null);
    if (error) setError(error.message);
    else setUsers((list) => list?.map((x) => (x.id === u.id ? { ...x, ...patch } : x)) ?? null);
  };

  if (!users) return <PageLoader />;
  const needle = q.trim().toLowerCase();
  const filtered = needle
    ? users.filter((u) => [u.full_name, u.email, u.phone].some((v) => v?.toLowerCase().includes(needle)))
    : users;

  return (
    <div>
      <p className="mb-4 text-sm text-white/50">{t('admin.users.subtitle')}</p>
      <div className="relative mb-5 max-w-md">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input className="input ps-10" placeholder={t('admin.users.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      <div className="space-y-2">
        {filtered.map((u) => (
          <div key={u.id} className="card flex flex-col gap-3 p-4 md:flex-row md:items-center">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar url={u.avatar_url} name={u.full_name || u.email || '?'} size={40} />
              <div className="min-w-0">
                <p className="truncate font-semibold">{u.full_name || '—'}</p>
                <p className="truncate text-sm text-white/50">
                  {u.email} {u.phone && <span dir="ltr">· {u.phone}</span>}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 md:flex md:items-center">
              <select className="input py-2 md:w-36" value={u.role} disabled={savingId === u.id} onChange={(e) => update(u, { role: e.target.value as Role })} aria-label={t('f.role')}>
                {(['customer', 'staff', 'admin'] as Role[]).map((r) => (
                  <option key={r} value={r}>{t(`role.${r}`)}</option>
                ))}
              </select>
              <select
                className="input py-2 md:w-48"
                value={u.branch_id ?? ''}
                disabled={u.role !== 'staff' || savingId === u.id}
                onChange={(e) => update(u, { branch_id: e.target.value || null })}
                aria-label={t('f.staffBranch')}
              >
                <option value="">{t('staff.allBranches')}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{tr(b, 'name', lang)}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
