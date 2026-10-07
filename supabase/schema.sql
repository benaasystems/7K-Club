-- =====================================================================
--  7K Club — Supabase schema
--  Run this whole file once in Supabase → SQL Editor → New query.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
--  Tables
-- ---------------------------------------------------------------------

create table if not exists public.branches (
  id          uuid primary key default gen_random_uuid(),
  name_en     text not null,
  name_ar     text not null default '',
  address_en  text not null default '',
  address_ar  text not null default '',
  hours_en    text not null default '',
  hours_ar    text not null default '',
  phone       text not null default '',
  map_url     text not null default '',
  image_url   text,
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null default '',
  email       text,
  phone       text not null default '',
  avatar_url  text,
  language    text not null default 'en' check (language in ('en', 'ar')),
  role        text not null default 'customer' check (role in ('customer', 'staff', 'admin')),
  -- staff only: the branch they manage (null = all branches)
  branch_id   uuid references public.branches(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Bookable things inside a branch: PS5 / PS4 rooms, billiard tables, ping pong tables
create table if not exists public.resources (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid not null references public.branches(id) on delete cascade,
  type            text not null check (type in ('ps5', 'ps4', 'billiards', 'ping_pong')),
  name_en         text not null,
  name_ar         text not null default '',
  description_en  text not null default '',
  description_ar  text not null default '',
  capacity        int not null default 4 check (capacity > 0),
  price_per_hour  numeric(10,2) not null default 0 check (price_per_hour >= 0),
  image_url       text,
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

-- Menu (drinks / cakes / food) and store (cues / consoles / devices / accessories) items
create table if not exists public.items (
  id              uuid primary key default gen_random_uuid(),
  branch_id       uuid not null references public.branches(id) on delete cascade,
  kind            text not null check (kind in ('menu', 'store')),
  category        text not null default 'other',
  name_en         text not null,
  name_ar         text not null default '',
  description_en  text not null default '',
  description_ar  text not null default '',
  price           numeric(10,2) not null default 0 check (price >= 0),
  stock           int check (stock is null or stock >= 0),   -- null = unlimited
  image_url       text,
  is_available    boolean not null default true,
  sort_order      int not null default 0,
  created_at      timestamptz not null default now()
);

create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  branch_id    uuid not null references public.branches(id) on delete cascade,
  resource_id  uuid not null references public.resources(id) on delete cascade,
  start_at     timestamptz not null,
  end_at       timestamptz not null,
  guests       int not null default 1 check (guests > 0),
  notes        text not null default '',
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  staff_note   text not null default '',
  total_price  numeric(10,2) not null default 0,
  handled_by   uuid references public.profiles(id) on delete set null,
  handled_at   timestamptz,
  created_at   timestamptz not null default now(),
  constraint bookings_time_check check (end_at > start_at),
  -- two ACCEPTED bookings can never overlap on the same room/table
  constraint bookings_no_overlap exclude using gist (
    resource_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status = 'accepted')
);

create table if not exists public.orders (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  branch_id   uuid not null references public.branches(id) on delete cascade,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'rejected', 'cancelled')),
  notes       text not null default '',
  staff_note  text not null default '',
  total       numeric(10,2) not null default 0,
  handled_by  uuid references public.profiles(id) on delete set null,
  handled_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  item_id     uuid references public.items(id) on delete set null,
  name_en     text not null default '',
  name_ar     text not null default '',
  unit_price  numeric(10,2) not null default 0,
  quantity    int not null check (quantity > 0)
);

