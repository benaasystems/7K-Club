import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Building2,
  Check,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  Gauge,
  Home,
  Mail,
  Megaphone,
  Pencil,
  Phone,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
  Wand2,
} from 'lucide-react';
import { ImageUpload } from '../../components/ImageUpload';
import { PasswordInput, PasswordStrength, isPasswordValid } from '../../components/PasswordInput';
import { Segmented, Select, type SelectOption } from '../../components/Select';
import { Ticker, tickerLines } from '../../components/Ticker';
import { Alert, Avatar, Empty, Field, Modal, PageLoader, SavedNote, Spinner, Tabs, Toggle, useConfirm, useFlash } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { supabase } from '../../lib/supabase';
import type { Announcement, Branch, Lang, Profile, Role, SiteSettings } from '../../lib/types';
import { DEFAULT_AD_INTERVAL, setSiteSettingsCache, useSiteSettings } from '../../lib/useSiteSettings';
import { cn, tr } from '../../lib/utils';
import { IconInput } from '../Auth';
import { AnnouncementForm, BranchForm } from './forms';

type Tab = 'branches' | 'content' | 'users';

export default function AdminPage() {
  const { t } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = (['branches', 'content', 'users'].includes(params.get('tab') ?? '') ? params.get('tab') : 'branches') as Tab;

  // Tabs stay mounted once opened, so switching back is instant (no spinner, no lost scroll/edits).
  const [visited, setVisited] = useState<Tab[]>([tab]);
  if (!visited.includes(tab)) setVisited([...visited, tab]);
  const panel = (id: Tab, node: ReactNode) =>
    visited.includes(id) && (
      <div hidden={tab !== id} className="animate-fade-up-fast motion-reduce:animate-none">
        {node}
      </div>
    );

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
      <div className="mt-8 min-h-[50vh]">
        {panel('branches', <BranchesAdmin active={tab === 'branches'} />)}
        {panel('content', <ContentAdmin active={tab === 'content'} />)}
        {panel('users', <UsersAdmin active={tab === 'users'} />)}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BranchesAdmin({ active }: { active: boolean }) {
  const { t, lang } = useI18n();
  const [confirm, confirmDialog] = useConfirm();
  const [branches, setBranches] = useState<Branch[] | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from('branches').select('*').order('sort_order').order('created_at');
    setBranches((data as Branch[]) ?? []);
  }, []);
  // Refetch quietly whenever the tab is shown again; the loader only appears on the very first load.
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const toggle = async (b: Branch) => {
    await supabase.from('branches').update({ is_active: !b.is_active }).eq('id', b.id);
    load();
  };
  const remove = async (b: Branch) => {
    if (!(await confirm({ title: t('admin.deleteNamed', { name: tr(b, 'name', lang) }), message: t('admin.confirmDelete'), confirmLabel: t('admin.delete'), danger: true }))) return;
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
      {confirmDialog}
    </>
  );
}

/* ------------------------------------------------------------------ */

function ContentAdmin({ active }: { active: boolean }) {
  const { t, lang } = useI18n();
  const [confirm, confirmDialog] = useConfirm();
  const [ads, setAds] = useState<Announcement[] | null>(null);
  const [editing, setEditing] = useState<Announcement | 'new' | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('announcements').select('*').order('sort_order').order('created_at');
    setAds((data as Announcement[]) ?? []);
  }, []);
  // Refetch quietly whenever the tab is shown again; the loader only appears on the very first load.
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const remove = async (a: Announcement) => {
    if (!(await confirm({ title: t('admin.deleteAd'), message: t('admin.confirmDelete'), confirmLabel: t('admin.delete'), danger: true }))) return;
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

      <TickerSettings ads={ads ?? []} />

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
      {confirmDialog}
    </div>
  );
}

const AD_INTERVALS = [5, 7, 10, 15];

