import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Clock, MapPin, MessageSquare, ShoppingBag, Users } from 'lucide-react';
import { ResourceIcon } from '../components/icons';
import { Alert, Empty, PageLoader, StatusBadge, Tabs, useConfirm } from '../components/ui';
import { useAuth } from '../context/AuthProvider';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../lib/supabase';
import type { Booking, Order } from '../lib/types';
import { errorCode, formatDateTime, formatTime, money, tr } from '../lib/utils';

type Tab = 'bookings' | 'orders';

export default function Reservations() {
  const { t, lang } = useI18n();
  const [confirm, confirmDialog] = useConfirm();
  const { session } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'orders' ? 'orders' : 'bookings';
  const placed = params.get('placed') === '1';
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState('');
  const userId = session?.user.id;

  const load = useCallback(async () => {
    if (!userId) return;
    const [b, o] = await Promise.all([
      supabase
        .from('bookings')
        .select('*, resource:resources(name_en, name_ar, type), branch:branches(name_en, name_ar)')
        .eq('user_id', userId)
        .order('start_at', { ascending: false }),
      supabase
        .from('orders')
        .select('*, order_items(*), branch:branches(name_en, name_ar)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
    ]);
    setBookings((b.data as Booking[]) ?? []);
    setOrders((o.data as Order[]) ?? []);
  }, [userId]);

  useEffect(() => {
    load();
    if (!userId) return;
    // Live status updates when staff accept / reject
    const channel = supabase
      .channel(`my-reservations-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings', filter: `user_id=eq.${userId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const cancel = async (table: 'bookings' | 'orders', id: string) => {
    if (!(await confirm({ title: t(table === 'bookings' ? 'res.cancelConfirm' : 'res.cancelOrderConfirm'), message: t('res.cancelBody'), confirmLabel: t(table === 'bookings' ? 'res.cancelYes' : 'res.cancelOrderYes'), cancelLabel: t('res.keep'), danger: true }))) return;
    setError('');
    const { error } = await supabase.from(table).update({ status: 'cancelled' }).eq('id', id);
    if (error) setError(t(`err.${errorCode(error)}`));
    load();
  };

  if (!bookings || !orders) return <PageLoader />;
  const now = Date.now();

  return (
    <div className="container-x max-w-4xl py-10 sm:py-14">
      {confirmDialog}
      <h1 className="text-3xl font-extrabold">{t('res.title')}</h1>
      <p className="mt-1 text-white/55">{t('res.subtitle')}</p>

      <div className="mt-8 space-y-4">
        <Tabs<Tab>
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          options={[
            { value: 'bookings', label: <><CalendarDays className="h-4 w-4" /> {t('res.tab.bookings')} ({bookings.length})</> },
            { value: 'orders', label: <><ShoppingBag className="h-4 w-4" /> {t('res.tab.orders')} ({orders.length})</> },
          ]}
        />
        {placed && tab === 'orders' && <Alert kind="success">{t('cart.success')}</Alert>}
        {error && <Alert>{error}</Alert>}
      </div>

      <div className="mt-6 space-y-4">
        {tab === 'bookings' &&
          (bookings.length === 0 ? (
            <Empty icon={<CalendarDays className="h-10 w-10" />} text={t('res.empty.bookings')} action={<Link to="/#branches" className="btn-primary">{t('res.bookNow')}</Link>} />
          ) : (
            bookings.map((b) => {
              const canCancel = (b.status === 'pending' || b.status === 'accepted') && new Date(b.start_at).getTime() > now;
              return (
                <article key={b.id} className="card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-400">
                        {b.resource && <ResourceIcon type={b.resource.type} className="h-5 w-5" />}
                      </span>
                      <div>
                        <p className="font-bold">{tr(b.resource, 'name', lang)}</p>
                        <p className="flex items-center gap-1 text-sm text-white/50"><MapPin className="h-3.5 w-3.5" /> {tr(b.branch, 'name', lang)}</p>
                      </div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/70">
                    <span className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-gold-400" /> {formatDateTime(b.start_at, lang)} – {formatTime(b.end_at, lang)}</span>
                    <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-gold-400" /> {t('res.guests', { n: b.guests })}</span>
                    <span className="font-semibold text-white">{money(b.total_price, lang)}</span>
                  </div>
                  {b.status === 'accepted' && (
                    <p className="mt-3 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> {t('res.confirmed')}</p>
                  )}
                  {b.status === 'pending' && <p className="mt-3 text-sm text-amber-300/80">{t('res.pendingInfo')}</p>}
                  {b.staff_note && (
                    <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/[0.04] p-3 text-sm text-white/70">
                      <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" /> <span><b>{t('res.staffNote')}:</b> {b.staff_note}</span>
                    </p>
                  )}
                  {canCancel && (
                    <button className="btn-danger btn-sm mt-4" onClick={() => cancel('bookings', b.id)}>
                      {t('res.cancel')}
                    </button>
                  )}
                </article>
              );
            })
          ))}

        {tab === 'orders' &&
          (orders.length === 0 ? (
            <Empty icon={<ShoppingBag className="h-10 w-10" />} text={t('res.empty.orders')} />
          ) : (
            orders.map((o) => (
              <article key={o.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-bold">{t('res.order')} #{o.id.slice(0, 6).toUpperCase()}</p>
                    <p className="flex items-center gap-1 text-sm text-white/50"><MapPin className="h-3.5 w-3.5" /> {tr(o.branch, 'name', lang)} · {formatDateTime(o.created_at, lang)}</p>
                  </div>
                  <StatusBadge status={o.status} />
                </div>
                <ul className="mt-4 divide-y divide-white/[0.06] rounded-xl border border-white/10">
                  {o.order_items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3 px-4 py-2.5 text-sm">
                      <span>{i.quantity} × {tr(i, 'name', lang)}</span>
                      <span className="text-white/70">{money(Number(i.unit_price) * i.quantity, lang)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between px-4 py-2.5 font-bold">
                    <span>{t('cart.total')}</span>
                    <span className="text-gold-400">{money(o.total, lang)}</span>
                  </li>
                </ul>
                {o.status === 'accepted' && <p className="mt-3 flex items-center gap-2 text-sm text-emerald-300"><CheckCircle2 className="h-4 w-4" /> {t('res.confirmed')}</p>}
                {o.status === 'pending' && <p className="mt-3 text-sm text-amber-300/80">{t('res.pendingInfo')}</p>}
                {o.staff_note && (
                  <p className="mt-3 flex items-start gap-2 rounded-xl bg-white/[0.04] p-3 text-sm text-white/70">
                    <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" /> <span><b>{t('res.staffNote')}:</b> {o.staff_note}</span>
                  </p>
                )}
                {o.status === 'pending' && (
                  <button className="btn-danger btn-sm mt-4" onClick={() => cancel('orders', o.id)}>
                    {t('res.cancel')}
                  </button>
                )}
              </article>
            ))
          ))}
      </div>
    </div>
  );
}
