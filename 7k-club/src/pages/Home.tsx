import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clock, Coffee, Gamepad2, MapPin, Phone, Store } from 'lucide-react';
import { BilliardIcon, PingPongIcon } from '../components/icons';
import { Empty, SectionHeader, Spinner } from '../components/ui';
import { useI18n } from '../i18n/I18nProvider';
import { isConfigured, supabase } from '../lib/supabase';
import type { Announcement, Branch } from '../lib/types';
import { useSiteSettings } from '../lib/useSiteSettings';
import { cn, tr } from '../lib/utils';

export default function Home() {
  const [ads, setAds] = useState<Announcement[] | null>(null);
  const [branches, setBranches] = useState<Branch[] | null>(null);

  useEffect(() => {
    if (!isConfigured) {
      setAds([]);
      setBranches([]);
      return;
    }
    supabase
      .from('announcements')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setAds((data as Announcement[]) ?? []));
    supabase
      .from('branches')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
      .order('created_at')
      .then(({ data }) => setBranches((data as Branch[]) ?? []));
  }, []);

  return (
    <>
      <Advertise ads={ads} />
      <Features />
      <BranchesSection branches={branches} />
      <About />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Advertisements (admin-managed header + lines)                      */
/* ------------------------------------------------------------------ */

function Advertise({ ads }: { ads: Announcement[] | null }) {
  const { t, lang, dir } = useI18n();
  const [index, setIndex] = useState(0);
  const slides = ads ?? [];
  const count = slides.length;

  useEffect(() => {
    if (count < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 7000);
    return () => window.clearInterval(id);
  }, [count]);

  useEffect(() => setIndex(0), [count]);

  const ad = slides[index];
  const title = ad ? tr(ad, 'title', lang) : '';
  const lines = ad ? tr(ad, 'body', lang).split('\n').map((l) => l.trim()).filter(Boolean) : [];
  const allLines = slides.flatMap((a) => [tr(a, 'title', lang), ...tr(a, 'body', lang).split('\n')]).map((l) => l.trim()).filter(Boolean);
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const ctaHref = ad?.link_url || '#branches';
  const ctaExternal = /^https?:\/\//.test(ctaHref);

  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-40 start-1/4 h-[480px] w-[480px] rounded-full bg-gold-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 end-0 h-[380px] w-[380px] rounded-full bg-amber-700/20 blur-[120px]" />

      <div className="container-x relative grid min-h-[560px] items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24">
        <div key={ad?.id ?? 'default'} className="animate-fade-up">
          <span className="chip mb-6 border-gold-400/30 bg-gold-400/10 text-gold-300">{t('home.hero.badge')}</span>

          {ad ? (
            <>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                <span className="text-gradient">{title}</span>
              </h1>
              {lines.length > 0 && (
                <ul className="mt-6 space-y-2.5 text-base text-white/75 sm:text-lg">
                  {lines.map((l, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gold-400" />
                      {l}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <h1 className="text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
                {t('home.hero.title1')} <span className="text-gradient">{t('home.hero.title2')}</span>
              </h1>
              <p className="mt-6 max-w-xl text-base text-white/65 sm:text-lg">{t('home.hero.subtitle')}</p>
            </>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            {ctaExternal ? (
              <a href={ctaHref} target="_blank" rel="noreferrer" className="btn-primary px-6 py-3">
                {t('home.hero.cta')} <Arrow className="h-4 w-4" />
              </a>
            ) : (
              <a href={ctaHref} className="btn-primary px-6 py-3">
                {t('home.hero.cta')} <Arrow className="h-4 w-4" />
              </a>
            )}
            <a href="#about" className="btn-ghost px-6 py-3">
              {t('home.hero.cta2')}
            </a>
          </div>

          {count > 1 && (
            <div className="mt-10 flex items-center gap-3">
              <button onClick={() => setIndex((index - 1 + count) % count)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-gold-400/60" aria-label="Previous">
                {dir === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
              <div className="flex gap-1.5">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => setIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-8 bg-gold-400' : 'w-3 bg-white/20 hover:bg-white/40')}
                  />
                ))}
              </div>
              <button onClick={() => setIndex((index + 1) % count)} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-gold-400/60" aria-label="Next">
                {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
            </div>
          )}
        </div>

        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="absolute inset-6 rounded-[2rem] bg-gold-400/20 blur-3xl" />
          {ad?.image_url ? (
            <img key={ad.id} src={ad.image_url} alt={title} className="relative aspect-[4/3] w-full animate-fade-up rounded-[2rem] border border-white/10 object-cover shadow-2xl" />
          ) : (
            <div className="card relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[2rem]">
              <div className="bg-grid absolute inset-0 opacity-60" />
              <img src="/logo.svg" alt="7K Club" className="relative w-1/2 drop-shadow-[0_0_60px_rgba(245,194,17,0.45)]" />
            </div>
          )}
        </div>
      </div>

      {allLines.length > 0 && (
        <div className="relative border-y border-gold-400/20 bg-gold-400 py-3 text-ink-950" dir="ltr">
          <div className="flex w-max animate-marquee gap-10 whitespace-nowrap text-sm font-bold uppercase tracking-wide">
            {[...allLines, ...allLines, ...allLines, ...allLines].map((l, i) => (
              <span key={i} className="flex items-center gap-10" dir={dir}>
                {l} <span aria-hidden>✦</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function Features() {
  const { t } = useI18n();
  const items = [
    { icon: <Gamepad2 className="h-6 w-6" />, label: t('home.feature.ps') },
    { icon: <BilliardIcon className="h-6 w-6" />, label: t('home.feature.billiards') },
    { icon: <PingPongIcon className="h-6 w-6" />, label: t('home.feature.pingpong') },
    { icon: <Coffee className="h-6 w-6" />, label: t('home.feature.cafe') },
  ];
  return (
    <div className="container-x mt-10 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {items.map((f) => (
        <div key={f.label} className="card flex items-center gap-3 p-4 sm:p-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gold-400/25 bg-gold-400/10 text-gold-400">{f.icon}</span>
          <span className="text-sm font-semibold sm:text-base">{f.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Branches                                                           */
/* ------------------------------------------------------------------ */

function BranchesSection({ branches }: { branches: Branch[] | null }) {
  const { t } = useI18n();
  return (
    <section id="branches" className="container-x scroll-mt-24 pt-24">
      <SectionHeader kicker={t('home.branches.kicker')} title={t('home.branches.title')} subtitle={t('home.branches.subtitle')} />
      {!branches ? (
        <div className="flex justify-center py-16">
          <Spinner className="h-8 w-8" />
        </div>
      ) : branches.length === 0 ? (
        <Empty icon={<Store className="h-10 w-10" />} text={t('home.branches.empty')} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {branches.map((b) => (
            <BranchCard key={b.id} branch={b} />
          ))}
        </div>
      )}
    </section>
  );
}

function BranchCard({ branch }: { branch: Branch }) {
  const { t, lang, dir } = useI18n();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const address = tr(branch, 'address', lang);
  const hours = tr(branch, 'hours', lang);
  return (
    <Link
      to={`/branches/${branch.id}`}
      className="card group flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-gold-400/40 hover:shadow-[0_20px_60px_-20px_rgba(245,194,17,0.35)]"
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-ink-800">
        {branch.image_url ? (
          <img src={branch.image_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-gold-500/25 via-ink-800 to-ink-900">
            <img src="/logo.svg" alt="" className="h-24 w-24 opacity-90" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950/90 via-transparent" />
        <h3 className="absolute bottom-4 start-5 end-5 text-xl font-bold">{tr(branch, 'name', lang)}</h3>
      </div>
      <div className="flex flex-1 flex-col gap-2.5 p-5 text-sm text-white/65">
        {address && (
          <p className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" /> {address}
          </p>
        )}
        {hours && (
          <p className="flex items-start gap-2">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" /> {hours}
          </p>
        )}
        {branch.phone && (
          <p className="flex items-start gap-2">
            <Phone className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" /> <span dir="ltr">{branch.phone}</span>
          </p>
        )}
        <span className="btn-primary mt-auto w-full translate-y-0 pt-2.5">
          {t('home.hero.cta')} <Arrow className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  About (admin-managed)                                              */
/* ------------------------------------------------------------------ */

function About() {
  const { t, lang } = useI18n();
  const s = useSiteSettings();
  const about = tr(s, 'about', lang);
  const paragraphs = about.split(/\n\s*\n|\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <section id="about" className="container-x scroll-mt-24 pt-24">
      <div className="card relative grid items-center gap-10 overflow-hidden p-6 sm:p-10 lg:grid-cols-2 lg:p-14">
        <div className="pointer-events-none absolute -end-24 -top-24 h-72 w-72 rounded-full bg-gold-500/15 blur-[100px]" />
        <div className="relative">
          <p className="kicker mb-2">{t('home.about.kicker')}</p>
          <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">{t('home.about.title')}</h2>
          <div className="mt-6 space-y-4 leading-relaxed text-white/70">
            {paragraphs.length ? paragraphs.map((p, i) => <p key={i}>{p}</p>) : <p>{t('home.hero.subtitle')}</p>}
          </div>
        </div>
        <div className="relative">
          {s?.about_image_url ? (
            <img src={s.about_image_url} alt="" className="aspect-[4/3] w-full rounded-3xl border border-white/10 object-cover" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: <Gamepad2 className="h-8 w-8" />, label: 'PS5 · PS4' },
                { icon: <BilliardIcon className="h-8 w-8" />, label: t('type.billiards') },
                { icon: <PingPongIcon className="h-8 w-8" />, label: t('type.ping_pong') },
                { icon: <Coffee className="h-8 w-8" />, label: t('home.feature.cafe') },
              ].map((x) => (
                <div key={x.label} className="flex aspect-square flex-col items-center justify-center gap-3 rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent text-gold-400">
                  {x.icon}
                  <span className="text-sm font-semibold text-white/80">{x.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
