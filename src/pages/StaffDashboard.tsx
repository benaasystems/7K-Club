import { useCallback, useEffect, useState } from 'react';
import { Building2, CalendarDays, Check, Clock, Mail, MapPin, MessageSquare, Phone, RefreshCw, ShoppingBag, Users, X } from 'lucide-react';
import { DatePicker } from '../components/DatePicker';
import { ResourceIcon } from '../components/icons';
import { Select } from '../components/Select';
import { Alert, Avatar, Empty, Field, Modal, Spinner, StatusBadge, Tabs } from '../components/ui';
import { useAuth } from '../context/AuthProvider';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../lib/supabase';
import type { Booking, Branch, Order, Status } from '../lib/types';
import { clubDate, cn, errorCode, formatDateTime, formatTime, money, tr } from '../lib/utils';

type Tab = 'bookings' | 'orders';
type StatusFilter = Status | 'all';
const STATUS_DOT: Record<StatusFilter, string> = {
  pending: 'bg-amber-400',
  accepted: 'bg-emerald-400',
  rejected: 'bg-red-400',
  cancelled: 'bg-white/40',
  all: 'bg-gold-400',
};
const CUSTOMER = 'full_name, email, phone, avatar_url';

export default function StaffDashboard() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('bookings');
  const [status, setStatus] = useState<StatusFilter>('pending');
  const [branchId, setBranchId] = useState<string>(profile?.role === 'staff' && profile.branch_id ? profile.branch_id : 'all');
  const [day, setDay] = useState('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [pending, setPending] = useState({ bookings: 0, orders: 0 });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const lockedBranch = profile?.role === 'staff' && !!profile.branch_id;

  useEffect(() => {
    supabase.from('branches').select('*').order('sort_order').then(({ data }) => setBranches((data as Branch[]) ?? []));
  }, []);

  const load = useCallback(async () => {
    let bq = supabase
      .from('bookings')
      .select(`*, resource:resources(name_en, name_ar, type), branch:branches(name_en, name_ar), customer:profiles!bookings_user_id_fkey(${CUSTOMER})`)
      .order('start_at', { ascending: status === 'pending' })
      .limit(200);
    let oq = supabase
      .from('orders')
      .select(`*, order_items(*), branch:branches(name_en, name_ar), customer:profiles!orders_user_id_fkey(${CUSTOMER})`)
      .order('created_at', { ascending: status === 'pending' })
      .limit(200);
    let pb = supabase.from('bookings').select('id', { count: 'exact', head: true }).eq('status', 'pending');
    let po = supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'pending');

    if (status !== 'all') {
      bq = bq.eq('status', status);
      oq = oq.eq('status', status);
    }
    if (branchId !== 'all') {
      bq = bq.eq('branch_id', branchId);
      oq = oq.eq('branch_id', branchId);
      pb = pb.eq('branch_id', branchId);
      po = po.eq('branch_id', branchId);
    }
    if (day) {
      const from = clubDate(day, 0);
      const to = clubDate(day, 24 * 60);
      bq = bq.gte('start_at', from.toISOString()).lt('start_at', to.toISOString());
      oq = oq.gte('created_at', from.toISOString()).lt('created_at', to.toISOString());
    }

    const [b, o, cb, co] = await Promise.all([bq, oq, pb, po]);
    setBookings((b.data as Booking[]) ?? []);
    setOrders((o.data as Order[]) ?? []);
    setPending({ bookings: cb.count ?? 0, orders: co.count ?? 0 });
  }, [status, branchId, day]);

  useEffect(() => {
    load();
    const channel = supabase
      .channel('staff-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const [rejecting, setRejecting] = useState<{ table: Tab; id: string } | null>(null);

  const decide = async (table: Tab, id: string, next: 'accepted' | 'rejected', staff_note = '') => {
    setBusyId(id);
    setError('');
    const { error } = await supabase.from(table).update({ status: next, staff_note }).eq('id', id);
    setBusyId(null);
    if (error) setError(t(`err.${errorCode(error)}`));
    load();
    return !error;
  };

  const statuses: StatusFilter[] = ['pending', 'accepted', 'rejected', 'cancelled', 'all'];

  const Actions = ({ table, id, current }: { table: Tab; id: string; current: Status }) =>
    current === 'cancelled' ? null : (
      <div className="flex gap-2">
        {current !== 'accepted' && (
          <button className="btn-success btn-sm" disabled={busyId === id} onClick={() => decide(table, id, 'accepted')}>
            {busyId === id ? <Spinner className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />} {t('staff.accept')}
          </button>
        )}
        {current !== 'rejected' && (
          <button className="btn-danger btn-sm" disabled={busyId === id} onClick={() => setRejecting({ table, id })}>
            <X className="h-3.5 w-3.5" /> {t('staff.reject')}
          </button>
        )}
      </div>
    );

  const Customer = ({ c }: { c: Booking['customer'] }) => (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar url={c?.avatar_url} name={c?.full_name || c?.email || '?'} size={40} />
      <div className="min-w-0 text-sm">
        <p className="truncate font-semibold">{c?.full_name || '—'}</p>
        <div className="flex flex-wrap gap-x-3 text-white/50">
          {c?.phone && <a href={`tel:${c.phone}`} className="flex items-center gap-1 hover:text-gold-400" dir="ltr"><Phone className="h-3 w-3" /> {c.phone}</a>}
          {c?.email && <a href={`mailto:${c.email}`} className="flex min-w-0 items-center gap-1 truncate hover:text-gold-400"><Mail className="h-3 w-3" /> {c.email}</a>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-x py-10 sm:py-14">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">{t('staff.title')}</h1>
          <p className="mt-1 text-white/55">{t('staff.subtitle')}</p>
        </div>
        <button className="btn-ghost btn-sm self-start" onClick={load}>
          <RefreshCw className="h-3.5 w-3.5" /> {t('staff.refresh')}
        </button>
      </div>

      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'bookings', label: <><CalendarDays className="h-4 w-4" /> {t('res.tab.bookings')} {pending.bookings > 0 && <Count n={pending.bookings} active={tab === 'bookings'} />}</> },
            { value: 'orders', label: <><ShoppingBag className="h-4 w-4" /> {t('res.tab.orders')} {pending.orders > 0 && <Count n={pending.orders} active={tab === 'orders'} />}</> },
          ]}
        />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {!lockedBranch && (
            <div className="col-span-2 sm:w-52">
              <Select
                aria-label={t('nav.branches')}
                value={branchId}
                onChange={setBranchId}
                options={[
                  { value: 'all', label: t('staff.allBranches'), icon: <Building2 className="h-4 w-4 text-gold-400" /> },
                  ...branches.map((b) => ({ value: b.id, label: tr(b, 'name', lang), icon: <MapPin className="h-4 w-4 text-white/40" /> })),
                ]}
              />
            </div>
          )}
          <div className="sm:w-44">
            <Select
              aria-label={t('f.status')}
              value={status}
              onChange={setStatus}
              options={statuses.map((s) => ({
                value: s,
                label: s === 'all' ? t('staff.all') : t(`status.${s}`),
                icon: <span className={cn('h-2 w-2 rounded-full', STATUS_DOT[s])} />,
              }))}
            />
          </div>
          <div className="sm:w-48">
            <DatePicker value={day} onChange={setDay} clearable placeholder={t('date.any')} />
          </div>
        </div>
      </div>

      {error && <div className="mt-4"><Alert>{error}</Alert></div>}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {tab === 'bookings' &&
          (!bookings ? (
            <Spinner className="h-8 w-8" />
          ) : bookings.length === 0 ? (
            <div className="lg:col-span-2"><Empty text={t('staff.empty')} /></div>
          ) : (
            bookings.map((b) => (
              <article key={b.id} className={cn('card flex flex-col gap-4 p-5', b.status === 'pending' && 'border-amber-400/25')}>
                <div className="flex items-start justify-between gap-3">
                  <Customer c={b.customer} />
                  <StatusBadge status={b.status} />
                </div>
                <div className="grid gap-2 rounded-xl bg-white/[0.03] p-3 text-sm text-white/75 sm:grid-cols-2">
                  <span className="flex items-center gap-2">{b.resource && <ResourceIcon type={b.resource.type} className="h-4 w-4 text-gold-400" />} {tr(b.resource, 'name', lang)}</span>
                  <span className="flex items-center gap-2"><MapPin className="h-4 w-4 text-gold-400" /> {tr(b.branch, 'name', lang)}</span>
                  <span className="flex items-center gap-2 sm:col-span-2"><Clock className="h-4 w-4 text-gold-400" /> {formatDateTime(b.start_at, lang)} – {formatTime(b.end_at, lang)}</span>
                  <span className="flex items-center gap-2"><Users className="h-4 w-4 text-gold-400" /> {t('res.guests', { n: b.guests })}</span>
                  <span className="font-bold text-gold-400">{money(b.total_price, lang)}</span>
                </div>
                {b.notes && <p className="flex items-start gap-2 text-sm text-white/60"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0" /> {b.notes}</p>}
                {b.staff_note && <p className="text-xs text-white/45">{t('res.staffNote')}: {b.staff_note}</p>}
                <div className="mt-auto"><Actions table="bookings" id={b.id} current={b.status} /></div>
              </article>
            ))
          ))}

        {tab === 'orders' &&
          (!orders ? (
            <Spinner className="h-8 w-8" />
          ) : orders.length === 0 ? (
            <div className="lg:col-span-2"><Empty text={t('staff.empty')} /></div>
          ) : (
            orders.map((o) => (
              <article key={o.id} className={cn('card flex flex-col gap-4 p-5', o.status === 'pending' && 'border-amber-400/25')}>
                <div className="flex items-start justify-between gap-3">
                  <Customer c={o.customer} />
                  <StatusBadge status={o.status} />
                </div>
                <p className="flex flex-wrap items-center gap-2 text-sm text-white/55">
                  <span className="font-semibold text-white">{t('res.order')} #{o.id.slice(0, 6).toUpperCase()}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {tr(o.branch, 'name', lang)}</span>
                  <span>· {formatDateTime(o.created_at, lang)}</span>
                </p>
                <ul className="divide-y divide-white/[0.06] rounded-xl bg-white/[0.03] text-sm">
                  {o.order_items.map((i) => (
                    <li key={i.id} className="flex justify-between gap-3 px-3 py-2">
                      <span>{i.quantity} × {tr(i, 'name', lang)}</span>
                      <span className="text-white/60">{money(Number(i.unit_price) * i.quantity, lang)}</span>
                    </li>
                  ))}
                  <li className="flex justify-between px-3 py-2 font-bold">
                    <span>{t('cart.total')}</span>
                    <span className="text-gold-400">{money(o.total, lang)}</span>
                  </li>
                </ul>
                {o.notes && <p className="flex items-start gap-2 text-sm text-white/60"><MessageSquare className="mt-0.5 h-4 w-4 shrink-0" /> {o.notes}</p>}
                {o.staff_note && <p className="text-xs text-white/45">{t('res.staffNote')}: {o.staff_note}</p>}
                <div className="mt-auto"><Actions table="orders" id={o.id} current={o.status} /></div>
              </article>
            ))
          ))}
      </div>

      {rejecting && (
        <RejectDialog
          kind={rejecting.table}
          customer={(rejecting.table === 'bookings' ? bookings : orders)?.find((x) => x.id === rejecting.id)?.customer?.full_name ?? ''}
          busy={busyId === rejecting.id}
          onCancel={() => setRejecting(null)}
          onReject={async (note) => {
            if (await decide(rejecting.table, rejecting.id, 'rejected', note)) setRejecting(null);
          }}
        />
      )}
    </div>
  );
}

/** Reject with an optional message the customer sees on their reservation / order. */
function RejectDialog({
  kind,
  customer,
  busy,
  onCancel,
  onReject,
}: {
  kind: Tab;
  customer: string;
  busy: boolean;
  onCancel: () => void;
  onReject: (note: string) => void;
}) {
  const { t } = useI18n();
  const [note, setNote] = useState('');
  const quick = (kind === 'bookings'
    ? (['staff.quick.full', 'staff.quick.otherTime', 'staff.quick.event'] as const)
    : (['staff.quick.stock', 'staff.quick.event'] as const)
  ).map((k) => t(k));

  return (
    <Modal open onClose={onCancel} title={t(kind === 'bookings' ? 'staff.rejectTitle.booking' : 'staff.rejectTitle.order')}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onReject(note.trim());
        }}
        className="space-y-4"
      >
        {customer && <p className="-mt-2 text-sm text-white/60">{t('staff.rejectFor', { name: customer })}</p>}
        <Field label={t('staff.rejectMessage')} hint={t('staff.rejectHint')}>
          <textarea
            autoFocus
            className="input min-h-[96px]"
            maxLength={300}
            placeholder={t('staff.rejectPh')}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <div className="flex flex-wrap gap-2">
          {quick.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setNote(q)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                note === q ? 'border-gold-400 bg-gold-400/15 text-gold-300' : 'border-white/10 text-white/65 hover:border-white/25 hover:text-white',
              )}
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            {t('admin.cancel')}
          </button>
          <button className="btn-danger" disabled={busy}>
            {busy ? <Spinner className="h-4 w-4 text-red-300" /> : <X className="h-4 w-4" />} {t('staff.reject')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function Count({ n, active }: { n: number; active: boolean }) {
  return (
    <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold', active ? 'bg-ink-950 text-gold-400' : 'bg-gold-400 text-ink-950')}>{n}</span>
  );
}
