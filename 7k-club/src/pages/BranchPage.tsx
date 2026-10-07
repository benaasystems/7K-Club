import { useEffect, useMemo, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Coffee, MapPin, Navigation, Phone, ShoppingBag, Store, Users } from 'lucide-react';
import { BookingModal } from '../components/BookingModal';
import { ResourceIcon, resourceGradient } from '../components/icons';
import { Empty, PageLoader, Tabs } from '../components/ui';
import { useCart } from '../context/CartProvider';
import { useI18n } from '../i18n/I18nProvider';
import { supabase } from '../lib/supabase';
import { MENU_CATEGORIES, RESOURCE_TYPES, STORE_CATEGORIES, type Branch, type Item, type Resource, type ResourceType } from '../lib/types';
import { cn, money, tr } from '../lib/utils';

type Tab = 'book' | 'menu' | 'store';

export default function BranchPage() {
  const { id } = useParams();
  const { t, lang, dir } = useI18n();
  const [params, setParams] = useSearchParams();
  const tab = (['book', 'menu', 'store'].includes(params.get('tab') ?? '') ? params.get('tab') : 'book') as Tab;
  const [branch, setBranch] = useState<Branch | null | undefined>(undefined);
  const [resources, setResources] = useState<Resource[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const Back = dir === 'rtl' ? ArrowRight : ArrowLeft;

  useEffect(() => {
    if (!id) return;
    Promise.all([
      supabase.from('branches').select('*').eq('id', id).maybeSingle(),
      supabase.from('resources').select('*').eq('branch_id', id).eq('is_active', true).order('sort_order').order('created_at'),
      supabase.from('items').select('*').eq('branch_id', id).order('sort_order').order('created_at'),
    ]).then(([b, r, i]) => {
      setBranch((b.data as Branch) ?? null);
      setResources((r.data as Resource[]) ?? []);
      setItems((i.data as Item[]) ?? []);
    });
  }, [id]);

  if (branch === undefined) return <PageLoader />;
  if (!branch || !branch.is_active)
    return (
      <div className="container-x py-20">
        <Empty text={t('branch.notFound')} action={<Link to="/" className="btn-primary">{t('common.goHome')}</Link>} />
      </div>
    );

  const address = tr(branch, 'address', lang);
  const hours = tr(branch, 'hours', lang);

  return (
    <div>
      <section className="relative overflow-hidden border-b border-white/[0.06]">
        {branch.image_url ? (
          <img src={branch.image_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        ) : (
          <div className="bg-grid absolute inset-0" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/80 to-ink-950/40" />
        <div className="pointer-events-none absolute -top-32 start-1/3 h-80 w-80 rounded-full bg-gold-500/20 blur-[120px]" />
        <div className="container-x relative py-10 sm:py-14">
          <Link to="/#branches" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-gold-400">
            <Back className="h-4 w-4" /> {t('branch.back')}
          </Link>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-5xl">{tr(branch, 'name', lang)}</h1>
          <div className="mt-5 flex flex-wrap gap-2">
            {address && <span className="chip py-1.5"><MapPin className="h-3.5 w-3.5 text-gold-400" /> {address}</span>}
            {hours && <span className="chip py-1.5"><Clock className="h-3.5 w-3.5 text-gold-400" /> {hours}</span>}
            {branch.phone && (
              <a href={`tel:${branch.phone.replace(/\s/g, '')}`} className="chip py-1.5 hover:border-gold-400/50">
                <Phone className="h-3.5 w-3.5 text-gold-400" /> <span dir="ltr">{branch.phone}</span>
              </a>
            )}
            {branch.map_url && (
              <a href={branch.map_url} target="_blank" rel="noreferrer" className="chip py-1.5 hover:border-gold-400/50">
                <Navigation className="h-3.5 w-3.5 text-gold-400" /> {t('branch.directions')}
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="container-x py-8 sm:py-10">
        <Tabs<Tab>
          value={tab}
          onChange={(v) => setParams({ tab: v }, { replace: true })}
          options={[
            { value: 'book', label: <><CalendarDays className="h-4 w-4" /> {t('branch.tab.book')}</> },
            { value: 'menu', label: <><Coffee className="h-4 w-4" /> {t('branch.tab.menu')}</> },
            { value: 'store', label: <><Store className="h-4 w-4" /> {t('branch.tab.store')}</> },
          ]}
        />
        <div className="mt-8">
          {tab === 'book' && <BookTab branch={branch} resources={resources} />}
          {tab === 'menu' && <MenuTab items={items.filter((i) => i.kind === 'menu' && i.is_available)} />}
          {tab === 'store' && <StoreTab items={items.filter((i) => i.kind === 'store')} />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function BookTab({ branch, resources }: { branch: Branch; resources: Resource[] }) {
  const { t, lang } = useI18n();
  const [filter, setFilter] = useState<'all' | ResourceType>('all');
  const [selected, setSelected] = useState<Resource | null>(null);
  const available = RESOURCE_TYPES.filter((type) => resources.some((r) => r.type === type));
  const list = filter === 'all' ? resources : resources.filter((r) => r.type === filter);

  return (
    <>
      <div className="no-scrollbar -mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {(['all', ...available] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
              filter === f ? 'border-gold-400 bg-gold-400/15 text-gold-300' : 'border-white/10 text-white/65 hover:border-white/25 hover:text-white',
            )}
          >
            {f !== 'all' && <ResourceIcon type={f} className="h-4 w-4" />}
            {t(`type.${f}`)}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <Empty text={t('resource.empty')} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <article key={r.id} className="card group flex flex-col overflow-hidden transition hover:border-gold-400/40">
              <div className={cn('relative h-40 overflow-hidden bg-gradient-to-br', resourceGradient[r.type])}>
                {r.image_url ? (
                  <img src={r.image_url} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : (
                  <ResourceIcon type={r.type} className="absolute -bottom-6 -end-4 h-40 w-40 text-white/10" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 to-transparent" />
                <span className="chip absolute start-4 top-4 border-white/20 bg-ink-950/60 backdrop-blur">
                  <ResourceIcon type={r.type} className="h-3.5 w-3.5" /> {t(`type.${r.type}`)}
                </span>
                <p className="absolute bottom-3 start-4 text-2xl font-extrabold">
                  {money(r.price_per_hour, lang)} <span className="text-sm font-medium text-white/60">{t('resource.perHour')}</span>
                </p>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-lg font-bold">{tr(r, 'name', lang)}</h3>
                {tr(r, 'description', lang) && <p className="mt-1.5 line-clamp-2 text-sm text-white/55">{tr(r, 'description', lang)}</p>}
                <p className="mt-3 flex items-center gap-2 text-sm text-white/60">
                  <Users className="h-4 w-4 text-gold-400" /> {t('resource.capacity', { n: r.capacity })}
                </p>
                <button className="btn-primary mt-5 w-full" onClick={() => setSelected(r)}>
                  {t('resource.book')}
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selected && <BookingModal branch={branch} resource={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */

function groupByCategory(items: Item[], order: readonly string[]) {
  const groups = new Map<string, Item[]>();
  for (const cat of order) groups.set(cat, []);
  for (const item of items) {
    const key = groups.has(item.category) ? item.category : 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  }
  return [...groups.entries()].filter(([, list]) => list.length > 0);
}

function categoryLabel(t: ReturnType<typeof useI18n>['t'], cat: string) {
  const known = [...MENU_CATEGORIES, ...STORE_CATEGORIES] as string[];
  return known.includes(cat) ? t(`cat.${cat as (typeof MENU_CATEGORIES)[number] | (typeof STORE_CATEGORIES)[number]}`) : cat;
}

function MenuTab({ items }: { items: Item[] }) {
  const { t, lang } = useI18n();
  const groups = useMemo(() => groupByCategory(items, MENU_CATEGORIES), [items]);
  if (!items.length) return <Empty icon={<Coffee className="h-10 w-10" />} text={t('menu.empty')} />;

  return (
    <div className="space-y-10">
      <p className="flex items-center gap-2 text-sm text-white/55">
        <Coffee className="h-4 w-4 text-gold-400" /> {t('menu.note')}
      </p>
      {groups.map(([cat, list]) => (
        <section key={cat}>
          <h3 className="mb-4 text-xl font-bold">{categoryLabel(t, cat)}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((item) => (
              <div key={item.id} className="card flex gap-4 p-3">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-white/5">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-white/20"><Coffee className="h-7 w-7" /></div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-semibold">{tr(item, 'name', lang)}</p>
                    <p className="shrink-0 font-bold text-gold-400">{money(item.price, lang)}</p>
                  </div>
                  {tr(item, 'description', lang) && <p className="mt-1 line-clamp-2 text-sm text-white/50">{tr(item, 'description', lang)}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StoreTab({ items }: { items: Item[] }) {
  const { t, lang } = useI18n();
  const cart = useCart();
  const [added, setAdded] = useState<string | null>(null);
  const groups = useMemo(() => groupByCategory(items, STORE_CATEGORIES), [items]);

  useEffect(() => {
    if (!added) return;
    const id = window.setTimeout(() => setAdded(null), 1600);
    return () => window.clearTimeout(id);
  }, [added]);

  if (!items.length) return <Empty icon={<ShoppingBag className="h-10 w-10" />} text={t('store.empty')} />;

  const addToCart = (item: Item) => {
    if (!cart.add(item)) {
      if (!window.confirm(t('store.otherBranch'))) return;
      cart.replaceWith(item);
    }
    setAdded(item.id);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-sm text-white/55">
          <ShoppingBag className="h-4 w-4 text-gold-400" /> {t('store.note')}
        </p>
        {cart.count > 0 && (
          <Link to="/cart" className="btn-primary btn-sm self-start">
            {t('nav.cart')} ({cart.count})
          </Link>
        )}
      </div>
      {groups.map(([cat, list]) => (
        <section key={cat}>
          <h3 className="mb-4 text-xl font-bold">{categoryLabel(t, cat)}</h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">
            {list.map((item) => {
              const soldOut = !item.is_available || item.stock === 0;
              return (
                <div key={item.id} className="card flex flex-col overflow-hidden">
                  <div className="relative aspect-square bg-white/[0.03]">
                    {item.image_url ? (
                      <img src={item.image_url} alt="" className={cn('h-full w-full object-cover', soldOut && 'opacity-40 grayscale')} />
                    ) : (
                      <div className="flex h-full items-center justify-center text-white/15"><ShoppingBag className="h-12 w-12" /></div>
                    )}
                    {soldOut && <span className="chip absolute start-3 top-3 border-red-400/30 bg-red-500/20 text-red-200">{t('store.soldOut')}</span>}
                  </div>
                  <div className="flex flex-1 flex-col p-3 sm:p-4">
                    <p className="font-semibold leading-snug">{tr(item, 'name', lang)}</p>
                    {tr(item, 'description', lang) && <p className="mt-1 line-clamp-2 text-xs text-white/50 sm:text-sm">{tr(item, 'description', lang)}</p>}
                    <div className="mt-auto pt-3">
                      <p className="font-bold text-gold-400">{money(item.price, lang)}</p>
                      {item.stock !== null && item.stock > 0 && <p className="text-xs text-white/40">{t('store.inStock', { n: item.stock })}</p>}
                      <button className={cn('mt-3 w-full', added === item.id ? 'btn-success' : 'btn-primary', 'btn-sm py-2')} disabled={soldOut} onClick={() => addToCart(item)}>
                        {added === item.id ? <><Check className="h-4 w-4" /> {t('store.added')}</> : t('store.add')}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