-- Home page advertisements (header + lines)
create table if not exists public.announcements (
  id          uuid primary key default gen_random_uuid(),
  title_en    text not null default '',
  title_ar    text not null default '',
  body_en     text not null default '',   -- one line per row
  body_ar     text not null default '',
  image_url   text,
  link_url    text not null default '',
  is_active   boolean not null default true,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Single-row settings: about section + contact info
create table if not exists public.site_settings (
  id               int primary key default 1 check (id = 1),
  about_en         text not null default '',
  about_ar         text not null default '',
  about_image_url  text,
  phone            text not null default '',
  email            text not null default '',
  instagram_url    text not null default '',
  facebook_url     text not null default '',
  address_en       text not null default '',
  address_ar       text not null default '',
  updated_at       timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- Scrolling ticker under the home-page advertisements (added later, so also safe for existing projects)
alter table public.site_settings add column if not exists ticker_enabled boolean not null default true;
alter table public.site_settings add column if not exists ticker_speed int not null default 3;   -- 1 very slow … 5 very fast
do $$
begin
  alter table public.site_settings add constraint site_settings_ticker_speed_check check (ticker_speed between 1 and 5);
exception when duplicate_object then null;
end $$;

-- Seconds each home-page advertisement stays on screen before the next one slides in
alter table public.site_settings add column if not exists ad_interval int not null default 7;
do $$
begin
  alter table public.site_settings add constraint site_settings_ad_interval_check check (ad_interval between 3 and 60);
exception when duplicate_object then null;
end $$;

-- Opening hours (Egypt local time). closes_at < opens_at = closes after midnight; equal = open 24 hours;
-- null = not set (no restriction). Bookings must fit inside these hours.
alter table public.branches add column if not exists opens_at  time;
alter table public.branches add column if not exists closes_at time;

create index if not exists resources_branch_idx on public.resources(branch_id);
create index if not exists items_branch_idx     on public.items(branch_id, kind);
create index if not exists bookings_user_idx     on public.bookings(user_id);
create index if not exists bookings_branch_idx   on public.bookings(branch_id, status);
create index if not exists bookings_resource_idx on public.bookings(resource_id, start_at);
create index if not exists orders_user_idx       on public.orders(user_id);
create index if not exists orders_branch_idx     on public.orders(branch_id, status);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- ---------------------------------------------------------------------
--  Role helpers
-- ---------------------------------------------------------------------

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role in ('staff', 'admin'));
$$;

-- admin: every branch. staff: their branch, or every branch when branch_id is null.
create or replace function public.can_manage_branch(b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'admin' or (p.role = 'staff' and (p.branch_id is null or p.branch_id = b)))
  );
$$;

-- ---------------------------------------------------------------------
--  Profiles: auto-create on sign up, keep email in sync, block self-promotion
-- ---------------------------------------------------------------------

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- Email sign-up sends full_name / phone / language; Google sends full_name or name, and avatar_url or picture.
  insert into public.profiles (id, email, full_name, phone, avatar_url, language)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'phone', ''),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    case when new.raw_user_meta_data ->> 'language' = 'ar' then 'ar' else 'en' end
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

create or replace function public.protect_profile_fields() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- auth.uid() is null for the SQL editor / auth service: allow everything there.
  if auth.uid() is not null and not public.is_admin() then
    new.role      := old.role;
    new.branch_id := old.branch_id;
    new.email     := old.email;
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect on public.profiles;
create trigger profiles_protect
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- ---------------------------------------------------------------------
--  Bookings rules
-- ---------------------------------------------------------------------

create or replace function public.bookings_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r public.resources;
  br public.branches;
  open_len  int;   -- minutes the branch is open per day
  from_open int;   -- minutes between opening time and the booking start
