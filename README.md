# WorkMate

An agency & business operations platform for freelancers, consultancies, and small agencies — time tracking, client/project management, invoicing, retainers, expenses, multi-user team accounts, and a client portal. Billing is tracked to the exact second, and invoices are generated automatically from logged tasks for a given client/project and billing period — no manual line items.

## Features

- **Time tracking** — manual task log (start/end time, auto-calculated duration) and a live Timer that creates and updates a linked task per second
- **Task-based invoicing** — pick a client/project + billing period, matching unbilled (and approved) tasks are pulled in automatically; exports a professional client-facing PDF
- **Timesheet approval** — Employees submit logged time, Manager+ approve or reject it; only approved tasks become invoice-eligible
- **Advanced invoicing** — partial payments, scheduled invoices, recurring invoice templates, and payment reminders (mailto), on top of the core task-derived invoice flow
- **Retainers** — monthly retainer terms per client with used/remaining/overage hours computed automatically from logged tasks
- **Expenses** — track costs per client/project to unlock profit/profit-margin reporting
- **Multi-user team accounts** — invite teammates with Admin/Manager/Employee roles, enforced via Postgres RLS, not just hidden UI
- **Audit logs** — searchable, insert-only history of every create/update/delete across the app
- **Business Insights** — top clients, most profitable projects, a 0–100 client health score, revenue forecast, burn rate, and retention rate, all derived from existing data (Manager+)
- **Client portal** — a read-only login for clients scoped to exactly their own data (projects, hours, invoices + PDF download), plus project-level sign-off
- **Dashboard & reports** — revenue/hours/profit KPIs, trend charts, an exportable A4 report PDF
- **Dark mode** — system-aware theme toggle (`next-themes`)
- **Multi-currency** — per-client/project currency with locale-aware formatting
- **Command palette** — `Ctrl/Cmd+K` global search and quick-create across clients, projects, tasks, invoices, and expenses

## Stack

React 19 · Vite · TypeScript · Tailwind CSS · shadcn/ui · Zustand · React Hook Form + Zod · TanStack Table · Recharts · pdf-lib · Supabase (Auth, Postgres, Storage)

## Getting started

```bash
npm install
cp .env.example .env   # fill in your Supabase URL + anon key
npm run dev
```

Run every file in `supabase/migrations/` **in numeric order** (`0001` through the highest-numbered file) in your Supabase project's SQL editor before first use — `0001` is the base schema, every later file is an additive, idempotent upgrade for one feature each. See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full setup, the per-migration breakdown, and the Hostinger deployment guide.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` — type-check and build for production
- `npm run lint` — run ESLint
- `npm run preview` — preview the production build locally

## Project structure

```
src/
  components/   shared UI (shadcn primitives, layout, DataTable, dialogs)
  features/     domain logic per module (clients, projects, tasks, timer, reports,
                 invoices, recurring-invoices, retainers, expenses, team,
                 audit-logs, insights, client-portal, settings, dashboard)
  pages/        route-level components
  hooks/        shared hooks
  store/        zustand stores (auth, timer)
  lib/          supabase client, currency/duration formatting, PDF builders, permissions
  types/        hand-written Supabase database types
supabase/
  migrations/   SQL schema + RLS policies, one feature per file after 0001 (see CLAUDE.md
                 for what each one does)
```
