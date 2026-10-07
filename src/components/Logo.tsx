import { Link } from 'react-router-dom';
import { useI18n } from '../i18n/I18nProvider';

export function Logo({ size = 40, withText = true }: { size?: number; withText?: boolean }) {
  const { t } = useI18n();
  return (
    <Link to="/" className="group flex items-center gap-3">
      <img
        src="/logo.svg"
        alt="7K Club"
        width={size}
        height={size}
        className="rounded-full ring-1 ring-gold-400/40 transition group-hover:ring-gold-400"
      />
      {withText && (
        <span className="leading-tight" dir="ltr">
          <span className="block text-lg font-extrabold tracking-tight">
            7K <span className="text-gold-400">CLUB</span>
          </span>
          <span className="hidden text-[10px] font-medium uppercase tracking-[0.18em] text-white/50 sm:block">
            {t('app.tagline')}
          </span>
        </span>
      )}
    </Link>
  );
}
