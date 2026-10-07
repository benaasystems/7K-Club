import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CheckCircle2, Wallet } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../lib/supabase';
import type { Branch, Resource } from '../lib/types';
import { cn, errorCode, formatTime, money, toDateInput, tr } from '../lib/utils';
import { Select } from './Select';
import { Alert, Field, Modal, Spinner } from './ui';

interface BusySlot {
  start_at: string;
  end_at: string;
  status: 'pending' | 'accepted';
}

const DURATIONS = [30, 60, 90, 120, 150, 180, 240, 300, 360];

function pad(n: number) {
  return String(n).padStart(2, '0');
}

/** Every 30 minutes; for today only the times that are still ahead. */
function startOptions(date: string) {
  const now = new Date();
  const out: string[] = [];
  for (let m = 0; m < 24 * 60; m += 30) {
    const value = `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
    if (date === toDateInput(now) && new Date(`${date}T${value}`) <= now) continue;
    out.push(value);
  }
  return out;
}

export function BookingModal({ branch, resource, onClose }: { branch: Branch; resource: Resource; onClose: () => void }) {
  const { t, lang } = useI18n();
  const { session, isStaff } = useAuth();
  const location = useLocation();
  const today = toDateInput(new Date());

  const [date, setDate] = useState(today);
  const options = useMemo(() => startOptions(date), [date]);
  const [start, setStart] = useState(options[0] ?? '18:00');
  const [duration, setDuration] = useState(60);
  const [guests, setGuests] = useState(Math.min(2, resource.capacity));
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState<BusySlot[]>([]);
  const [loadingBusy, setLoadingBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!options.includes(start)) setStart(options[0] ?? '');
  }, [options, start]);

  // Busy ranges for the selected day (plus the early hours of the next day for late sessions).
  useEffect(() => {
    if (!date) return;
    const from = new Date(`${date}T00:00`);
    const to = new Date(from.getTime() + 30 * 3600 * 1000);
    setLoadingBusy(true);
    supabase
      .rpc('get_busy_slots', { p_resource: resource.id, p_from: from.toISOString(), p_to: to.toISOString() })
      .then(({ data }) => {
        setBusy((data as BusySlot[]) ?? []);
        setLoadingBusy(false);
      });
  }, [date, resource.id, done]);

  const startAt = start ? new Date(`${date}T${start}`) : null;
  const endAt = startAt ? new Date(startAt.getTime() + duration * 60000) : null;
  const conflict =
    !!startAt && !!endAt && busy.some((b) => b.status === 'accepted' && new Date(b.start_at) < endAt && new Date(b.end_at) > startAt);
  const estimate = (Number(resource.price_per_hour) * duration) / 60;

  const durationLabel = (m: number) => {
    const h = Math.floor(m / 60);
    const min = m % 60;
    return [h ? `${h} ${t('unit.h')}` : '', min ? `${min} ${t('unit.m')}` : ''].filter(Boolean).join(' ');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!startAt || !endAt || conflict) return;
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
              <input type="date" className="input" min={today} required value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={t('booking.start')}>
              <Select
                value={start}
                onChange={setStart}
                placeholder="—"
                options={options.map((o) => ({ value: o, label: formatTime(new Date(`${date}T${o}`), lang) }))}
              />
            </Field>
            <Field label={t('booking.duration')}>
              <Select value={duration} onChange={setDuration} options={DURATIONS.map((d) => ({ value: d, label: durationLabel(d) }))} />
            </Field>
            <Field label={t('booking.guests')}>
              <Select
                value={guests}
                onChange={setGuests}
                options={Array.from({ length: resource.capacity }, (_, i) => ({ value: i + 1, label: String(i + 1) }))}
              />
            </Field>
          </div>

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

          <Field label={t('booking.notes')}>
            <textarea className="input min-h-[72px]" placeholder={t('booking.notesPh')} value={notes} maxLength={500} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-gold-400/25 bg-gold-400/[0.07] px-4 py-3">
            <span className="text-sm text-white/70">{t('booking.estimate')}</span>
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
            <button className="btn-primary w-full py-3" disabled={saving || conflict || !start}>
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
