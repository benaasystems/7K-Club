import { lazy, Suspense, useLayoutEffect, useRef } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { RequireAuth } from './components/RequireAuth';
import { Alert, Empty, PageLoader } from './components/ui';
import { useI18n } from './i18n/I18nProvider';
import { isConfigured } from './lib/supabase';
import { SignIn, SignUp } from './pages/Auth';
import BranchPage from './pages/BranchPage';
import Cart from './pages/Cart';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Reservations from './pages/Reservations';

// Staff/admin screens are only downloaded by the people who use them.
const StaffDashboard = lazy(() => import('./pages/StaffDashboard'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
const BranchManage = lazy(() => import('./pages/admin/BranchManage'));

/**
 * Scroll position that puts a section's content (ignoring its top padding) in the middle of the
 * space under the sticky header — or just under the header when the content is taller than that.
 */
function sectionScrollTop(el: HTMLElement) {
  const header = document.querySelector('header')?.getBoundingClientRect().height ?? 0;
  const padTop = parseFloat(getComputedStyle(el).paddingTop) || 0;
  const rect = el.getBoundingClientRect();
  const height = rect.height - padTop;
  const room = window.innerHeight - header;
  const gap = height < room ? (room - height) / 2 : 16;
  return Math.max(0, window.scrollY + rect.top + padTop - header - gap);
}

/** Scroll to top on navigation, or to the #anchor when there is one. */
function ScrollManager() {
  const { pathname, hash, key } = useLocation();
  const lastPath = useRef(pathname);

  // Layout effects + 'instant' so a new page is already at the right place when it first paints
  // (the CSS `scroll-behavior: smooth` would otherwise animate from the old page's position).

  // New page (no anchor) → back to the top. Query-string changes (tabs) keep the position.
  useLayoutEffect(() => {
    if (!hash) window.scrollTo({ top: 0, behavior: 'instant' });
  }, [pathname, hash]);

  // Anchor links (/#about, /#branches): `key` changes on every click, so clicking the
  // same link again after scrolling away still scrolls back to the section.
  useLayoutEffect(() => {
    const samePage = lastPath.current === pathname;
    lastPath.current = pathname;
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    // Already on the page → glide to the section. Coming from another page → open right at it.
    const behavior: ScrollBehavior = samePage ? 'smooth' : 'instant';
    let lastTop = -1;
    const go = () => {
      const el = document.getElementById(id);
      if (!el) return;
      const top = sectionScrollTop(el);
      if (Math.abs(top - lastTop) < 1) return;
      lastTop = top;
      window.scrollTo({ top, behavior });
    };
    go();

    // Coming from another page, the sections above (branches, images) are still loading and push
    // the target down. Follow it while the page grows, until it settles or the user scrolls.
    const ro = new ResizeObserver(go);
    ro.observe(document.body);
    const stop = () => ro.disconnect();
    const timer = window.setTimeout(stop, 2500);
    const userEvents = ['wheel', 'touchstart', 'keydown'] as const;
    userEvents.forEach((e) => window.addEventListener(e, stop, { passive: true, once: true }));
    return () => {
      stop();
      window.clearTimeout(timer);
      userEvents.forEach((e) => window.removeEventListener(e, stop));
    };
  }, [pathname, hash, key]);

  return null;
}

function NotFound() {
  const { t } = useI18n();
  return (
    <div className="container-x py-20">
      <Empty text={t('common.notFound')} action={<Link to="/" className="btn-primary">{t('common.goHome')}</Link>} />
    </div>
  );
}

export default function App() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh flex-col">
      <ScrollManager />
      <Navbar />
      {!isConfigured && (
        <div className="container-x pt-4">
          <Alert kind="info">
            <b>{t('setup.title')}:</b> {t('setup.body')}
          </Alert>
        </div>
      )}
      <main className="flex-1">
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/branches/:id" element={<BranchPage />} />
            <Route path="/cart" element={<RequireAuth roles={['customer']}><Cart /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/reservations" element={<RequireAuth roles={['customer']}><Reservations /></RequireAuth>} />
            <Route path="/staff" element={<RequireAuth roles={['staff', 'admin']}><StaffDashboard /></RequireAuth>} />
            <Route path="/admin" element={<RequireAuth roles={['admin']}><AdminPage /></RequireAuth>} />
            <Route path="/admin/branches/:id" element={<RequireAuth roles={['admin']}><BranchManage /></RequireAuth>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
