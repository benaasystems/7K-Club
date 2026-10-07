import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { clubToday, cn } from '../lib/utils';

// Dates are 'yyyy-mm-dd' strings, handled as UTC so the device time zone can never shift a day.
const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const iso = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setUTCDate(d.getUTCDate() + n);
  return iso(d);
};
const monthOf = (s: string) => `${s.slice(0, 7)}-01`;
const addMonths = (s: string, n: number) => {
  const d = parse(monthOf(s));
  d.setUTCMonth(d.getUTCMonth() + n);
  return iso(d);
};

const PANEL_W = 312;
const PANEL_H = 400;

/**
 * Themed calendar popover, replacing the browser's native date input.
 * `clearable` allows an empty value ('') — e.g. a filter where no date means "any date".
 */
export function DatePicker({
  value,
  onChange,
  min,
  placeholder,
  clearable,
}: {
  value: string;
  onChange: (date: string) => void;
  min?: string;
  placeholder?: string;
  clearable?: boolean;
}) {
  const { t, lang, dir } = useI18n();
  const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
  const weekStart = lang === 'ar' ? 6 : 0; // Saturday for Arabic (Egypt), Sunday for English
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(monthOf(value || clubToday()));
  const [focus, setFocus] = useState(value || clubToday());
  const [pos, setPos] = useState<{ left: number; width: number; top?: number; bottom?: number } | null>(null);

  const today = clubToday();
  const tomorrow = addDays(today, 1);
  const disabled = (d: string) => !!min && d < min;
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...o, timeZone: 'UTC' }).format(parse(d));

  const place = () => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(PANEL_W, window.innerWidth - 16);
    const left = Math.min(Math.max(8, dir === 'rtl' ? r.right - width : r.left), window.innerWidth - width - 8);
    const below = window.innerHeight - r.bottom - 12;
    const up = below < PANEL_H && r.top > below;
    setPos({ left, width, ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }) });
  };

  const openPanel = () => {
    setMonth(monthOf(value || today));
    setFocus(value || today);
    place();
    setOpen(true);
  };
  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };
  const choose = (d: string) => {
    if (d && disabled(d)) return;
    onChange(d);
    close();
  };
  const moveFocus = (d: string) => {
    setFocus(d);
    if (monthOf(d) !== month) setMonth(monthOf(d));
  };

  // Close on outside click / page scroll / resize
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const el = e.target as Node;
      if (!buttonRef.current?.contains(el) && !panelRef.current?.contains(el)) close(false);
    };
    const onScroll = (e: Event) => {
      if (!panelRef.current?.contains(e.target as Node)) close(false);
    };
    const onResize = () => close(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onResize);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  // Keyboard focus follows the highlighted day
  useLayoutEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>(`[data-date="${focus}"]`)?.focus({ preventScroll: true });
  }, [open, focus, month]);

  const onGridKey = (e: KeyboardEvent) => {
    const step: Record<string, number> = {
      ArrowLeft: dir === 'rtl' ? 1 : -1,
      ArrowRight: dir === 'rtl' ? -1 : 1,
      ArrowUp: -7,
      ArrowDown: 7,
    };
    if (e.key in step) {
      e.preventDefault();
      moveFocus(addDays(focus, step[e.key]));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault();
      const d = parse(focus);
      d.setUTCMonth(d.getUTCMonth() + (e.key === 'PageUp' ? -1 : 1));
      moveFocus(iso(d));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation(); // close only the calendar, not the booking modal behind it
      close();
    }
  };

  // Always 6 weeks, so the panel never changes height between months
  const offset = (parse(month).getUTCDay() - weekStart + 7) % 7;
  const gridStart = addDays(month, -offset);
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  // 2023-01-01 was a Sunday
  const weekdays = Array.from({ length: 7 }, (_, i) => {
    const d = iso(new Date(Date.UTC(2023, 0, 1 + ((weekStart + i) % 7))));
    return lang === 'ar' ? fmt(d, { weekday: 'narrow' }) : fmt(d, { weekday: 'short' }).slice(0, 2);
  });
  const canPrev = !min || month > monthOf(min);
  const Prev = dir === 'rtl' ? ChevronRight : ChevronLeft;
  const Next = dir === 'rtl' ? ChevronLeft : ChevronRight;
  const relative = value === today ? t('date.today') : value === tomorrow ? t('date.tomorrow') : '';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            e.preventDefault();
            openPanel();
          }
        }}
        className={cn('input flex items-center gap-2.5 text-start', open && 'border-gold-400/70 ring-2 ring-gold-400/20')}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-gold-400" />
        <span className={cn('min-w-0 flex-1 truncate', !value && 'text-white/35')}>
          {value
            ? fmt(value, { weekday: 'short', day: 'numeric', month: 'short', ...(value.slice(0, 4) !== today.slice(0, 4) && { year: 'numeric' }) })
            : placeholder ?? '—'}
        </span>
        {relative && <span className="shrink-0 rounded-md bg-gold-400/15 px-1.5 py-0.5 text-[11px] font-semibold text-gold-300">{relative}</span>}
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/45 transition-transform duration-200', open && 'rotate-180 text-gold-400')} />
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label={t('booking.date')}
            style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
            className="z-[70] animate-fade-up-fast rounded-2xl border border-white/10 bg-ink-800/95 p-3 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl motion-reduce:animate-none"
          >
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <button
                type="button"
                onClick={() => setMonth(addMonths(month, -1))}
                disabled={!canPrev}
                aria-label={t('date.prevMonth')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/[0.07] hover:text-white disabled:pointer-events-none disabled:opacity-25"
              >
                <Prev className="h-4 w-4" />
              </button>
              <p className="text-sm font-bold" aria-live="polite">{fmt(month, { month: 'long', year: 'numeric' })}</p>
              <button
                type="button"
                onClick={() => setMonth(addMonths(month, 1))}
                aria-label={t('date.nextMonth')}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/[0.07] hover:text-white"
              >
                <Next className="h-4 w-4" />
              </button>
            </div>

            <div role="grid" onKeyDown={onGridKey} className="grid grid-cols-7 gap-1">
              {weekdays.map((w, i) => (
                <span key={i} className="pb-1 text-center text-[11px] font-semibold uppercase text-white/40">{w}</span>
              ))}
              {days.map((d) => {
                const off = disabled(d);
                const selected = d === value;
                const inMonth = monthOf(d) === month;
                return (
                  <button
                    key={d}
                    type="button"
                    data-date={d}
                    tabIndex={d === focus ? 0 : -1}
                    disabled={off}
                    aria-pressed={selected}
                    aria-label={fmt(d, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                    onClick={() => choose(d)}
                    className={cn(
                      'flex h-9 items-center justify-center rounded-lg text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/60',
                      selected
                        ? 'bg-gold-400 font-bold text-ink-950 shadow'
                        : off
                          ? 'cursor-not-allowed text-white/15'
                          : cn('hover:bg-white/[0.08]', inMonth ? 'text-white/85' : 'text-white/30', d === today && 'font-semibold text-gold-300 ring-1 ring-inset ring-gold-400/40'),
                    )}
                  >
                    {fmt(d, { day: 'numeric' })}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3">
              {[
                { d: today, label: t('date.today') },
                { d: tomorrow, label: t('date.tomorrow') },
              ].map((q) => (
                <button
                  key={q.d}
                  type="button"
                  disabled={disabled(q.d)}
                  onClick={() => choose(q.d)}
                  className={cn('btn-ghost btn-sm flex-1', value === q.d && 'border-gold-400/50 text-gold-300')}
                >
                  {q.label}
                </button>
              ))}
              {clearable && value && (
                <button type="button" onClick={() => choose('')} className="btn-ghost btn-sm flex-1 text-white/60">
                  {t('date.clear')}
                </button>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
