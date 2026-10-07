import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Clock, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useI18n } from '../i18n/I18nProvider';
import { fitsHours, hoursLabel, openingHours } from '../lib/hours';
import { supabase } from '../lib/supabase';
import type { Branch, Resource } from '../lib/types';
import { clubDate, clubToday, cn, errorCode, formatClock, formatTime, money, tr } from '../lib/utils';
import { DatePicker } from './DatePicker';
import { Select } from './Select';
import { Alert, Field, Modal, Spinner } from './ui';

interface BusySlot {
  start_at: string;
  end_at: string;
  status: 'pending' | 'accepted';
}

const STEP = 30;
const MAX_LENGTH = 12 * 60; // the database rejects longer bookings

/** A dimmed tag after an option's time, e.g. "next day" or the booking length. */
function Tag({ children }: { children: ReactNode }) {
  return <span className="ms-2 text-xs text-white/40">{children}</span>;
}

export function BookingModal({ branch, resource, onClose }: { branch: Branch; resource: Resource; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { session, isStaff } = useAuth();
  const location = useLocation();
  const today = clubToday();
  const hours = openingHours(branch);

  const [date, setDate] = useState(today);
  // Times are minutes after midnight (Egypt time) on `date`; `length` is the booking length in minutes.
  const [from, setFrom] = useState<number | null>(null);
  const [length, setLength] = useState(60);
  const [guests, setGuests] = useState(Math.min(2, resource.capacity));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [loadingBusy, setLoadingBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  /**
   * Can `length` minutes from `start` be booked: inside opening hours and not overlapping a
   * confirmed booking? (Pending requests don't block — staff decide between them.)
   */
  const available = useCallback(
    (start: number, length: number) => {
      if (!fitsHours(hours, start, length)) return false;
      const s = clubDate(date, start).getTime();
      const e = clubDate(date, start + length).getTime();
      return !busy.some((b) => b.status === 'accepted' && new Date(b.start_at).getTime() < e && new Date(b.end_at).getTime() > s);
    },
    // `hours` comes from the branch, which never changes while the modal is open.
    [date, busy],
  );

  /**
   * Free start times still ahead. With opening hours the list runs from opening time to closing
   * time, past midnight if needed (minutes ≥ 1440 = early hours of the next day). Today it also
   * includes what's left of last night's session (before today's opening).
   */
  const starts = useMemo(() => {
    const now = Date.now();
    const ok = (m: number) => clubDate(date, m).getTime() > now && available(m, STEP);
    const out: number[] = [];
    if (!hours) {
      for (let m = 0; m < 1440; m += STEP) if (ok(m)) out.push(m);
      return out;
    }
    if (date === today) for (let m = 0; m < hours.open; m += STEP) if (ok(m)) out.push(m);
    for (let m = hours.open; m < hours.open + 1440; m += STEP) if (ok(m)) out.push(m);
    return out;
  }, [date, today, available]);

  /** Every length from `start` that stays bookable — stops at closing time or the next confirmed booking. */
  const lengthsFrom = (start: number) => {
    const out: number[] = [];
    for (let l = STEP; l <= MAX_LENGTH && available(start, l); l += STEP) out.push(l);
    return out;
  };

  /** Longest bookable length ≤ `wanted` from `start`. */
  const fitLength = (start: number, wanted: number) => {
    const ok = lengthsFrom(start).filter((l) => l <= wanted);
    return ok.length ? ok[ok.length - 1] : STEP;
  };

  // New day, or bookings loaded → keep the chosen time if it's still free, else take the first free
  // one; and shorten the booking if it now runs into closing time or a confirmed booking.
  useEffect(() => {
    const next = from !== null && starts.includes(from) ? from : (starts[0] ?? null);
    setFrom(next);
    if (next !== null) setLength((l) => fitLength(next, l));
  }, [starts]);

  // Busy ranges for the selected day, plus the early hours of the next day for late sessions.
  useEffect(() => {
    const p_from = clubDate(date, 0);
    const p_to = clubDate(date, 48 * 60);
    setLoadingBusy(true);
    supabase
      .rpc('get_busy_slots', { p_resource: resource.id, p_from: p_from.toISOString(), p_to: p_to.toISOString() })
      .then(({ data }) => {
        setBusy((data as BusySlot[]) ?? []);
        setLoadingBusy(false);
      });
  }, [date, resource.id, done]);

  const lengthLabel = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return [h ? `${h} ${t('unit.h')}` : '', min ? `${min} ${t('unit.m')}` : ''].filter(Boolean).join(' ');
  };

  const fits = from !== null && fitsHours(hours, from, length);
  const startAt = from !== null ? clubDate(date, from) : null;
  const endAt = from !== null ? clubDate(date, from + length) : null;
  const conflict =
    !!startAt && !!endAt && busy.some((b) => b.status === 'accepted' && new Date(b.start_at) < endAt && new Date(b.end_at) > startAt);
  const estimate = (Number(resource.price_per_hour) * length) / 60;

  const startOptions = starts.map((m) => ({
    value: m,
    label: (
      <>
        {formatClock(m, lang)}
        {m >= 1440 && <Tag>{t('booking.nextDay')}</Tag>}
      </>
    ),
  }));
  // End times: only those that keep the whole booking inside opening hours and clear of confirmed bookings.
  const endOptions =
    from === null
      ? []
      : lengthsFrom(from).map((l) => ({
          value: l,
          label: (
            <>
              {formatClock(from + l, lang)}
              {from + l >= 1440 && <Tag>{t('booking.nextDay')}</Tag>}
              <Tag>{lengthLabel(l)}</Tag>
            </>
          ),
        }));

  const changeFrom = (m: number) => {
    setFrom(m);
    setLength((l) => fitLength(m, l));
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!startAt || !endAt || conflict || !fits) return;
    setSaving(true);
    setError('');
    const { error } = await supabase.from('bookings').insert({
      resource_id: resource.id,
      branch_id: branch.id,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      guests,
      notes: notes.trim(),
    });
    setSaving(false);
    if (error) return setError(t(`err.${errorCode(error)}`));
    setDone(true);
  };

  const hoursText = hoursLabel(branch, lang, t);

  return (
    <Modal open onClose={onClose} title={t('booking.title', { name: tr(resource, 'name', lang) })}>
      {done ? (
        <div className="flex flex-col items-center py-4 text-center">
          <CheckCircle2 className="h-14 w-14 text-emerald-400" />
          <h3 className="mt-4 text-xl font-bold">{t('booking.success.title')}</h3>
          <p className="mt-2 text-white/60">{t('booking.success.body')}</p>
          <Link to="/reservations" className="btn-primary mt-6">
            {t('booking.viewReservations')}
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('booking.date')}>
              <DatePicker value={date} onChange={setDate} min={today} />
            </Field>
            <Field label={t('booking.guests')}>
              <Select
                value={guests}
                onChange={setGuests}
                options={Array.from({ length: resource.capacity }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
              />
            </Field>
            <Field label={t('booking.from')}>
              <Select<number> value={from ?? -1} onChange={changeFrom} placeholder="—" disabled={!starts.length} options={startOptions} />
            </Field>
            <Field label={t('booking.to')}>
              <Select<number> value={length} onChange={setLength} placeholder="—" disabled={from === null} options={endOptions} />
            </Field>
          </div>

          {hoursText && (
            <p className="-mt-1 flex items-center gap-2 text-xs text-white/50">
              <Clock className="h-3.5 w-3.5 text-gold-400" /> {t('booking.openHours', { hours: hoursText })}
            </p>
          )}
          {!starts.length && <Alert kind="info">{t('booking.noTimes')}</Alert>}

          {/* Staff checking availability see the day's bookings; customers just get the free times. */}
          {isStaff && (
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/45">{t('booking.busy')}</p>
              {loadingBusy ? (
                <Spinner className="h-4 w-4" />
              ) : busy.length === 0 ? (
                <p className="text-sm text-emerald-300/80">{t('booking.noBusy')}</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {busy.map((b, i) => (
                    <span
                      key={i}
                      className={cn(
                        'rounded-lg border px-2 py-1 text-xs',
                        b.status === 'accepted' ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-amber-400/30 bg-amber-400/10 text-amber-200',
                      )}
                    >
                      <span dir="ltr">{formatTime(b.start_at, lang)} – {formatTime(b.end_at, lang)}</span> · {t(`booking.tag.${b.status}`)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <Field label={t('booking.notes')}>
            <textarea className="input min-h-[72px]" placeholder={t('booking.notesPh')} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-gold-400/25 bg-gold-400/[0.07] px-4 py-3">
            <span className="text-sm text-white/70">
              {t('booking.estimate')} <span className="text-white/45">· {lengthLabel(length)}</span>
            </span>
            <span className="text-xl font-extrabold text-gold-400">{money(estimate, lang)}</span>
          </div>
          <p className="flex items-center gap-2 text-xs text-white/50">
            <Wallet className="h-3.5 w-3.5" /> {t('booking.payAtLounge')}
          </p>

          {conflict && <Alert>{t('booking.conflict')}</Alert>}
          {error && <Alert>{error}</Alert>}

          {isStaff ? (
            <Alert kind="info">{t('err.STAFF_CANNOT_BOOK')}</Alert>
          ) : session ? (
            <button className="btn-primary w-full py-3" disabled={saving || conflict || !fits}>
              {saving && <Spinner className="h-4 w-4 text-ink-950" />} {t('booking.submit')}
            </button>
          ) : (
            <Link to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`} className="btn-primary w-full py-3">
              {t('booking.signinToBook')}
            </Link>
          )}
        </form>
      )}
    </Modal>
  );
}
