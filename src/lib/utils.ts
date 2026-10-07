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

/**
 * Every branch is in Egypt, so booking times are shown and entered in Egypt time whatever
 * the visitor's device is set to. The database checks opening hours in the same zone.
 */
export const CLUB_TZ = 'Africa/Cairo';

export function formatDateTime(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', {
    weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CLUB_TZ,
  }).format(new Date(iso));
}

export function formatTime(iso: string | Date, lang: Lang) {
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: CLUB_TZ }).format(new Date(iso));
}

/** Minutes after midnight (may exceed 1440 for the next day) as a 12-hour clock time, e.g. 750 → "12:30 PM". */
export function formatClock(minutes: number, lang: Lang) {
  const m = ((minutes % 1440) + 1440) % 1440;
  return new Intl.DateTimeFormat(lang === 'ar' ? 'ar-EG' : 'en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' }).format(
    Date.UTC(2000, 0, 1, Math.floor(m / 60), m % 60),
  );
}

/** Egypt-time offset from UTC (ms) at a given instant. */
function clubOffset(at: number) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: CLUB_TZ, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric',
    })
      .formatToParts(at)
      .map((x) => [x.type, Number(x.value)]),
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - at;
}

/** The instant for `minutes` after midnight (Egypt time) on yyyy-mm-dd `date`; minutes ≥ 1440 roll into the next day. */
export function clubDate(date: string, minutes: number) {
  const [y, mo, d] = date.split('-').map(Number);
  const wall = Date.UTC(y, mo - 1, d, 0, minutes);
  // Two passes so a daylight-saving change between the guess and the answer is handled.
  const first = wall - clubOffset(wall);
  return new Date(wall - clubOffset(first));
}

/** Today's date (yyyy-mm-dd) in Egypt. */
export function clubToday() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: CLUB_TZ }).format(new Date());
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
  'OUTSIDE_HOURS',
] as const;
export type KnownError = (typeof KNOWN_ERRORS)[number] | 'generic';

/** Map a Supabase / Postgres error to one of our translated error codes. */
export function errorCode(err: unknown): KnownError {
  const e = err as { message?: string; code?: string } | null;
  const msg = e?.message ?? '';
  if (e?.code === '23P01') return 'SLOT_TAKEN'; // exclusion constraint: overlapping accepted booking
  return KNOWN_ERRORS.find((k) => msg.includes(k)) ?? 'generic';
}