/** Slideshow timing + scrolling ticker, saved together. */
function TickerSettings({ ads }: { ads: Announcement[] }) {
  const { t, lang } = useI18n();
  const current = useSiteSettings();
  const [enabled, setEnabled] = useState(true);
  const [speed, setSpeed] = useState(3);
  const [adInterval, setAdInterval] = useState(DEFAULT_AD_INTERVAL);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const saved = useFlash();
  const lines = tickerLines(ads, lang);

  useEffect(() => {
    if (!current) return;
    setEnabled(current.ticker_enabled !== false);
    setSpeed(current.ticker_speed ?? 3);
    setAdInterval(current.ad_interval ?? DEFAULT_AD_INTERVAL);
  }, [current]);

  const dirty =
    !!current &&
    (enabled !== (current.ticker_enabled !== false) ||
      speed !== (current.ticker_speed ?? 3) ||
      adInterval !== (current.ad_interval ?? DEFAULT_AD_INTERVAL));

  const save = async () => {
    setSaving(true);
    setError('');
    const { data, error } = await supabase
      .from('site_settings')
      .update({ ticker_enabled: enabled, ticker_speed: speed, ad_interval: adInterval, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select()
      .single();
    setSaving(false);
    // PGRST204 = column missing: the database predates the ticker columns and schema.sql needs re-running.
    if (error) return setError(error.code === 'PGRST204' ? t('err.DB_OUTDATED') : error.message);
    setSiteSettingsCache(data as SiteSettings);
    saved.flash();
  };

  return (
    <section>
      <h2 className="flex items-center gap-2 text-xl font-bold"><Gauge className="h-5 w-5 text-gold-400" /> {t('admin.ticker.title')}</h2>
      <p className="mb-5 text-sm text-white/50">{t('admin.ticker.subtitle')}</p>
      <div className="card space-y-5 p-5 sm:p-6">
        <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <span className="text-sm text-white/80">{t('admin.slides.duration')}</span>
          <div className="sm:w-[26rem]">
            <Segmented<string>
              value={String(adInterval)}
              onChange={(v) => setAdInterval(Number(v))}
              options={AD_INTERVALS.map((n) => ({ value: String(n), label: t('admin.slides.seconds', { n }) }))}
            />
          </div>
        </div>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <Toggle checked={enabled} onChange={setEnabled} label={t('admin.ticker.show')} />
          <div className={cn('flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4', !enabled && 'pointer-events-none opacity-40')}>
            <span className="text-sm font-medium text-white/70">{t('admin.ticker.speed')}</span>
            <div className="sm:w-[26rem]">
              <Segmented<string>
                value={String(speed)}
                onChange={(v) => setSpeed(Number(v))}
                options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: t(`admin.ticker.speed${n as 1 | 2 | 3 | 4 | 5}`) }))}
              />
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">{t('admin.ticker.preview')}</p>
          {lines.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-white/50">{t('admin.ticker.noLines')}</p>
          ) : (
            <div className={cn('overflow-hidden rounded-xl transition', !enabled && 'opacity-30 grayscale')}>
              <Ticker lines={lines} speed={speed} />
            </div>
          )}
        </div>

        {error && <Alert>{error}</Alert>}
        <div className="flex items-center justify-end gap-3">
          <SavedNote show={saved.on && !dirty} />
          <button className="btn-primary" onClick={save} disabled={saving || !dirty}>
            {saving && <Spinner className="h-4 w-4 text-ink-950" />} {t('admin.save')}
          </button>
        </div>
      </div>
    </section>
  );
}

