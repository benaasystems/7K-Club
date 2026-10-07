import { useState, type FormEvent } from 'react';
import { ResourceIcon } from '../../components/icons';
import { ImageUpload } from '../../components/ImageUpload';
import { Select } from '../../components/Select';
import { Alert, Field, Spinner, Toggle } from '../../components/ui';
import { useI18n } from '../../i18n/I18nProvider';
import { supabase } from '../../lib/supabase';
import {
  MENU_CATEGORIES,
  RESOURCE_TYPES,
  STORE_CATEGORIES,
  type Announcement,
  type Branch,
  type Item,
  type ItemKind,
  type Resource,
  type ResourceType,
} from '../../lib/types';

function useSave() {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const run = async (fn: () => PromiseLike<{ error: { message: string } | null }>, onDone: () => void) => {
    setSaving(true);
    setError('');
    const { error } = await fn();
    setSaving(false);
    if (error) setError(error.message);
    else onDone();
  };
  return { saving, error, run };
}

function FormActions({ saving, onCancel }: { saving: boolean; onCancel?: () => void }) {
  const { t } = useI18n();
  return (
    <div className="flex justify-end gap-2 pt-2 sm:col-span-2">
      {onCancel && (
        <button type="button" className="btn-ghost" onClick={onCancel}>
          {t('admin.cancel')}
        </button>
      )}
      <button className="btn-primary" disabled={saving}>
        {saving && <Spinner className="h-4 w-4 text-ink-950" />} {t('admin.save')}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function BranchForm({ branch, onSaved, onCancel }: { branch?: Branch; onSaved: (b: Branch) => void; onCancel?: () => void }) {
  const { t } = useI18n();
  const { saving, error, run } = useSave();
  const [f, setF] = useState({
    name_en: branch?.name_en ?? '',
    name_ar: branch?.name_ar ?? '',
    address_en: branch?.address_en ?? '',
    address_ar: branch?.address_ar ?? '',
    hours_en: branch?.hours_en ?? '',
    hours_ar: branch?.hours_ar ?? '',
    phone: branch?.phone ?? '',
    map_url: branch?.map_url ?? '',
    image_url: branch?.image_url ?? null,
    is_active: branch?.is_active ?? true,
    sort_order: branch?.sort_order ?? 0,
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload = { ...f, sort_order: Number(f.sort_order) || 0 };
    run(
      async () => {
        const q = branch
          ? supabase.from('branches').update(payload).eq('id', branch.id).select().single()
          : supabase.from('branches').insert(payload).select().single();
        const res = await q;
        if (!res.error) onSaved(res.data as Branch);
        return res;
      },
      () => undefined,
    );
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label={t('f.nameEn')}><input className="input" required value={f.name_en} onChange={set('name_en')} /></Field>
      <Field label={t('f.nameAr')}><input className="input" dir="rtl" value={f.name_ar} onChange={set('name_ar')} /></Field>
      <Field label={t('f.addressEn')}><input className="input" value={f.address_en} onChange={set('address_en')} /></Field>
      <Field label={t('f.addressAr')}><input className="input" dir="rtl" value={f.address_ar} onChange={set('address_ar')} /></Field>
      <Field label={t('f.hoursEn')}><input className="input" placeholder="Daily 12 PM – 4 AM" value={f.hours_en} onChange={set('hours_en')} /></Field>
      <Field label={t('f.hoursAr')}><input className="input" dir="rtl" value={f.hours_ar} onChange={set('hours_ar')} /></Field>
      <Field label={t('f.phone')}><input className="input" dir="ltr" value={f.phone} onChange={set('phone')} /></Field>
      <Field label={t('f.mapUrl')}><input className="input" dir="ltr" type="url" value={f.map_url} onChange={set('map_url')} /></Field>
      <div className="sm:col-span-2"><ImageUpload folder="branches" value={f.image_url} onChange={(image_url) => setF({ ...f, image_url })} /></div>
      <Field label={t('f.sortOrder')}><input className="input" type="number" value={f.sort_order} onChange={set('sort_order')} /></Field>
      <div className="flex items-end pb-2"><Toggle checked={f.is_active} onChange={(is_active) => setF({ ...f, is_active })} label={t('f.visible')} /></div>
      {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}

/* ------------------------------------------------------------------ */

export function ResourceForm({ branchId, resource, onSaved, onCancel }: { branchId: string; resource?: Resource; onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const { saving, error, run } = useSave();
  const [f, setF] = useState({
    type: resource?.type ?? 'ps5',
    name_en: resource?.name_en ?? '',
    name_ar: resource?.name_ar ?? '',
    description_en: resource?.description_en ?? '',
    description_ar: resource?.description_ar ?? '',
    capacity: String(resource?.capacity ?? 4),
    price_per_hour: String(resource?.price_per_hour ?? ''),
    image_url: resource?.image_url ?? null,
    is_active: resource?.is_active ?? true,
    sort_order: String(resource?.sort_order ?? 0),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      ...f,
      branch_id: branchId,
      capacity: Math.max(1, Number(f.capacity) || 1),
      price_per_hour: Number(f.price_per_hour) || 0,
      sort_order: Number(f.sort_order) || 0,
    };
    run(() => (resource ? supabase.from('resources').update(payload).eq('id', resource.id) : supabase.from('resources').insert(payload)), onSaved);
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label={t('f.type')}>
        <Select<ResourceType>
          value={f.type}
          onChange={(type) => setF({ ...f, type })}
          options={RESOURCE_TYPES.map((r) => ({ value: r, label: t(`type.${r}`), icon: <ResourceIcon type={r} className="h-4 w-4 text-gold-400" /> }))}
        />
      </Field>
      <Field label={t('f.pricePerHour')}><input className="input" type="number" min="0" step="0.5" required value={f.price_per_hour} onChange={set('price_per_hour')} /></Field>
      <Field label={t('f.nameEn')}><input className="input" required value={f.name_en} onChange={set('name_en')} /></Field>
      <Field label={t('f.nameAr')}><input className="input" dir="rtl" value={f.name_ar} onChange={set('name_ar')} /></Field>
      <Field label={t('f.descEn')}><textarea className="input min-h-[70px]" value={f.description_en} onChange={set('description_en')} /></Field>
      <Field label={t('f.descAr')}><textarea className="input min-h-[70px]" dir="rtl" value={f.description_ar} onChange={set('description_ar')} /></Field>
      <Field label={t('f.capacity')}><input className="input" type="number" min="1" max="50" required value={f.capacity} onChange={set('capacity')} /></Field>
      <Field label={t('f.sortOrder')}><input className="input" type="number" value={f.sort_order} onChange={set('sort_order')} /></Field>
      <div className="sm:col-span-2"><ImageUpload folder="resources" value={f.image_url} onChange={(image_url) => setF({ ...f, image_url })} /></div>
      <div className="sm:col-span-2"><Toggle checked={f.is_active} onChange={(is_active) => setF({ ...f, is_active })} label={t('f.visible')} /></div>
      {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}

/* ------------------------------------------------------------------ */

export function ItemForm({ branchId, kind, item, onSaved, onCancel }: { branchId: string; kind: ItemKind; item?: Item; onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const { saving, error, run } = useSave();
  const categories = kind === 'menu' ? MENU_CATEGORIES : STORE_CATEGORIES;
  const [f, setF] = useState({
    category: item?.category ?? categories[0],
    name_en: item?.name_en ?? '',
    name_ar: item?.name_ar ?? '',
    description_en: item?.description_en ?? '',
    description_ar: item?.description_ar ?? '',
    price: String(item?.price ?? ''),
    stock: item?.stock == null ? '' : String(item.stock),
    image_url: item?.image_url ?? null,
    is_available: item?.is_available ?? true,
    sort_order: String(item?.sort_order ?? 0),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      ...f,
      branch_id: branchId,
      kind,
      price: Number(f.price) || 0,
      stock: kind === 'store' && f.stock !== '' ? Math.max(0, Number(f.stock)) : null,
      sort_order: Number(f.sort_order) || 0,
    };
    run(() => (item ? supabase.from('items').update(payload).eq('id', item.id) : supabase.from('items').insert(payload)), onSaved);
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label={t('f.category')}>
        <Select<string>
          value={f.category}
          onChange={(category) => setF({ ...f, category })}
          options={categories.map((c) => ({ value: c, label: t(`cat.${c}`) }))}
        />
      </Field>
      <Field label={t('f.price')}><input className="input" type="number" min="0" step="0.5" required value={f.price} onChange={set('price')} /></Field>
      <Field label={t('f.nameEn')}><input className="input" required value={f.name_en} onChange={set('name_en')} /></Field>
      <Field label={t('f.nameAr')}><input className="input" dir="rtl" value={f.name_ar} onChange={set('name_ar')} /></Field>
      <Field label={t('f.descEn')}><textarea className="input min-h-[70px]" value={f.description_en} onChange={set('description_en')} /></Field>
      <Field label={t('f.descAr')}><textarea className="input min-h-[70px]" dir="rtl" value={f.description_ar} onChange={set('description_ar')} /></Field>
      {kind === 'store' && <Field label={t('f.stock')}><input className="input" type="number" min="0" value={f.stock} onChange={set('stock')} /></Field>}
      <Field label={t('f.sortOrder')}><input className="input" type="number" value={f.sort_order} onChange={set('sort_order')} /></Field>
      <div className="sm:col-span-2"><ImageUpload folder={kind} value={f.image_url} onChange={(image_url) => setF({ ...f, image_url })} /></div>
      <div className="sm:col-span-2"><Toggle checked={f.is_available} onChange={(is_available) => setF({ ...f, is_available })} label={t('f.visible')} /></div>
      {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}

/* ------------------------------------------------------------------ */

export function AnnouncementForm({ ad, onSaved, onCancel }: { ad?: Announcement; onSaved: () => void; onCancel: () => void }) {
  const { t } = useI18n();
  const { saving, error, run } = useSave();
  const [f, setF] = useState({
    title_en: ad?.title_en ?? '',
    title_ar: ad?.title_ar ?? '',
    body_en: ad?.body_en ?? '',
    body_ar: ad?.body_ar ?? '',
    link_url: ad?.link_url ?? '',
    image_url: ad?.image_url ?? null,
    is_active: ad?.is_active ?? true,
    sort_order: String(ad?.sort_order ?? 0),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const payload = { ...f, sort_order: Number(f.sort_order) || 0 };
    run(() => (ad ? supabase.from('announcements').update(payload).eq('id', ad.id) : supabase.from('announcements').insert(payload)), onSaved);
  };

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label={t('f.titleEn')}><input className="input" required value={f.title_en} onChange={set('title_en')} /></Field>
      <Field label={t('f.titleAr')}><input className="input" dir="rtl" value={f.title_ar} onChange={set('title_ar')} /></Field>
      <Field label={t('f.linesEn')}><textarea className="input min-h-[110px]" value={f.body_en} onChange={set('body_en')} /></Field>
      <Field label={t('f.linesAr')}><textarea className="input min-h-[110px]" dir="rtl" value={f.body_ar} onChange={set('body_ar')} /></Field>
      <Field label={t('f.link')}><input className="input" dir="ltr" placeholder="#branches" value={f.link_url} onChange={set('link_url')} /></Field>
      <Field label={t('f.sortOrder')}><input className="input" type="number" value={f.sort_order} onChange={set('sort_order')} /></Field>
      <div className="sm:col-span-2"><ImageUpload folder="ads" value={f.image_url} onChange={(image_url) => setF({ ...f, image_url })} /></div>
      <div className="sm:col-span-2"><Toggle checked={f.is_active} onChange={(is_active) => setF({ ...f, is_active })} label={t('f.visible')} /></div>
      {error && <div className="sm:col-span-2"><Alert>{error}</Alert></div>}
      <FormActions saving={saving} onCancel={onCancel} />
    </form>
  );
}
