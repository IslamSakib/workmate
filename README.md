# WorkMate

A freelancer productivity SaaS for time tracking, project management, reporting, and invoicing. Billing is tracked to the exact second, and invoices are generated automatically from logged tasks for a given client/project and billing period — no manual line items.

## Features

- **Time tracking** — manual task log (start/end time, auto-calculated duration) and a live Timer that creates and updates a linked task per second
- **Task-based invoicing** — pick a client/project + billing period, matching unbilled tasks (and their exact duration × hourly rate) are pulled in automatically; exports a professional client-facing PDF
- **Dashboard & reports** — revenue/hours KPIs, trend charts, exportable time-log and report PDFs
- **Dark mode** — system-aware theme toggle (`next-themes`)
- **Multi-currency** — per-client/project currency with locale-aware formatting

## Stack

React 19 · Vite · TypeScript · Tailwind CSS · shadcn/ui · Zustand · React Hook Form + Zod · TanStack Table · Recharts · pdf-lib · Supabase (Auth, Postgres, Storage)

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

Run `supabase/migrations/0001_init.sql` in your Supabase project's SQL editor before first use (fresh projects only need this one file). If you already have a WorkMate database from before per-second billing was added, also run `0002_per_second_billing.sql` to migrate it in place. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full setup and Hostinger deployment guide.

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
  lib/          supabase client, currency/duration formatting, PDF builders
  types/        hand-written Supabase database types
supabase/
  migrations/   SQL schema + RLS policies (0001 = fresh install, 0002 = upgrade existing DB)
```