begin
  -- Reservations are for customers only: staff and admin accounts cannot book.
  if public.is_staff() then
    raise exception 'STAFF_CANNOT_BOOK';
  end if;

  select * into r from public.resources where id = new.resource_id;
  select * into br from public.branches where id = r.branch_id;
  if r.id is null or not r.is_active or br.id is null or not br.is_active then
    raise exception 'RESOURCE_UNAVAILABLE';
  end if;

  -- The whole booking must fit inside one opening period (which may run past midnight).
  if br.opens_at is not null and br.closes_at is not null and br.opens_at <> br.closes_at then
    open_len  := (extract(epoch from (br.closes_at - br.opens_at))::int / 60 + 1440) % 1440;
    from_open := (extract(epoch from ((new.start_at at time zone 'Africa/Cairo')::time - br.opens_at))::int / 60 + 1440) % 1440;
    if from_open + ceil(extract(epoch from (new.end_at - new.start_at)) / 60) > open_len then
      raise exception 'OUTSIDE_HOURS';
    end if;
  end if;

  if auth.uid() is not null then
    new.user_id := auth.uid();
  end if;
  new.branch_id  := r.branch_id;
  new.status     := 'pending';
  new.staff_note := '';
  new.handled_by := null;
  new.handled_at := null;
  new.created_at := now();

  if new.start_at < now() - interval '10 minutes' then
    raise exception 'BOOKING_IN_PAST';
  end if;
  if new.end_at - new.start_at > interval '12 hours' then
    raise exception 'BOOKING_TOO_LONG';
  end if;
  if new.guests > r.capacity then
    raise exception 'TOO_MANY_GUESTS';
  end if;
  if exists (
    select 1 from public.bookings b
    where b.resource_id = new.resource_id
      and b.status = 'accepted'
      and tstzrange(b.start_at, b.end_at, '[)') && tstzrange(new.start_at, new.end_at, '[)')
  ) then
    raise exception 'SLOT_TAKEN';
  end if;

  new.total_price := round(r.price_per_hour * extract(epoch from (new.end_at - new.start_at)) / 3600, 2);
  return new;
end $$;

drop trigger if exists bookings_insert_rules on public.bookings;
create trigger bookings_insert_rules
  before insert on public.bookings
  for each row execute function public.bookings_before_insert();

create or replace function public.bookings_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r public.bookings;
begin
  if auth.uid() is null then
    return new;                                   -- SQL editor / service role
  end if;

  if public.can_manage_branch(old.branch_id) then
    -- staff & admin: may only change the status and leave a note
    if not public.is_admin() and new.status not in ('accepted', 'rejected') then
      raise exception 'NOT_ALLOWED';
    end if;
    r := old;
    r.status     := new.status;
    r.staff_note := coalesce(new.staff_note, '');
    if new.status is distinct from old.status then
      r.handled_by := auth.uid();
      r.handled_at := now();
    end if;
    return r;
  end if;

  if old.user_id = auth.uid() then
    -- customers: may only cancel their own upcoming pending/accepted booking
    if new.status = 'cancelled' and old.status in ('pending', 'accepted') and old.start_at > now() then
      r := old;
      r.status := 'cancelled';
      return r;
    end if;
  end if;

  raise exception 'NOT_ALLOWED';
end $$;

drop trigger if exists bookings_update_rules on public.bookings;
create trigger bookings_update_rules
  before update on public.bookings
  for each row execute function public.bookings_before_update();

-- Busy time ranges for one room/table (no personal data) — used by the booking form
create or replace function public.get_busy_slots(p_resource uuid, p_from timestamptz, p_to timestamptz)
returns table (start_at timestamptz, end_at timestamptz, status text)
language sql stable security definer set search_path = public as $$
  select b.start_at, b.end_at, b.status
  from public.bookings b
  where b.resource_id = p_resource
    and b.status in ('pending', 'accepted')
    and b.start_at < p_to
    and b.end_at > p_from
  order by b.start_at;
$$;

-- ---------------------------------------------------------------------
--  Store orders
-- ---------------------------------------------------------------------

