import { useCallback, useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Coffee, ExternalLink, Info, LayoutGrid, Pencil, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { ResourceIcon } from '../../components/icons';
import { Alert, Empty, Modal, PageLoader, Tabs } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { supabase } from '../../lib/supabase';
import type { Branch, Item, ItemKind, Resource } from '../../lib/types';
import { cn, money, tr } from '../../lib/utils';
import { BranchForm, ItemForm, ResourceForm } from './forms';

type Tab = 'details' | 'resources' | 'menu' | 'store';

export default function BranchManage() {
  const { id = '' } = useParams();
  const { t, lang, dir } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = (['details', 'resources', 'menu', 'store'].includes(params.get('tab') ?? '') ? params.get('tab') : 'resources') as Tab;
  const [branch, setBranch] = useState<Branch | null | undefined>(undefined);
  const [saved, setSaved] = useState(false);
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    supabase.from('branches').select('*').eq('id', id).maybeSingle().then(({ data }) => setBranch(data as Branch | null));
  }, [id]);

  if (branch === undefined) return <PageLoader />;
  if (!branch) return <div className="container-x py-20"><Empty text={t('branch.notFound')} /></div>;

  return (
    <div className="container-x py-10 sm:py-14">
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-gold-400">
        <Back className="h-4 w-4" /> {t('admin.back')}
      </Link>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold">{tr(branch, 'name', lang)}</h1>
        <Link to={`/branches/${branch.id}`} className="btn-ghost btn-sm">
          <ExternalLink className="h-3.5 w-3.5" /> {t('branch.tab.book')}
        </Link>
      </div>

      <div className="mt-8">
        <Tabs<Tab>
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          options={[
            { value: 'resources', label: <><LayoutGrid className="h-4 w-4" /> {t('admin.branch.resources')}</> },
            { value: 'menu', label: <><Coffee className="h-4 w-4" /> {t('admin.branch.menu')}</> },
            { value: 'store', label: <><ShoppingBag className="h-4 w-4" /> {t('admin.branch.store')}</> },
            { value: 'details', label: <><Info className="h-4 w-4" /> {t('admin.branch.details')}</> },
          ]}
        />
      </div>

      <div className="mt-8">
        {tab === 'details' && (
          <div className="card p-5 sm:p-6">
            {saved && <div className="mb-4"><Alert kind="success">{t('admin.saved')}</Alert></div>}
            <BranchForm
              key={branch.id}
              branch={branch}
              onSaved={(b) => {
                setBranch(b);
                setSaved(true);
              }}
            />
          </div>
        )}
        {tab === 'resources' && <ResourcesAdmin branchId={branch.id} />}
        {tab === 'menu' && <ItemsAdmin branchId={branch.id} kind="menu" />}
        {tab === 'store' && <ItemsAdmin branchId={branch.id} kind="store" />}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ResourcesAdmin({ branchId }: { branchId: string }) {
  const { t, lang } = useI18n();
  const [list, setList] = useState<Resource[] | null>(null);
  const [editing, setEditing] = useState<Resource | 'new' | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('resources').select('*').eq('branch_id', branchId).order('sort_order').order('created_at');
    setList((data as Resource[]) ?? []);
  }, [branchId]);
  useEffect(() => {
    load();
  }, [load]);

  const remove = async (r: Resource) => {
    if (!window.confirm(`${tr(r, 'name', lang)} — ${t('admin.confirmDelete')}`)) return;
    await supabase.from('resources').delete().eq('id', r.id);
    load();
  };

  if (!list) return <PageLoader />;
  return (
    <>
      <div className="mb-5 flex justify-end">
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> {t('admin.newResource')}
        </button>
      </div>
      {list.length === 0 ? (
        <Empty text={t('admin.empty')} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((r) => (
            <div key={r.id} className={cn('card flex items-center gap-4 p-4', !r.is_active && 'opacity-60')}>
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-400">
                {r.image_url ? <img src={r.image_url} alt="" className="h-full w-full object-cover" /> : <ResourceIcon type={r.type} className="h-6 w-6" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{tr(r, 'name', lang)}</p>
                <p className="text-sm text-white/50">
                  {t(`type.${r.type}`)} · {money(r.price_per_hour, lang)} {t('resource.perHour')} · {t('resource.capacity', { n: r.capacity })}
                  {!r.is_active && ` · ${t('admin.hidden')}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="btn-ghost btn-sm" onClick={() => setEditing(r)} aria-label={t('admin.edit')}><Pencil className="h-3.5 w-3.5" /></button>
                <button className="btn-danger btn-sm" onClick={() => remove(r)} aria-label={t('admin.delete')}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? t('admin.newResource') : t('admin.editResource')} wide>
        {editing && (
          <ResourceForm
            branchId={branchId}
            resource={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </Modal>
    </>
  );
}

/* ------------------------------------------------------------------ */

function ItemsAdmin({ branchId, kind }: { branchId: string; kind: ItemKind }) {
  const { t, lang } = useI18n();
  const [list, setList] = useState<Item[] | null>(null);
  const [editing, setEditing] = useState<Item | 'new' | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('items').select('*').eq('branch_id', branchId).eq('kind', kind).order('sort_order').order('created_at');
    setList((data as Item[]) ?? []);
  }, [branchId, kind]);
  useEffect(() => {
    setList(null);
    load();
  }, [load]);

  const remove = async (i: Item) => {
    if (!window.confirm(`${tr(i, 'name', lang)} — ${t('admin.confirmDelete')}`)) return;
    await supabase.from('items').delete().eq('id', i.id);
    load();
  };

  if (!list) return <PageLoader />;
  const Icon = kind === 'menu' ? Coffee : ShoppingBag;
  return (
    <>
      <div className="mb-5 flex justify-end">
        <button className="btn-primary" onClick={() => setEditing('new')}>
          <Plus className="h-4 w-4" /> {t('admin.newItem')}
        </button>
      </div>
      {list.length === 0 ? (
        <Empty icon={<Icon className="h-10 w-10" />} text={t('admin.empty')} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {list.map((i) => (
            <div key={i.id} className={cn('card flex items-center gap-4 p-3', !i.is_available && 'opacity-60')}>
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white/5 text-white/25">
                {i.image_url ? <img src={i.image_url} alt="" className="h-full w-full object-cover" /> : <Icon className="h-6 w-6" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{tr(i, 'name', lang)}</p>
                <p className="text-sm text-white/50">
                  {t(`cat.${i.category as 'other'}`)} · <span className="text-gold-400">{money(i.price, lang)}</span>
                  {kind === 'store' && i.stock !== null && ` · ${t('store.inStock', { n: i.stock })}`}
                  {!i.is_available && ` · ${t('admin.hidden')}`}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button className="btn-ghost btn-sm" onClick={() => setEditing(i)} aria-label={t('admin.edit')}><Pencil className="h-3.5 w-3.5" /></button>
                <button className="btn-danger btn-sm" onClick={() => remove(i)} aria-label={t('admin.delete')}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? t('admin.newItem') : t('admin.editItem')} wide>
        {editing && (
          <ItemForm
            branchId={branchId}
            kind={kind}
            item={editing === 'new' ? undefined : editing}
            onCancel={() => setEditing(null)}
            onSaved={() => {
              setEditing(null);
              load();
            }}
          />
        )}
      </Modal>
    </>
  );
}
