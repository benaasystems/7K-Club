import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '../lib/utils';

export interface SelectOption<T extends string | number> {
  value: T;
  label: ReactNode;
  icon?: ReactNode;
}

interface Position {
  left: number;
  width: number;
  top?: number;
  bottom?: number;
  maxHeight: number;
}

const MAX_HEIGHT = 288;

/**
 * Styled replacement for <select>. The list is rendered in a portal with fixed
 * positioning so it is never clipped by modals or scroll containers, and it opens
 * upwards when there is not enough room below.
 */
export function Select<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
  className,
  placeholder,
  'aria-label': ariaLabel,
}: {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  disabled?: boolean;
  className?: string;
  placeholder?: string;
  'aria-label'?: string;
}) {
  const listId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [pos, setPos] = useState<Position | null>(null);
  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = options[selectedIndex];

  const place = useCallback(() => {
    const r = buttonRef.current?.getBoundingClientRect();
    if (!r) return;
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    const wanted = Math.min(MAX_HEIGHT, options.length * 42 + 12);
    const up = below < wanted && above > below;
    setPos({
      left: r.left,
      width: r.width,
      maxHeight: Math.max(120, Math.min(MAX_HEIGHT, up ? above : below)),
      ...(up ? { bottom: window.innerHeight - r.top + 6 } : { top: r.bottom + 6 }),
    });
  }, [options.length]);

  const openList = () => {
    if (disabled) return;
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
    place();
    setOpen(true);
  };
  const close = (focusButton = true) => {
    setOpen(false);
    if (focusButton) buttonRef.current?.focus();
  };
  const choose = (i: number) => {
    const o = options[i];
    if (o) onChange(o.value);
    close();
  };

  // Close on outside click / scroll / resize while open
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!buttonRef.current?.contains(t) && !listRef.current?.contains(t)) close(false);
    };
    const onScroll = (e: Event) => {
      if (!listRef.current?.contains(e.target as Node)) close(false);
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

  // Keep the highlighted option visible. Scroll only the list itself — scrollIntoView
  // would also scroll the page behind an open modal.
  useLayoutEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !list || !el) return;
    if (el.offsetTop < list.scrollTop) list.scrollTop = el.offsetTop - 6;
    else if (el.offsetTop + el.offsetHeight > list.scrollTop + list.clientHeight)
      list.scrollTop = el.offsetTop + el.offsetHeight - list.clientHeight + 6;
  }, [open, active, pos]);

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActive(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActive(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      choose(active);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={ariaLabel}
        onClick={() => (open ? close() : openList())}
        onKeyDown={onKeyDown}
        className={cn(
          'input flex items-center justify-between gap-2 text-start disabled:cursor-not-allowed disabled:opacity-50',
          open && 'border-gold-400/70 ring-2 ring-gold-400/20',
          className,
        )}
      >
        <span className={cn('flex min-w-0 items-center gap-2 truncate', !selected && 'text-white/35')}>
          {selected?.icon}
          <span className="truncate">{selected ? selected.label : placeholder ?? '—'}</span>
        </span>
        <ChevronDown className={cn('h-4 w-4 shrink-0 text-white/45 transition-transform duration-200', open && 'rotate-180 text-gold-400')} />
      </button>

      {open &&
        pos &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            style={{ position: 'fixed', left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom, maxHeight: pos.maxHeight }}
            className="z-[70] min-w-[9rem] overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-ink-800/95 p-1.5 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.8)] backdrop-blur-xl"
          >
            {options.map((o, i) => {
              const isSelected = o.value === value;
              return (
                <li
                  key={String(o.value)}
                  data-index={i}
                  role="option"
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(i)}
                  className={cn(
                    'flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    i === active ? 'bg-white/[0.07] text-white' : 'text-white/75',
                    isSelected && 'font-semibold text-gold-300',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2 truncate">
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                  </span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-gold-400" />}
                </li>
              );
            })}
          </ul>,
          document.body,
        )}
    </>
  );
}

/** Two-option pill switch, used for the language choice. */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  return (
    <div role="radiogroup" className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl border border-white/10 bg-white/[0.04] p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
            value === o.value ? 'bg-gold-400 text-ink-950 shadow' : 'text-white/60 hover:bg-white/5 hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
