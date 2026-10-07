import { useEffect, useRef, useState, type MouseEvent, type ReactNode, type TouchEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Clock, Coffee, Gamepad2, MapPin, Phone, Store } from 'lucide-react';
import { BilliardIcon, PingPongIcon } from '../components/icons';
import { Ticker, tickerLines } from '../components/Ticker';
import { Empty, SectionHeader, Spinner } from '../components/ui';
import { useAuth } from '../context/AuthProvider';
import { useI18n } from '../i18n/I18nProvider';
import { hoursLabel } from '../lib/hours';
import { isConfigured, supabase } from '../lib/supabase';
import type { Announcement, Branch } from '../lib/types';
import { DEFAULT_AD_INTERVAL, useSiteSettings } from '../lib/useSiteSettings';
import { cn, tr } from '../lib/utils';

// Last loaded data, kept for the session: returning to the home page (e.g. Branches / About from
// another page) renders the real content at once instead of spinners that resize the page while
// it scrolls to the section. Fresh data is still fetched in the background.
let cachedAds: Announcement[] | null = null;
let cachedBranches: Branch[] | null = null;

export default function Home() {
  const [ads, setAdsState] = useState<Announcement[] | null>(cachedAds);
  const [branches, setBranchesState] = useState<Branch[] | null>(cachedBranches);
  const setAds = (a: Announcement[]) => setAdsState((cachedAds = a));
  const setBranches = (b: Branch[]) => setBranchesState((cachedBranches = b));

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

const SLIDE_MS = 600; // length of one slide animation
const SLIDE_EASE = 'cubic-bezier(0.22, 0.61, 0.36, 1)';

/**
 * Advertisement carousel: every ad sits side by side on one track that glides horizontally, for
 * the timer, arrows, dots and swipes alike. Copies of the last/first ad sit at either end, so going
 * past the last ad glides on to the first (then quietly jumps back to the real one) instead of
 * rewinding across all of them.
 */
function Advertise({ ads }: { ads: Announcement[] | null }) {
  const { lang, dir } = useI18n();
  const slides = ads ?? [];
  const count = slides.length;
  const loop = count > 1;
  // Track position: 0 = copy of the last ad, 1…count = the real ads, count + 1 = copy of the first.
  const [pos, setPos] = useState(1);
  const [animate, setAnimate] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [held, setHeld] = useState(false); // a finger resting on the ad = the phone version of hover
  const [drag, setDrag] = useState(0);
  const swipe = useRef<{ x: number; y: number; axis: 'x' | 'y' | null } | null>(null);
  const justSwiped = useRef(false);
  const settings = useSiteSettings();
  const seconds = settings?.ad_interval ?? DEFAULT_AD_INTERVAL;
  const index = loop ? (pos - 1 + count) % count : 0;
  const onCopy = loop && (pos === 0 || pos === count + 1);

  useEffect(() => {
    setAnimate(false);
    setPos(1);
  }, [count]);

  // Landed on a copy → once the glide is over, jump (without animation) to the real ad it shows.
  // A timer rather than `transitionend`, which never fires while the tab is in the background.
  useEffect(() => {
    if (!onCopy) return;
    const id = window.setTimeout(() => {
      setAnimate(false);
      setPos(pos === 0 ? count : 1);
    }, SLIDE_MS + 50);
    return () => window.clearTimeout(id);
  }, [onCopy, pos, count]);

  // Turn animation back on after an instant jump has been painted.
  useEffect(() => {
    if (animate) return;
    let id = requestAnimationFrame(() => (id = requestAnimationFrame(() => setAnimate(true))));
    return () => cancelAnimationFrame(id);
  }, [animate]);

  // One timeout per slide: every change (timer, arrow, dot, swipe) starts a fresh full countdown.
  // Paused while the visitor points at the ad, rests a finger on it, or tabs through it.
  useEffect(() => {
    if (!loop || hovered || focused || held) return;
    const id = window.setTimeout(() => setPos((p) => p + 1), seconds * 1000);
    return () => window.clearTimeout(id);
  }, [loop, pos, seconds, hovered, focused, held]);

  const step = (by: 1 | -1) => {
    if (onCopy) return; // the jump back to the real ad is a few ms away
    setAnimate(true);
    setPos((p) => p + by);
  };
  const goTo = (i: number) => {
    setAnimate(true);
    setPos(i + 1);
  };

  // Never leave the track half-dragged if the page is hidden mid-swipe.
  useEffect(() => {
    const reset = () => {
      swipe.current = null;
      setDrag(0);
      setHeld(false);
    };
    document.addEventListener('visibilitychange', reset);
    return () => document.removeEventListener('visibilitychange', reset);
  }, []);

  // Touch swipe, with touch events: unlike pointer events, iOS Safari always ends them (touchend or
  // touchcancel). `touch-pan-y` keeps vertical scrolling with the browser; sideways moves are ours.
  // The track follows the finger 1:1, then glides to the next ad or back. Mouse never fires these.
  const endSwipe = (dx: number) => {
    swipe.current = null;
    setHeld(false);
    setDrag(0);
    if (Math.abs(dx) < 50) return; // not far enough: glide back
    justSwiped.current = true; // the lift-off must not also "tap" a button under the finger
    window.setTimeout(() => (justSwiped.current = false), 400);
    // Swiping towards the reading direction's start brings the next ad (left in English, right in Arabic).
    step((dir === 'rtl' ? dx > 0 : dx < 0) ? 1 : -1);
  };
  const swipeHandlers = loop
    ? {
        onTouchStart: (e: TouchEvent<HTMLDivElement>) => {
          if (e.touches.length !== 1 || onCopy) return endSwipe(0); // pinch-zoom etc. is not a swipe
          swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, axis: null };
          setHeld(true);
        },
        onTouchMove: (e: TouchEvent<HTMLDivElement>) => {
          const sw = swipe.current;
          if (!sw) return;
          const dx = e.touches[0].clientX - sw.x;
          const dy = e.touches[0].clientY - sw.y;
          if (!sw.axis && Math.hypot(dx, dy) > 8) sw.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
          if (sw.axis === 'x') setDrag(dx);
        },
        onTouchEnd: (e: TouchEvent<HTMLDivElement>) => {
          const sw = swipe.current;
          endSwipe(sw?.axis === 'x' ? e.changedTouches[0].clientX - sw.x : 0);
        },
        onTouchCancel: () => endSwipe(0),
        onClickCapture: (e: MouseEvent<HTMLDivElement>) => {
          if (!justSwiped.current) return;
          justSwiped.current = false;
          e.preventDefault();
          e.stopPropagation();
        },
      }
    : {};

  // Real ads with a copy at each end; with 0 or 1 ad there is nothing to slide.
  const track: (Announcement | null)[] = count === 0 ? [null] : loop ? [slides[count - 1], ...slides, slides[0]] : slides;
  const shown = loop ? pos : 0;
  // In Arabic the row runs right-to-left, so later slides sit to the left: move the track right.
  const sign = dir === 'rtl' ? 1 : -1;
  const dragging = drag !== 0;
  const ticker = tickerLines(slides, lang);

  const controls = loop && (
    <div className="mt-10 flex items-center gap-3">
      <button onClick={() => step(-1)} className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-gold-400/60 sm:flex" aria-label="Previous">
        {dir === 'rtl' ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
      <div className="flex gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            aria-label={`Slide ${i + 1}`}
            aria-current={i === index}
            className={cn('h-1.5 rounded-full transition-all duration-500', i === index ? 'w-8 bg-gold-400' : 'w-3 bg-white/20 hover:bg-white/40')}
          />
        ))}
      </div>
      <button onClick={() => step(1)} className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 hover:border-gold-400/60 sm:flex" aria-label="Next">
        {dir === 'rtl' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </button>
    </div>
  );

  return (
    <section
      className="relative overflow-hidden"
      // Mouse only: on touch screens "enter" fires on tap with no matching "leave", which would pause it for good.
      onPointerEnter={(e) => e.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={(e) => e.pointerType === 'mouse' && setHovered(false)}
      // Keyboard focus only — a mouse click on an arrow also focuses it, and that must not pause the slideshow.
      onFocus={(e) => e.target.matches(':focus-visible') && setFocused(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setFocused(false)}
    >
      <div className="bg-grid absolute inset-0 [mask-image:radial-gradient(ellipse_at_top,black_40%,transparent_75%)]" />
      <div className="pointer-events-none absolute -top-40 start-1/4 h-[480px] w-[480px] rounded-full bg-gold-500/20 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 end-0 h-[380px] w-[380px] rounded-full bg-amber-700/20 blur-[120px]" />

      <div {...swipeHandlers} className={cn('relative animate-fade-up', loop && 'touch-pan-y select-none sm:select-auto')}>
        <div
          className="flex will-change-transform"
          style={{
            transform: `translateX(calc(${sign * shown * 100}% + ${drag}px))`,
            transition: animate && !dragging ? `transform ${SLIDE_MS}ms ${SLIDE_EASE}` : 'none',
          }}
        >
          {track.map((ad, i) => {
            const active = i === shown;
            return (
              <div
                key={`${i}-${ad?.id ?? 'default'}`}
                className="w-full shrink-0"
                aria-hidden={!active}
                // Off-screen slides (and the end copies) can't be focused or clicked.
                {...(!active && { inert: '' })}
              >
                <AdSlide ad={ad} controls={controls} />
              </div>
            );
          })}
        </div>
      </div>

      {/* `!== false` / `?? 3`: keep the ticker on for databases that don't have the new columns yet */}
      {settings && settings.ticker_enabled !== false && <Ticker lines={ticker} speed={settings.ticker_speed ?? 3} />}
    </section>
  );
}

/** One advertisement (or the default hero when there are none). */
function AdSlide({ ad, controls }: { ad: Announcement | null; controls: ReactNode }) {
  const { t, lang, dir } = useI18n();
  const { isStaff } = useAuth(); // staff & admin can't book, so they get no "Book now"
  const title = ad ? tr(ad, 'title', lang) : '';
  const lines = ad ? tr(ad, 'body', lang).split('\n').map((l) => l.trim()).filter(Boolean) : [];
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const ctaHref = ad?.link_url || '#branches';
  const ctaExternal = /^https?:\/\//.test(ctaHref);

  return (
    <div className="container-x grid min-h-[560px] items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.15fr_1fr] lg:py-24">
      <div>
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
          {isStaff ? null : ctaExternal ? (
            <a href={ctaHref} target="_blank" rel="noreferrer" className="btn-primary px-6 py-3">
              {t('home.hero.cta')} <Arrow className="h-4 w-4" />
            </a>
          ) : (
            <Link to={ctaHref.startsWith('#') ? `/${ctaHref}` : ctaHref} className="btn-primary px-6 py-3">
              {t('home.hero.cta')} <Arrow className="h-4 w-4" />
            </Link>
          )}
          <Link to="/#about" className="btn-ghost px-6 py-3">
            {t('home.hero.cta2')}
          </Link>
        </div>

        {controls}
      </div>

      <div className="relative mx-auto w-full max-w-md lg:max-w-none">
        <div className="absolute inset-6 rounded-[2rem] bg-gold-400/20 blur-3xl" />
        {ad?.image_url ? (
          <img src={ad.image_url} alt={title} draggable={false} className="relative aspect-[4/3] w-full rounded-[2rem] border border-white/10 object-cover shadow-2xl" />
        ) : (
          <div className="card relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[2rem]">
            <div className="bg-grid absolute inset-0 opacity-60" />
            <img src="/logo.svg" alt="7K Club" draggable={false} className="relative w-1/2 drop-shadow-[0_0_60px_rgba(245,194,17,0.45)]" />
          </div>
        )}
      </div>
    </div>
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
  const { isStaff } = useAuth();
  const Arrow = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const address = tr(branch, 'address', lang);
  const hours = hoursLabel(branch, lang, t);
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
        {!isStaff && (
          <span className="btn-primary mt-auto w-full translate-y-0 pt-2.5">
            {t('home.hero.cta')} <Arrow className="h-4 w-4 transition group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
          </span>
        )}
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
