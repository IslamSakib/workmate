# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WorkMate is a freelancer productivity SaaS: time tracking, project/client/task management, reporting, and invoicing. React 19 + Vite + TypeScript SPA backed entirely by Supabase (Postgres + Auth + Storage) — there is no custom backend server.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then build for production into `dist/`
- `npm run lint` — ESLint over the whole repo
- `npm run preview` — preview the production build locally

There is no test suite configured. There is no command to run a single test.

Database changes are applied by running SQL files directly in the Supabase SQL editor (or `supabase db push`) — there is no migration framework wiring this up automatically. `0001_init.sql` is the full schema for a brand-new project; `0002_per_second_billing.sql` is an idempotent upgrade script for databases created before per-second billing/task-based invoicing existed (renames `duration_minutes`→`duration_seconds` converting values, adds `tasks.invoice_id`, replaces `invoice_items`' manual line-item columns with task-derived ones). When changing schema going forward, add a new numbered migration rather than editing `0001` in place, since real installs already exist.

## Architecture

### Data layer: Supabase is the backend

`src/lib/supabaseClient.ts` creates the single typed Supabase client (`Database` type from `src/types/database.ts`, hand-written to match the SQL schema — not generated, so it must be updated manually when the schema changes). All persistence goes through this client directly from feature `api.ts` files; there is no API server/routes layer.

Every domain table (`clients`, `projects`, `tasks`, `time_entries`, `invoices`, `invoice_items`, `attachments`, `settings`) has `user_id` and a Postgres RLS policy restricting all access to `auth.uid() = user_id` (see `supabase/migrations/0001_init.sql`). Because RLS enforces ownership, feature `api.ts` functions do not filter by user in queries — they just insert the current `auth.getUser()` id and rely on RLS for read/update/delete scoping. New tables must follow this same pattern (enable RLS + owner policy) or they will be either unreadable or unprotected.

A Postgres trigger (`handle_new_user`) auto-creates a `profiles` row and a `settings` row on signup. `updated_at` is maintained by per-table triggers, not application code.

### Feature module structure

Each domain lives under `src/features/<name>/` with a consistent shape:
- `schema.ts` — Zod schema + inferred input type, used by `react-hook-form` via `@hookform/resolvers`
- `types.ts` — row/view types for the feature
- `api.ts` — thin async functions wrapping `supabase.from(...)` calls, throwing on `error`
- `components/` — feature-specific dialogs/forms, often `*FormDialog.tsx` + `columns.tsx` for table column defs

Pages in `src/pages/` are route-level and compose feature components; routing/layout/data-fetching glue lives there rather than in `features/`.

### Routing and auth gating

`src/App.tsx` defines all routes. `ProtectedRoute`/`PublicOnlyRoute` (`src/components/layout/ProtectedRoute.tsx`) gate access based on `useAuthStore` (`src/store/authStore.ts`), which mirrors Supabase's session via `getSession()` + `onAuthStateChange` and exposes `initialized`/`user`/`session`. Authenticated pages render inside `AppShell` (`src/components/layout/AppShell.tsx`); unauthenticated routes render inside `AuthLayout`.

### Billing is per-second, not per-minute

`tasks.duration_seconds` and `invoice_items.duration_seconds` are the source of truth for time worked — there is no minutes-granularity field anywhere. Revenue/amount math is always `(duration_seconds / 3600) * hourly_rate`, never rounded to whole minutes. `src/lib/duration.ts` exports the single `formatDuration(seconds) → "H:MM:SS"` helper used for every per-entry/per-row time display (Tasks table, Recent Tasks, Reports table, Time Log PDF, Report PDF, Invoice PDF/dialog, Timer). Aggregate KPI tiles (Dashboard hours, Reports "Total Hours" card) are the one deliberate exception — those stay as decimal hours (e.g. "12.5h"), matching the convention of tools like Toggl/Harvest for summary stats.

### Timer state — timers are tasks

`src/store/timerStore.ts` is a Zustand store persisted to localStorage (`zustand/middleware persist`) so an in-progress timer survives reloads. Starting the timer requires a task name and **creates a row in `tasks`** (not just `time_entries`) — the timer is just a live way of logging a task. `pause()`/`stop()` write the exact elapsed second onto both the `time_entries` row and the linked task's `duration_seconds`/`end_time` (no rounding). Elapsed time while running is computed on read (`getCurrentElapsedSeconds`) from `startedAt` + `accumulatedSeconds` rather than ticking in the store; `src/hooks/useElapsedSeconds.ts` drives the live display and re-exports `formatDuration` as `formatElapsed`.

### Invoicing is task-derived, not manually entered

There is no line-item editor. `InvoiceFormDialog` takes a client/project filter + a billing period (`period_start`/`period_end`); `listBillableTasks` (`features/invoices/api.ts`) fetches matching tasks that are `billable` and not yet linked to another invoice (`tasks.invoice_id is null`, or equal to the invoice being edited), computing each one's amount from `project.hourly_rate`. The user can uncheck individual tasks before saving. On save, `invoice_items` rows are created from the selected tasks (snapshotting `task_name`/`task_date`/`duration_seconds`/`rate`/`amount`) and those tasks get `invoice_id` set so they can't be double-billed; deleting an invoice (`ON DELETE SET NULL`) frees them up again automatically.

### PDF generation

`src/lib/pdf/` builds invoices, reports, and time logs as PDFs client-side with `pdf-lib` (`invoicePdf.ts`, `reportPdf.ts`, `timeLogPdf.ts`, with shared layout helpers in `shared.ts` — including `drawRect`/`drawText`/`ensureSpace` for custom layouts and a `headerFill` option on `drawTable` for shaded table headers). No server round-trip — PDFs are generated and downloaded entirely in the browser. `invoicePdf.ts` is the most elaborate template (accent header bar, two-column Billed To/Invoice Details block, highlighted Total Due box) and is the reference to follow if other PDFs need similar polish.

### Theming

Dark mode is wired through `next-themes` (`ThemeProvider attribute="class"` in `main.tsx`, `defaultTheme="system"`); the toggle lives in `Topbar.tsx`. Color tokens are CSS variables in `src/index.css` (light + `.dark` variants) — don't hardcode colors in components, use the existing `bg-*`/`text-*` Tailwind tokens (`bg-card`, `text-muted-foreground`, etc.) or the `border-l-{color}-500` / `bg-{color}-500/10` accent pattern used on dashboard stat cards for tinted icon chips.

### Currency

The app supports multiple currencies per-client/project (`currency_code` enum: USD, BDT, EUR, GBP, PHP). `src/lib/currency.ts` maps each code to an `Intl.NumberFormat` locale for display — use `formatCurrency` rather than formatting amounts manually.

### Path alias

`@/*` maps to `src/*` (configured in both `vite.config.ts` and `tsconfig.app.json`) — use it instead of relative imports across feature boundaries.

### Deployment

Static SPA build deployed to Hostinger shared hosting (no Node server in production); see `DEPLOYMENT.md`. `VITE_*` env vars are inlined at build time, so the app must be rebuilt whenever Supabase credentials change. Client-side routing requires the `.htaccess` rewrite in `public/` to reach `index.html` on full page loads.
