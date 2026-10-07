import { useEffect, type ReactNode } from 'react';
import { Loader2, X } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import type { Status } from '../lib/types';
import { cn } from '../lib/utils';

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-5 w-5 animate-spin text-gold-400', className)} />;
}

export function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-8 w-8" />
    </div>
  );
}

export function Empty({ icon, text, action }: { icon?: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      {icon && <div className="text-white/30">{icon}</div>}
      <p className="text-white/60">{text}</p>
      {action}
    </div>
  );
}

export function Alert({ kind = 'error', children }: { kind?: 'error' | 'success' | 'info'; children: ReactNode }) {
  const styles = {
    error: 'border-red-500/30 bg-red-500/10 text-red-200',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
    info: 'border-gold-400/30 bg-gold-400/10 text-gold-200',
  }[kind];
  return <div className={cn('rounded-xl border px-4 py-3 text-sm', styles)}>{children}</div>;
}

export function StatusBadge({ status }: { status: Status }) {
  const { t } = useI18n();
  const styles: Record<Status, string> = {
    pending: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
    accepted: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
    rejected: 'border-red-400/30 bg-red-400/10 text-red-300',
    cancelled: 'border-white/15 bg-white/5 text-white/50',
  };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold', styles[status])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {t(`status.${status}`)}
    </span>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: ReactNode }[];
}) {
  return (
    <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="inline-flex gap-1 rounded-2xl border border-white/10 bg-white/[0.03] p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition',
              value === o.value ? 'bg-gold-400 text-ink-950 shadow' : 'text-white/60 hover:bg-white/5 hover:text-white',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useI18n();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative max-h-[92dvh] w-full animate-fade-up overflow-y-auto rounded-t-3xl border border-white/10 bg-ink-800 p-5 shadow-2xl sm:rounded-3xl sm:p-6',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/50 hover:bg-white/10 hover:text-white"
            aria-label={t('common.close')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-white/40">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <div className="flex items-center gap-3 text-sm text-white/80">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-gold-400' : 'bg-white/15')}
      >
        <span
          className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'start-[22px]' : 'start-0.5')}
        />
      </button>
      <span>{label}</span>
    </div>
  );
}

export function SectionHeader({
  kicker,
  title,
  subtitle,
  action,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {kicker && <p className="kicker mb-2">{kicker}</p>}
        <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">{title}</h2>
        {subtitle && <p className="mt-2 max-w-2xl text-white/60">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Avatar({ url, name, size = 36 }: { url?: string | null; name?: string; size?: number }) {
  const initials = (name || '?')
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return url ? (
    <img
      src={url}
      alt=""
      style={{ width: size, height: size }}
      className="shrink-0 rounded-full object-cover ring-1 ring-white/15"
    />
  ) : (
    <span
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold-300 to-gold-600 font-bold text-ink-950"
    >
      {initials}
    </span>
  );
}