function AboutForm() {
  const { t } = useI18n();
  const [f, setF] = useState<SiteSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const saved = useFlash();

  useEffect(() => {
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle().then(({ data }) => setF(data as SiteSettings));
  }, []);

  if (!f) return <Spinner />;
  // Any edit after saving means the "Saved ✓" no longer describes what's on screen.
  const update = (patch: Partial<SiteSettings>) => {
    setF({ ...f, ...patch });
    saved.hide();
  };
  const set = (k: keyof SiteSettings) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    // Slideshow/ticker fields are saved by their own card — don't overwrite them with stale values here.
    const { id: _id, ticker_enabled: _te, ticker_speed: _ts, ad_interval: _ai, ...rest } = f;
    const { data, error } = await supabase.from('site_settings').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', 1).select().single();
    setSaving(false);
    if (error) return setError(error.message);
    setSiteSettingsCache(data as SiteSettings);
    saved.flash();
  };

  return (
    <section>
      <h2 className="text-xl font-bold">{t('admin.about.title')}</h2>
      <p className="mb-5 text-sm text-white/50">{t('admin.about.subtitle')}</p>
      <form onSubmit={submit} className="card grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <Field label={t('f.aboutEn')}><textarea className="input min-h-[160px]" value={f.about_en} onChange={set('about_en')} /></Field>
        <Field label={t('f.aboutAr')}><textarea className="input min-h-[160px]" dir="rtl" value={f.about_ar} onChange={set('about_ar')} /></Field>
        <div className="sm:col-span-2"><ImageUpload folder="about" value={f.about_image_url} onChange={(about_image_url) => update({ about_image_url })} /></div>
        <Field label={t('f.phone')}><input className="input" dir="ltr" value={f.phone} onChange={set('phone')} /></Field>
        <Field label={t('f.email')}><input className="input" dir="ltr" type="email" value={f.email} onChange={set('email')} /></Field>
        <Field label={t('f.addressEn')}><input className="input" value={f.address_en} onChange={set('address_en')} /></Field>
        <Field label={t('f.addressAr')}><input className="input" dir="rtl" value={f.address_ar} onChange={set('address_ar')} /></Field>
        <Field label={t('f.instagram')}><input className="input" dir="ltr" type="url" value={f.instagram_url} onChange={set('instagram_url')} /></Field>
        <Field label={t('f.facebook')}><input className="input" dir="ltr" type="url" value={f.facebook_url} onChange={set('facebook_url')} /></Field>
        {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
        <div className="flex items-center justify-end gap-3 sm:col-span-2">
          <SavedNote show={saved.on} />
          <button className="btn-primary" disabled={saving}>
            {saving && <Spinner className="h-4 w-4 text-ink-950" />} {t('admin.save')}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ------------------------------------------------------------------ */

const ROLE_ICON: Record<Role, ReactNode> = {
  customer: <UserIcon className="h-4 w-4 text-white/50" />,
  staff: <ClipboardList className="h-4 w-4 text-sky-300" />,
  admin: <ShieldCheck className="h-4 w-4 text-gold-400" />,
};

function UsersAdmin({ active }: { active: boolean }) {
  const { t, lang } = useI18n();
  const [users, setUsers] = useState<Profile[] | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<Role | 'all'>('all');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState('');

  const load = useCallback(async () => {
    const [u, b] = await Promise.all([
      supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(500),
      supabase.from('branches').select('*').order('sort_order'),
    ]);
    setUsers((u.data as Profile[]) ?? []);
    setBranches((b.data as Branch[]) ?? []);
  }, []);
  // Refetch quietly whenever the tab is shown again; the loader only appears on the very first load.
  useEffect(() => {
    if (active) load();
  }, [active, load]);

  const update = async (u: Profile, patch: Partial<Pick<Profile, 'role' | 'branch_id'>>) => {
    setSavingId(u.id);
    setError('');
    const { error } = await supabase.from('profiles').update(patch).eq('id', u.id);
    setSavingId(null);
    if (error) setError(error.message);
    else setUsers((list) => list?.map((x) => (x.id === u.id ? { ...x, ...patch } : x)) ?? null);
  };

  const roleOptions = (['customer', 'staff', 'admin'] as Role[]).map((r) => ({ value: r, label: t(`role.${r}`), icon: ROLE_ICON[r] }));
  const branchOptions = [
    { value: '', label: t('staff.allBranches') },
    ...branches.map((b) => ({ value: b.id, label: tr(b, 'name', lang) })),
  ];

  if (!users) return <PageLoader />;
  const needle = q.trim().toLowerCase();
  const filtered = users.filter(
    (u) =>
      (roleFilter === 'all' || u.role === roleFilter) &&
      (!needle || [u.full_name, u.email, u.phone].some((v) => v?.toLowerCase().includes(needle))),
  );

  return (
    <div>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="text-sm text-white/50">{t('admin.users.subtitle')}</p>
        <button className="btn-primary self-start" onClick={() => setCreating(true)}>
          <UserPlus className="h-4 w-4" /> {t('admin.newUser')}
        </button>
      </div>
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
          <input className="input ps-10" placeholder={t('admin.users.search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="sm:w-44">
          <Select<Role | 'all'>
            aria-label={t('f.role')}
            value={roleFilter}
            onChange={setRoleFilter}
            options={[{ value: 'all', label: t('staff.all'), icon: <Users className="h-4 w-4 text-white/50" /> }, ...roleOptions]}
          />
        </div>
      </div>
      {created && <div className="mb-4"><Alert kind="success">{created}</Alert></div>}
      {error && <div className="mb-4"><Alert>{error}</Alert></div>}
      {filtered.length === 0 ? (
        <Empty text={t('admin.empty')} />
      ) : (
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
                <div className="md:w-40">
                  <Select<Role> aria-label={t('f.role')} value={u.role} disabled={savingId === u.id} onChange={(role) => update(u, { role })} options={roleOptions} className="py-2" />
                </div>
                <div className="md:w-52">
                  <Select<string>
                    aria-label={t('f.staffBranch')}
                    value={u.branch_id ?? ''}
                    disabled={u.role !== 'staff' || savingId === u.id}
                    onChange={(v) => update(u, { branch_id: v || null })}
                    options={branchOptions}
                    className="py-2"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={creating} onClose={() => setCreating(false)} title={t('admin.newUser')} wide>
        {creating && (
          <CreateUserForm
            roleOptions={roleOptions}
            branchOptions={branchOptions}
            onCancel={() => setCreating(false)}
            onCreated={(p) => {
              setCreating(false);
              setCreated(t('admin.userCreated', { email: p.email ?? '' }));
              setUsers((list) => (list ? [p, ...list] : [p]));
            }}
          />
        )}
      </Modal>
    </div>
  );
}

function generatePassword() {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789', '!@#$%&*?'];
  const all = sets.join('');
  const pick = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const chars = [...sets.map(pick), ...Array.from({ length: 8 }, () => pick(all))];
  // Fisher–Yates shuffle so the guaranteed characters aren't always first
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

const CREATE_ERRORS = ['EMAIL_TAKEN', 'FUNCTION_MISSING', 'NOT_ALLOWED'] as const;
type CreateError = (typeof CREATE_ERRORS)[number];

function CreateUserForm({
  roleOptions,
  branchOptions,
  onCancel,
  onCreated,
}: {
  roleOptions: SelectOption<Role>[];
  branchOptions: SelectOption<string>[];
  onCancel: () => void;
  onCreated: (p: Profile) => void;
}) {
  const { t, lang } = useI18n();
  const [f, setF] = useState({ full_name: '', email: '', phone: '', password: '', language: lang as Lang, role: 'customer' as Role, branch_id: '' });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const passwordOk = isPasswordValid(f.password);
  const set = (k: 'full_name' | 'email' | 'phone' | 'password') => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(f.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!passwordOk) return;
    setSaving(true);
    setError('');
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { ...f, full_name: f.full_name.trim(), email: f.email.trim(), phone: f.phone.trim(), branch_id: f.branch_id || null },
    });
    setSaving(false);
    if (error) {
      // FunctionsHttpError carries the Response; a fetch/relay error means the function isn't reachable.
      const res = (error as { context?: unknown }).context;
      let code = 'FUNCTION_MISSING';
      if (res instanceof Response && res.status !== 404) {
        code = await res.json().then((j: { error?: string }) => j.error ?? '', () => '');
      }
      return setError(CREATE_ERRORS.includes(code as CreateError) ? t(`err.${code as CreateError}`) : code || t('err.generic'));
    }
    onCreated((data as { profile: Profile }).profile);
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label={t('f.fullName')}>
        <IconInput icon={<UserIcon className="h-4 w-4" />} required value={f.full_name} onChange={set('full_name')} />
      </Field>
      <Field label={t('f.phone')}>
        <IconInput icon={<Phone className="h-4 w-4" />} type="tel" dir="ltr" value={f.phone} onChange={set('phone')} />
      </Field>
      <div className="sm:col-span-2">
        <Field label={t('f.email')}>
          <IconInput icon={<Mail className="h-4 w-4" />} type="email" dir="ltr" required autoComplete="off" value={f.email} onChange={set('email')} />
        </Field>
      </div>
      <div className="sm:col-span-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-white/70">{t('f.password')}</span>
          <div className="flex gap-1.5">
            <button type="button" className="btn-ghost btn-sm" onClick={() => setF({ ...f, password: generatePassword() })}>
              <Wand2 className="h-3.5 w-3.5" /> {t('admin.generatePassword')}
            </button>
            {f.password && (
              <button type="button" className="btn-ghost btn-sm" onClick={copy} aria-label={t('admin.copyPassword')}>
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        </div>
        <PasswordInput required minLength={8} autoComplete="new-password" aria-label={t('f.password')} value={f.password} onChange={set('password')} />
        <PasswordStrength password={f.password} />
      </div>
      <Field label={t('f.role')}>
        <Select<Role> value={f.role} onChange={(role) => setF({ ...f, role })} options={roleOptions} />
      </Field>
      <Field label={t('f.staffBranch')}>
        <Select<string> value={f.branch_id} disabled={f.role !== 'staff'} onChange={(branch_id) => setF({ ...f, branch_id })} options={branchOptions} />
      </Field>
      <div className="flex items-center justify-between gap-4 sm:col-span-2">
        <span className="text-sm font-medium text-white/70">{t('f.language')}</span>
        <div className="w-48">
          <Segmented<Lang>
            value={f.language}
            onChange={(language) => setF({ ...f, language })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' },
            ]}
          />
        </div>
      </div>
      {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
      <div className="flex justify-end gap-2 sm:col-span-2">
        <button type="button" className="btn-ghost" onClick={onCancel}>
          {t('admin.cancel')}
        </button>
        <button className="btn-primary" disabled={saving || !passwordOk}>
          {saving ? <Spinner className="h-4 w-4 text-ink-950" /> : <UserPlus className="h-4 w-4" />} {t('admin.newUser')}
        </button>
      </div>
    </form>
  );
}
