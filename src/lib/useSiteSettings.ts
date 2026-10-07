import { useEffect, useState } from 'react';
import { isConfigured, supabase } from './supabase';
import type { SiteSettings } from './types';

/** Seconds per home-page advertisement when the database has no value yet. */
export const DEFAULT_AD_INTERVAL = 7;

let cache: SiteSettings | null = null;
let pending: Promise<SiteSettings | null> | null = null;
const listeners = new Set<(s: SiteSettings | null) => void>();

function fetchSettings() {
  if (!isConfigured) return Promise.resolve(null);
  pending ??= Promise.resolve(
    supabase.from('site_settings').select('*').eq('id', 1).maybeSingle(),
  ).then(({ data }) => {
    cache = (data as SiteSettings) ?? null;
    listeners.forEach((l) => l(cache));
    return cache;
  });
  return pending;
}

/** Shared, cached site settings (about text + contact info). */
export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings | null>(cache);
  useEffect(() => {
    listeners.add(setSettings);
    if (!cache) fetchSettings();
    return () => {
      listeners.delete(setSettings);
    };
  }, []);
  return settings;
}

/** Call after the admin saves settings so every component re-renders with the new values. */
export function setSiteSettingsCache(s: SiteSettings) {
  cache = s;
  pending = Promise.resolve(s);
  listeners.forEach((l) => l(s));
}