-- Customers place orders only through this function so prices come from the database.
create or replace function public.place_order(p_branch uuid, p_items jsonb, p_notes text default '')
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_order uuid;
  v_line  jsonb;
  v_item  public.items;
  v_qty   int;
  v_total numeric(10,2) := 0;
  v_lines jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;
  if public.is_staff() then
    raise exception 'STAFF_CANNOT_BOOK';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'EMPTY_ORDER';
  end if;
  if not exists (select 1 from public.branches where id = p_branch and is_active) then
    raise exception 'BRANCH_UNAVAILABLE';
  end if;

  -- 1) validate every line and compute the total from database prices
  for v_line in select * from jsonb_array_elements(p_items) loop
    v_qty := greatest(1, least(50, coalesce((v_line ->> 'quantity')::int, 1)));

    select * into v_item from public.items
    where id = (v_line ->> 'item_id')::uuid
      and branch_id = p_branch
      and kind = 'store'
      and is_available;

    if v_item.id is null then
      raise exception 'ITEM_UNAVAILABLE';
    end if;
    if v_item.stock is not null and v_item.stock < v_qty then
      raise exception 'OUT_OF_STOCK';
    end if;

    v_lines := v_lines || jsonb_build_object(
      'item_id', v_item.id, 'name_en', v_item.name_en, 'name_ar', v_item.name_ar,
      'unit_price', v_item.price, 'quantity', v_qty);
    v_total := v_total + v_item.price * v_qty;
  end loop;

  -- 2) create the order and its lines
  insert into public.orders (user_id, branch_id, notes, total)
  values (auth.uid(), p_branch, left(coalesce(p_notes, ''), 1000), v_total)
  returning id into v_order;

  insert into public.order_items (order_id, item_id, name_en, name_ar, unit_price, quantity)
  select v_order, (l ->> 'item_id')::uuid, l ->> 'name_en', l ->> 'name_ar',
         (l ->> 'unit_price')::numeric, (l ->> 'quantity')::int
  from jsonb_array_elements(v_lines) l;

  return v_order;
end $$;

create or replace function public.orders_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  r public.orders;
begin
  if auth.uid() is null then
    return new;
  end if;

  if public.can_manage_branch(old.branch_id) then
    if not public.is_admin() and new.status not in ('accepted', 'rejected') then
      raise exception 'NOT_ALLOWED';
    end if;
    r := old;
    r.status     := new.status;
    r.staff_note := coalesce(new.staff_note, '');
    if new.status is distinct from old.status then
      r.handled_by := auth.uid();
      r.handled_at := now();
    end if;
    return r;
  end if;

  if old.user_id = auth.uid() and new.status = 'cancelled' and old.status = 'pending' then
    r := old;
    r.status := 'cancelled';
    return r;
  end if;

  raise exception 'NOT_ALLOWED';
end $$;

drop trigger if exists orders_update_rules on public.orders;
create trigger orders_update_rules
  before update on public.orders
  for each row execute function public.orders_before_update();

-- Keep store stock in sync when an order is accepted / un-accepted
create or replace function public.orders_after_update_stock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status <> 'accepted' then
    update public.items i
       set stock = greatest(i.stock - oi.quantity, 0)
      from public.order_items oi
     where oi.order_id = new.id and oi.item_id = i.id and i.stock is not null;
  elsif old.status = 'accepted' and new.status <> 'accepted' then
    update public.items i
       set stock = i.stock + oi.quantity
      from public.order_items oi
     where oi.order_id = new.id and oi.item_id = i.id and i.stock is not null;
  end if;
  return new;
end $$;

drop trigger if exists orders_stock_sync on public.orders;
create trigger orders_stock_sync
  after update of status on public.orders
  for each row execute function public.orders_after_update_stock();

-- ---------------------------------------------------------------------
--  Row Level Security
-- ---------------------------------------------------------------------

alter table public.branches      enable row level security;
alter table public.profiles      enable row level security;
alter table public.resources     enable row level security;
alter table public.items         enable row level security;
alter table public.bookings      enable row level security;
alter table public.orders        enable row level security;
alter table public.order_items   enable row level security;
alter table public.announcements enable row level security;
alter table public.site_settings enable row level security;

