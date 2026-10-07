import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Minus, Plus, ShoppingBag, Store, Trash2, Wallet } from 'lucide-react';
import { Alert, Empty, Field, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthProvider';
import { useCart } from '../context/CartProvider';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../lib/supabase';
import type { Branch } from '../lib/types';
import { errorCode, money, tr } from '../lib/utils';

export default function Cart() {
  const { t, lang } = useI18n();
  const { session, isStaff } = useAuth();
  const cart = useCart();
  const navigate = useNavigate();
  const location = useLocation();
  const [branch, setBranch] = useState<Branch | null>(null);
  const [stores, setStores] = useState<Branch[] | null>(null);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!cart.branchId) return setBranch(null);
    supabase.from('branches').select('*').eq('id', cart.branchId).maybeSingle().then(({ data }) => setBranch(data as Branch));
  }, [cart.branchId]);

  // Empty cart → offer each open branch's store directly (the store belongs to a branch).
  const empty = cart.lines.length === 0;
  useEffect(() => {
    if (!empty || stores) return;
    supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setStores((data as Branch[]) ?? []));
  }, [empty, stores]);

  const place = async () => {
    if (!session) return navigate(`/signin?next=${encodeURIComponent(location.pathname)}`);
    setSaving(true);
    setError('');
    const { error } = await supabase.rpc('place_order', {
      p_branch: cart.branchId,
      p_items: cart.lines.map((l) => ({ item_id: l.item.id, quantity: l.quantity })),
      p_notes: notes.trim(),
    });
    setSaving(false);
    if (error) return setError(t(`err.${errorCode(error)}`));
    cart.clear();
    navigate('/reservations?tab=orders&placed=1');
  };

  // Staff and admin accounts don't shop.
  if (isStaff) return <Navigate to="/" replace />;

  return (
    <div className="container-x max-w-4xl py-10 sm:py-14">
      <h1 className="text-3xl font-extrabold">{t('cart.title')}</h1>
      {branch && (
        <Link to={`/branches/${branch.id}?tab=store`} className="mt-2 inline-flex items-center gap-2 text-sm text-gold-400 hover:underline">
          <Store className="h-4 w-4" /> {tr(branch, 'name', lang)}
        </Link>
      )}

      <div className="mt-8">
        {cart.lines.length === 0 ? (
          <Empty
            icon={<ShoppingBag className="h-10 w-10" />}
            text={t('cart.empty')}
            action={
              !stores ? (
                <Spinner />
              ) : stores.length === 0 ? null : (
                <div className="flex flex-wrap justify-center gap-3">
                  {stores.map((b) => (
                    <Link key={b.id} to={`/branches/${b.id}?tab=store`} className="btn-primary">
                      <Store className="h-4 w-4" /> {stores.length === 1 ? t('cart.browse') : t('cart.browseBranch', { name: tr(b, 'name', lang) })}
                    </Link>
                  ))}
                </div>
              )
            }
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            <ul className="space-y-3">
              {cart.lines.map(({ item, quantity }) => (
                <li key={item.id} className="card flex items-center gap-4 p-3 sm:p-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white/5 sm:h-20 sm:w-20">
                    {item.image_url ? <img src={item.image_url} alt="" className="h-full w-full object-cover" /> : <ShoppingBag className="m-auto mt-5 h-6 w-6 text-white/20" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{tr(item, 'name', lang)}</p>
                    <p className="text-sm text-gold-400">{money(item.price, lang)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 hover:bg-white/5" onClick={() => cart.setQuantity(item.id, quantity - 1)} aria-label="-">
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center font-semibold">{quantity}</span>
                      <button className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 hover:bg-white/5" onClick={() => cart.setQuantity(item.id, quantity + 1)} aria-label="+">
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-3">
                    <p className="font-bold">{money(Number(item.price) * quantity, lang)}</p>
                    <button className="text-white/40 hover:text-red-300" onClick={() => cart.remove(item.id)} aria-label={t('admin.delete')}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
              <li>
                <button className="text-sm text-white/50 hover:text-red-300" onClick={cart.clear}>
                  {t('cart.clear')}
                </button>
              </li>
            </ul>

            <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-24">
              <Field label={t('cart.notes')}>
                <textarea className="input min-h-[80px]" value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
              </Field>
              <div className="flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-white/70">{t('cart.total')}</span>
                <span className="text-2xl font-extrabold text-gold-400">{money(cart.total, lang)}</span>
              </div>
              <p className="flex items-center gap-2 text-xs text-white/50">
                <Wallet className="h-3.5 w-3.5" /> {t('footer.payNote')}
              </p>
              {error && <Alert>{error}</Alert>}
              <button className="btn-primary w-full py-3" onClick={place} disabled={saving}>
                {saving && <Spinner className="h-4 w-4 text-ink-950" />} {session ? t('cart.place') : t('nav.signin')}
              </button>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
