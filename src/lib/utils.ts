import { supabase } from './supabase';
import type { Lang } from './types';

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

/** Pick the `<field>_en` / `<field>_ar` value for the current language, falling back to the other one. */
export function tr(obj: object | null | undefined, field: string, lang: Lang): string {
  if (!obj) return '';
  const o = obj as Record<string, unknown>;
  const other: Lang = lang === 'ar' ? 'en' : 'ar';
  return String(o[`${field}_${lang}`] || o[`${field}_${other}`] || '');
}

export function money(value: number, lang: Lang) {
  const n = new Intl.NumberFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { maximumFractionDigits: 2 }).format(Number(value) || 0);
  return lang === 'ar' ? `${n} ج.م` : `EGP ${n}`;
}

export function formatDateTime(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso));
}

export function formatTime(iso: string | Date, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-GB', { hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
}

/** yyyy-mm-dd in local time */
export function toDateInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Upload an image to a public bucket and return its public URL. */
export async function uploadImage(bucket: 'avatars' | 'media', folder: string, file: File) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

const KNOWN_ERRORS = [
  'SLOT_TAKEN', 'BOOKING_IN_PAST', 'BOOKING_TOO_LONG', 'TOO_MANY_GUESTS', 'RESOURCE_UNAVAILABLE',
  'ITEM_UNAVAILABLE', 'OUT_OF_STOCK', 'EMPTY_ORDER', 'BRANCH_UNAVAILABLE', 'NOT_ALLOWED', 'STAFF_CANNOT_BOOK',
] as const;
export type KnownError = (typeof KNOWN_ERRORS)[number] | 'generic';

/** Map a Supabase / Postgres error to one of our translated error codes. */
export function errorCode(err: unknown): KnownError {
  const e = err as { message?: string; code?: string } | null;
  const msg = e?.message ?? '';
  if (e?.code === '23P01') return 'SLOT_TAKEN'; // exclusion constraint: overlapping accepted booking
  return KNOWN_ERRORS.find((k) => msg.includes(k)) ?? 'generic';
}