-- Public catalogue: everyone can read, only admins can write
drop policy if exists "branches_read" on public.branches;
create policy "branches_read" on public.branches for select using (true);
drop policy if exists "branches_admin" on public.branches;
create policy "branches_admin" on public.branches for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "resources_read" on public.resources;
create policy "resources_read" on public.resources for select using (true);
drop policy if exists "resources_admin" on public.resources;
create policy "resources_admin" on public.resources for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "items_read" on public.items;
create policy "items_read" on public.items for select using (true);
drop policy if exists "items_admin" on public.items;
create policy "items_admin" on public.items for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "announcements_read" on public.announcements;
create policy "announcements_read" on public.announcements for select using (true);
drop policy if exists "announcements_admin" on public.announcements;
create policy "announcements_admin" on public.announcements for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists "settings_read" on public.site_settings;
create policy "settings_read" on public.site_settings for select using (true);
drop policy if exists "settings_admin" on public.site_settings;
create policy "settings_admin" on public.site_settings for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Profiles: own profile; staff/admin can see customers; admin can edit anyone
drop policy if exists "profiles_read" on public.profiles;
create policy "profiles_read" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Bookings
drop policy if exists "bookings_read" on public.bookings;
create policy "bookings_read" on public.bookings for select to authenticated
  using (user_id = auth.uid() or public.can_manage_branch(branch_id));
drop policy if exists "bookings_insert" on public.bookings;
create policy "bookings_insert" on public.bookings for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists "bookings_update" on public.bookings;
create policy "bookings_update" on public.bookings for update to authenticated
  using (user_id = auth.uid() or public.can_manage_branch(branch_id));
drop policy if exists "bookings_delete" on public.bookings;
create policy "bookings_delete" on public.bookings for delete to authenticated
  using (public.is_admin());

-- Orders (insert only through place_order)
drop policy if exists "orders_read" on public.orders;
create policy "orders_read" on public.orders for select to authenticated
  using (user_id = auth.uid() or public.can_manage_branch(branch_id));
drop policy if exists "orders_update" on public.orders;
create policy "orders_update" on public.orders for update to authenticated
  using (user_id = auth.uid() or public.can_manage_branch(branch_id));
drop policy if exists "orders_delete" on public.orders;
create policy "orders_delete" on public.orders for delete to authenticated
  using (public.is_admin());

drop policy if exists "order_items_read" on public.order_items;
create policy "order_items_read" on public.order_items for select to authenticated
  using (exists (
    select 1 from public.orders o
    where o.id = order_id and (o.user_id = auth.uid() or public.can_manage_branch(o.branch_id))
  ));

-- ---------------------------------------------------------------------
--  Grants
-- ---------------------------------------------------------------------

grant usage on schema public to anon, authenticated;
grant select on public.branches, public.resources, public.items, public.announcements, public.site_settings
  to anon, authenticated;
grant insert, update, delete on public.branches, public.resources, public.items, public.announcements
  to authenticated;
grant update on public.site_settings to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;
grant select, update, delete on public.orders to authenticated;
grant select on public.order_items to authenticated;

revoke execute on function public.place_order(uuid, jsonb, text) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text) to authenticated;
grant execute on function public.get_busy_slots(uuid, timestamptz, timestamptz) to anon, authenticated;
grant execute on function public.is_admin(), public.is_staff(), public.can_manage_branch(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------
--  Storage buckets (public read). avatars/<user id>/..., media/... (admin)
-- ---------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true), ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "7k_public_read" on storage.objects;
create policy "7k_public_read" on storage.objects for select
  using (bucket_id in ('avatars', 'media'));

drop policy if exists "7k_avatar_insert" on storage.objects;
create policy "7k_avatar_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "7k_avatar_update" on storage.objects;
create policy "7k_avatar_update" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "7k_avatar_delete" on storage.objects;
create policy "7k_avatar_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "7k_media_insert" on storage.objects;
create policy "7k_media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "7k_media_update" on storage.objects;
create policy "7k_media_update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin());
drop policy if exists "7k_media_delete" on storage.objects;
create policy "7k_media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());

-- ---------------------------------------------------------------------
--  Realtime: live updates for staff dashboard and customer reservations
-- ---------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.bookings;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.orders;
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- =====================================================================
--  After you sign up on the website, make yourself admin:
--    update public.profiles set role = 'admin' where email = 'you@example.com';
-- =====================================================================

-- Make the API see new columns right away (avoids "could not find column ... in the schema cache").
notify pgrst, 'reload schema';
