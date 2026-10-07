import { lazy, Suspense, useEffect } from 'react';
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

/** Scroll to top on navigation, or to the #anchor when there is one. */
function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0 });
      return;
    }
    const id = window.setTimeout(() => document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth' }), 60);
    return () => window.clearTimeout(id);
  }, [pathname, hash]);
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
            <Route path="/cart" element={<Cart />} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/reservations" element={<RequireAuth><Reservations /></RequireAuth>} />
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
