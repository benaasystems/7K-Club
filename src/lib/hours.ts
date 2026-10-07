import type { TKey } from '../i18n/translations';
import type { Branch, Lang } from './types';
import { formatClock, tr } from './utils';

export interface OpeningHours {
  /** minutes after midnight */
  open: number;
  close: number;
}

/** 'HH:MM[:SS]' → minutes after midnight */
export function timeToMinutes(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** minutes after midnight → 'HH:MM' (the form value the database accepts for a `time` column) */
export function minutesToTime(m: number) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(Math.floor(m / 60) % 24)}:${pad(m % 60)}`;
}

/** The branch's daily hours, or null when not set or open around the clock (= no restriction). */
export function openingHours(b: Pick<Branch, 'opens_at' | 'closes_at'>): OpeningHours | null {
  if (!b.opens_at || !b.closes_at) return null;
  const open = timeToMinutes(b.opens_at);
  const close = timeToMinutes(b.closes_at);
  return open === close ? null : { open, close };
}

/**
 * Does a booking starting `start` minutes after midnight and lasting `length` minutes fit inside
 * one opening period? Periods may run past midnight. Same rule as the database trigger.
 */
export function fitsHours(h: OpeningHours | null, start: number, length: number) {
  if (!h) return true;
  const openLen = (h.close - h.open + 1440) % 1440;
  const fromOpen = (((start - h.open) % 1440) + 1440) % 1440;
  return fromOpen + length <= openLen;
}

/** "Daily 12:00 pm – 4:00 am" from the structured hours, falling back to the old free-text field. */
export function hoursLabel(b: Branch, lang: Lang, t: (key: TKey, vars?: Record<string, string | number>) => string) {
  if (b.opens_at && b.closes_at) {
    const open = timeToMinutes(b.opens_at);
    const close = timeToMinutes(b.closes_at);
    if (open === close) return t('hours.allDay');
    return t('hours.daily', { from: formatClock(open, lang), to: formatClock(close, lang) });
  }
  return tr(b, 'hours', lang);
}
