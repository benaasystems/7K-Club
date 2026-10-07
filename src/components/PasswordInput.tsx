import { useState, type InputHTMLAttributes } from 'react';
import { Check, Eye, EyeOff, Lock } from 'lucide-react';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../lib/utils';

/** Password field with a lock icon and a show / hide toggle. */
export function PasswordInput({ className, ...props }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 start-3.5 flex items-center text-white/35">
        <Lock className="h-4 w-4" />
      </span>
      <input {...props} type={visible ? 'text' : 'password'} dir="ltr" className={cn('input pe-11 ps-10', className)} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute inset-y-0 end-1.5 my-auto flex h-8 w-8 items-center justify-center rounded-lg text-white/45 transition hover:bg-white/5 hover:text-gold-400"
        aria-label={visible ? t('auth.pw.hide') : t('auth.pw.show')}
        aria-pressed={visible}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

export function passwordChecks(pw: string) {
  return {
    length: pw.length >= 8,
    letterNumber: /[A-Za-z؀-ۿ]/.test(pw) && /\d/.test(pw),
    upper: /[A-Z]/.test(pw) && /[a-z]/.test(pw),
    symbol: /[^A-Za-z0-9\s]/.test(pw),
  };
}

/** The two required rules: 8+ characters, letters and numbers. */
export function isPasswordValid(pw: string) {
  const c = passwordChecks(pw);
  return c.length && c.letterNumber;
}

/** Strength bar + checklist shown under the sign-up password. */
export function PasswordStrength({ password }: { password: string }) {
  const { t } = useI18n();
  const c = passwordChecks(password);
  const score = !password ? 0 : [c.length, c.letterNumber, c.upper, c.symbol || password.length >= 12].filter(Boolean).length;
  const levels = [
    { label: '', color: 'bg-white/10', text: 'text-white/40' },
    { label: t('auth.pw.weak'), color: 'bg-red-400', text: 'text-red-300' },
    { label: t('auth.pw.fair'), color: 'bg-amber-400', text: 'text-amber-300' },
    { label: t('auth.pw.good'), color: 'bg-lime-400', text: 'text-lime-300' },
    { label: t('auth.pw.strong'), color: 'bg-emerald-400', text: 'text-emerald-300' },
  ];
  const level = levels[score];
  const rules = [
    { ok: c.length, label: t('auth.pw.min8') },
    { ok: c.letterNumber, label: t('auth.pw.letterNumber') },
    { ok: c.upper, label: t('auth.pw.upper') },
    { ok: c.symbol, label: t('auth.pw.symbol') },
  ];

  return (
    <div className="mt-2.5 space-y-2" aria-live="polite">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1.5">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={cn('h-1.5 rounded-full transition-colors duration-300', i <= score ? level.color : 'bg-white/10')} />
          ))}
        </div>
        <span className={cn('w-14 text-end text-xs font-semibold', level.text)}>{level.label}</span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {rules.map((r) => (
          <li key={r.label} className={cn('flex items-center gap-1.5 text-xs transition-colors', r.ok ? 'text-emerald-300' : 'text-white/40')}>
            <span className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border', r.ok ? 'border-emerald-400 bg-emerald-400/20' : 'border-white/20')}>
              {r.ok && <Check className="h-2.5 w-2.5" strokeWidth={3} />}
            </span>
            {r.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
