# 7K Club — PlayStation, Billiards, Ping Pong & Café

Bilingual (English / العربية) booking website for 7K Club branches.
React + Vite + Tailwind on the front end, **Supabase** for auth, database and image storage,
deployed to **Cloudflare Workers** (static assets). No online payment — everything is paid at the lounge.

## Roles

| Role | Can do |
|------|--------|
| **Customer** | Sign up / sign in, edit profile (photo, name, email, phone, language), pick a branch, book PS5 / PS4 rooms, billiard and ping pong tables, view the menu, reserve store items (cart), cancel pending bookings/orders, follow status live |
| **Staff** | Everything a customer can + **accept or reject** bookings and store orders (for their branch, or all branches if no branch is assigned) |
| **Admin** | Everything + create/edit/hide/delete branches, rooms & tables, menu items, store items, home-page advertisements, the About text & contact info, and assign user roles |

Rules are enforced in the database (Row Level Security + triggers), not just in the UI:
customers can't confirm their own bookings, prices are calculated server-side, two confirmed
bookings can never overlap on the same room/table, and store stock is deducted when an order is accepted.

## 1. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor → New query** → paste `supabase/schema.sql` → **Run**.
3. (Optional) run `supabase/seed.sql` for a demo branch, rooms, menu, store items, ads and About text.
4. **Authentication → URL Configuration**: set the *Site URL* to your website URL
   (e.g. `http://localhost:5173` while developing, your `*.workers.dev` / custom domain in production).
5. Copy **Project URL** and **anon / publishable key** from *Project Settings → API*.

## 2. Run locally

```bash
cp .env.example .env      # then fill in the two values
npm install
npm run dev
```

## 3. Make yourself admin

Sign up on the website, then in the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'you@example.com';
```

Refresh the site — **Admin panel** and **Staff dashboard** appear in the menu.
Promote staff from *Admin panel → Users* (optionally tie them to one branch).

## 4. Deploy to Cloudflare

```bash
npx wrangler login
npm run deploy
```

`wrangler.jsonc` serves `dist/` with SPA routing. The `VITE_*` values are baked in at build time,
so keep them in `.env` when you build (or use **Workers Builds** / Pages from Git and add them as build environment variables).

## Logo

`public/logo.svg` is a vector recreation of the 7K Club logo. Replace it with the official file
(same name, or update `src/components/Logo.tsx` and `index.html`) for the exact artwork.

## Project structure

```
supabase/schema.sql      tables, RLS policies, triggers, storage buckets, realtime
supabase/seed.sql        optional demo content
src/i18n/                English + Arabic strings, RTL switching
src/context/             auth/profile and cart state
src/pages/Home.tsx       header → advertisements → branches → about → footer
src/pages/BranchPage.tsx reserve / menu / store tabs for one branch
src/pages/StaffDashboard.tsx  accept / reject reservations (live)
src/pages/admin/         admin panel (branches, content, users)
```
