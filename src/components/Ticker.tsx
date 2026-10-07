import { useLayoutEffect, useRef, useState } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import type { Announcement, Lang } from '../lib/types';
import { tr } from '../lib/utils';

/** Ticker text = every visible advertisement's header followed by its lines. */
export function tickerLines(ads: Announcement[], lang: Lang) {
  return ads
    .filter((a) => a.is_active)
    .flatMap((a) => [tr(a, 'title', lang), ...tr(a, 'body', lang).split('\n')])
    .map((l) => l.trim())
    .filter(Boolean);
}

/** Pixels per second for speed levels 1 (very slow) … 5 (very fast). */
export const TICKER_SPEEDS = [30, 60, 100, 150, 220];

/**
 * The gold scrolling line under the advertisements.
 * Speed is in px/s, so it moves at the same pace however long the text is.
 * Pauses on hover, runs right-to-left content in Arabic, and stops for reduced-motion users.
 */
export function Ticker({ lines, speed }: { lines: string[]; speed: number }) {
  const { dir } = useI18n();
  const trackRef = useRef<HTMLDivElement>(null);
  const [duration, setDuration] = useState(40);
  const pxPerSecond = TICKER_SPEEDS[Math.min(5, Math.max(1, speed)) - 1];

  // Repeat the lines so one half of the track is always wider than the screen,
  // then render that half twice: sliding by -50% loops seamlessly.
  const minItems = Math.max(8, lines.length);
  const half = Array.from({ length: Math.ceil(minItems / Math.max(1, lines.length)) }, () => lines).flat();

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const measure = () => setDuration(Math.max(4, el.scrollWidth / 2 / pxPerSecond));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [pxPerSecond, lines]);

  if (!lines.length) return null;

  return (
    <div className="group relative overflow-hidden border-y border-gold-400/20 bg-gold-400 py-3 text-ink-950" dir="ltr">
      <div
        ref={trackRef}
        className="flex w-max animate-marquee whitespace-nowrap text-sm font-bold uppercase tracking-wide group-hover:[animation-play-state:paused] motion-reduce:animate-none"
        style={{ animationDuration: `${duration}s`, animationDirection: dir === 'rtl' ? 'reverse' : 'normal' }}
      >
        {[...half, ...half].map((line, i) => (
          <span key={i} className="flex items-center gap-10 px-5" dir={dir} aria-hidden={i >= half.length || undefined}>
            {line}
            <span aria-hidden>✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
