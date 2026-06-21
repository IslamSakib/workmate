# WorkMate

A freelancer productivity SaaS for time tracking, project management, reporting, and invoicing.

## Stack

React 19 · Vite · TypeScript · Tailwind CSS · shadcn/ui · Zustand · React Hook Form + Zod · TanStack Table · Recharts · pdf-lib · Supabase (Auth, Postgres, Storage)

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

Run `supabase/migrations/0001_init.sql` in your Supabase project's SQL editor before first use — see [DEPLOYMENT.md](./DEPLOYMENT.md) for the full setup and Hostinger deployment guide.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run ESLint
- `npm run preview` — preview the production build locally

## Project structure

```
src/
  components/   shared UI (shadcn primitives, layout, DataTable, dialogs)
  features/     domain logic per module (auth, clients, projects, tasks, timer, reports, invoices, settings, dashboard)
  pages/        route-level components
  hooks/        shared hooks
  store/        zustand stores (auth, timer)
  lib/          supabase client, currency formatting, PDF builders
  types/        hand-written Supabase database types
supabase/
  migrations/   SQL schema + RLS policies
```
