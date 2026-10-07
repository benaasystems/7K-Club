import { Link } from 'react-router-dom';
import { Mail, MapPin, Phone, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useI18n } from '../i18n/I18nProvider';
import { useSiteSettings } from '../lib/useSiteSettings';
import { tr } from '../lib/utils';
import { FacebookIcon, InstagramIcon } from './icons';
import { Logo } from './Logo';

export function Footer() {
  const { t, lang } = useI18n();
  const s = useSiteSettings();
  const { isStaff } = useAuth();
  const address = tr(s, 'address', lang);

  return (
    <footer className="relative mt-24 border-t border-white/[0.06] bg-ink-900/60">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent" />
      <div className="container-x grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-4 lg:col-span-2">
          <Logo size={48} />
          <p className="max-w-sm text-sm text-white/55">{t('home.hero.subtitle')}</p>
          <p className="inline-flex items-center gap-2 rounded-full border border-gold-400/20 bg-gold-400/5 px-3 py-1.5 text-xs text-gold-300">
            <Wallet className="h-3.5 w-3.5" /> {t('footer.payNote')}
          </p>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-white">{t('footer.links')}</h3>
          <ul className="space-y-2.5 text-sm text-white/60">
            <li><Link to="/" className="hover:text-gold-400">{t('nav.home')}</Link></li>
            <li><Link to="/#branches" className="hover:text-gold-400">{t('nav.branches')}</Link></li>
            <li><Link to="/#about" className="hover:text-gold-400">{t('nav.about')}</Link></li>
            {!isStaff && <li><Link to="/reservations" className="hover:text-gold-400">{t('nav.reservations')}</Link></li>}
          </ul>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-white">{t('footer.contact')}</h3>
          <ul className="space-y-2.5 text-sm text-white/60">
            {s?.phone && (
              <li>
                <a href={`tel:${s.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-2 hover:text-gold-400" dir="ltr">
                  <Phone className="h-4 w-4" /> {s.phone}
                </a>
              </li>
            )}
            {s?.email && (
              <li>
                <a href={`mailto:${s.email}`} className="inline-flex items-center gap-2 hover:text-gold-400">
                  <Mail className="h-4 w-4" /> {s.email}
                </a>
              </li>
            )}
            {address && (
              <li className="inline-flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" /> {address}
              </li>
            )}
          </ul>
          {(s?.instagram_url || s?.facebook_url) && (
            <>
              <h3 className="mb-3 mt-6 text-sm font-semibold text-white">{t('footer.follow')}</h3>
              <div className="flex gap-2">
                {s?.instagram_url && (
                  <a href={s.instagram_url} target="_blank" rel="noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:border-gold-400/50 hover:text-gold-400">
                    <InstagramIcon className="h-5 w-5" />
                  </a>
                )}
                {s?.facebook_url && (
                  <a href={s.facebook_url} target="_blank" rel="noreferrer" aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/70 hover:border-gold-400/50 hover:text-gold-400">
                    <FacebookIcon className="h-5 w-5" />
                  </a>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="border-t border-white/[0.06]">
        <div className="container-x flex flex-col items-center justify-between gap-2 py-5 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} 7K Club. {t('footer.rights')}</p>
          <p>{t('app.tagline')}</p>
        </div>
      </div>
    </footer>
  );
}
