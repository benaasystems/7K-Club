import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { CalendarCheck, ClipboardList, Languages, LogOut, Menu, ShieldCheck, ShoppingBag, User, X } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useCart } from '../context/CartProvider';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../lib/utils';
import { Logo } from './Logo';
import { Avatar } from './ui';

export function Navbar() {
  const { t, lang } = useI18n();
  const { session, profile, signOut, changeLanguage } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [location.pathname, location.hash]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isStaff = profile?.role === 'staff' || profile?.role === 'admin';
  const isAdmin = profile?.role === 'admin';

  const links = [
    { to: '/', label: t('nav.home'), end: true },
    { to: '/#branches', label: t('nav.branches') },
    { to: '/#about', label: t('nav.about') },
    ...(session ? [{ to: '/reservations', label: t('nav.reservations') }] : []),
    ...(isStaff ? [{ to: '/staff', label: t('nav.staff') }] : []),
    ...(isAdmin ? [{ to: '/admin', label: t('nav.admin') }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const toggleLang = () => changeLanguage(lang === 'ar' ? 'en' : 'ar');

  const linkClass = (active: boolean) =>
    cn('rounded-lg px-3 py-2 text-sm font-medium transition', active ? 'text-gold-400' : 'text-white/70 hover:text-white');

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-ink-950/75 backdrop-blur-xl">
      <div className="container-x flex h-16 items-center justify-between gap-4 sm:h-[72px]">
        <Logo />

        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((l) =>
            l.to.includes('#') ? (
              <Link key={l.to} to={l.to} className={linkClass(false)}>
                {l.label}
              </Link>
            ) : (
              <NavLink key={l.to} to={l.to} end={l.end} className={({ isActive }) => linkClass(isActive)}>
                {l.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button onClick={toggleLang} className="btn-ghost btn-sm h-9 px-3" aria-label={t('lang.switch')}>
            <Languages className="h-4 w-4" />
            <span className="hidden sm:inline">{t('lang.switch')}</span>
          </button>

          <Link to="/cart" className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08]" aria-label={t('nav.cart')}>
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -end-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold-400 px-1 text-[10px] font-bold text-ink-950">
                {count}
              </span>
            )}
          </Link>

          {session ? (
            <div className="relative hidden lg:block" ref={menuRef}>
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-full p-0.5 ring-1 ring-white/10 hover:ring-gold-400/60">
                <Avatar url={profile?.avatar_url} name={profile?.full_name || session.user.email} size={34} />
              </button>
              {menuOpen && (
                <div className="absolute end-0 mt-2 w-60 animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-ink-800 p-1.5 shadow-2xl">
                  <div className="px-3 py-2.5">
                    <p className="truncate text-sm font-semibold">{profile?.full_name || '—'}</p>
                    <p className="truncate text-xs text-white/50">{session.user.email}</p>
                  </div>
                  <div className="my-1 h-px bg-white/10" />
                  <MenuLink to="/profile" icon={<User className="h-4 w-4" />} label={t('nav.profile')} />
                  <MenuLink to="/reservations" icon={<CalendarCheck className="h-4 w-4" />} label={t('nav.reservations')} />
                  {isStaff && <MenuLink to="/staff" icon={<ClipboardList className="h-4 w-4" />} label={t('nav.staff')} />}
                  {isAdmin && <MenuLink to="/admin" icon={<ShieldCheck className="h-4 w-4" />} label={t('nav.admin')} />}
                  <div className="my-1 h-px bg-white/10" />
                  <button onClick={handleSignOut} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-red-300 hover:bg-red-500/10">
                    <LogOut className="h-4 w-4" /> {t('nav.signout')}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 lg:flex">
              <Link to="/signin" className="btn btn-sm h-9 px-4 text-white/80 hover:text-white">
                {t('nav.signin')}
              </Link>
              <Link to="/signup" className="btn-primary btn-sm h-9 px-4">
                {t('nav.signup')}
              </Link>
            </div>
          )}

          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] lg:hidden"
            aria-label={t('nav.menu')}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="animate-fade-up border-t border-white/[0.06] bg-ink-900/95 lg:hidden">
          <div className="container-x flex flex-col gap-1 py-4">
            {session && (
              <Link to="/profile" className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <Avatar url={profile?.avatar_url} name={profile?.full_name || session.user.email} size={40} />
                <div className="min-w-0">
                  <p className="truncate font-semibold">{profile?.full_name || '—'}</p>
                  <p className="truncate text-xs text-white/50">{session.user.email}</p>
                </div>
              </Link>
            )}
            {links.map((l) => (
              <Link key={l.to} to={l.to} className="rounded-xl px-3 py-3 font-medium text-white/80 hover:bg-white/5 hover:text-white">
                {l.label}
              </Link>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {session ? (
                <button onClick={handleSignOut} className="btn-danger col-span-2">
                  <LogOut className="h-4 w-4" /> {t('nav.signout')}
                </button>
              ) : (
                <>
                  <Link to="/signin" className="btn-ghost">
                    {t('nav.signin')}
                  </Link>
                  <Link to="/signup" className="btn-primary">
                    {t('nav.signup')}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-white/80 hover:bg-white/5 hover:text-white">
      {icon} {label}
    </Link>
  );
}
