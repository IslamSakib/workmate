# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WorkMate is a single-user freelancer productivity app: time tracking, project/client/task management, reporting, and invoicing. It is built for exactly one person (the account owner) — there is no multi-user/team access, no client portal, and no approval workflow. React 19 + Vite + TypeScript SPA backed entirely by Supabase (Postgres + Auth + Storage) — there is no custom backend server at all.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then build for production into `dist/`
- `npm run lint` — ESLint over the whole repo
- `npm run preview` — preview the production build locally

There is no automated test suite configured. There is no command to run a single test. `TESTING_GUIDE.md` is a manual QA walkthrough for the single freelancer user — use it to verify a change by hand rather than looking for a test runner.

Database changes are applied by running SQL files directly in the Supabase SQL editor (or `supabase db push`) — there is no migration framework wiring this up automatically. `0001_init.sql` is the full schema for a brand-new project; every later file is an idempotent upgrade script (safe to re-run) for databases created before that feature existed:
- `0002_per_second_billing.sql` — renames `duration_minutes`→`duration_seconds` converting values, adds `tasks.invoice_id`, replaces `invoice_items`' manual line-item columns with task-derived ones
- `0003_retainers.sql` / `0004_expenses.sql` (the expenses module was later removed from the app; its table is left in the database, unused) — purely additive new tables, no changes to existing columns
- `0006_team_members.sql` / `0007_permission_matrix.sql` / `0008_timesheet_approval.sql` / `0010_client_portal.sql` — added multi-user team access, a per-role permission matrix, a timesheet approval workflow, and a client portal, all since **removed** by `0011_single_user.sql`. Kept for history; don't build on anything they added.
- `0009_advanced_invoicing.sql` — extends the `invoice_status` enum with `scheduled`/`partial`, adds `invoices.notes`/`scheduled_date`/`reminder_count`/`amount_paid`, and adds `invoice_payments` + `recurring_invoices` tables
- `0011_single_user.sql` — reverts the app to single-user: drops `team_members`, `client_portal_access`, and `audit_logs` entirely, drops the timesheet-approval and client-approval columns/triggers, and replaces every RLS policy with a plain `auth.uid() = user_id` check. This is the current permission model — there is no role or portal concept anywhere anymore.

- `0016_currency_and_payments.sql` — `settings.exchange_rates`/`rates_updated_at`/`next_invoice_seq`, agreed-rate columns (`projects`/`invoices`/`invoice_payments.fx_rate`), `invoices.kind` (standard/advance/milestone), `invoice_items.kind`/`credit_invoice_id`, payment triggers that keep `amount_paid` and `status` in sync, `next_invoice_number()`, drops the proposals RPCs
- `0017_recurring_billing.sql` — server-side "until I stop it" recurring invoices: `generate_recurring_invoices()` (idempotent, catches up missed periods, optional daily pg_cron), fixed-amount or billable-tasks mode
- `0018_invoice_rpcs.sql` — `create_invoice`/`update_invoice` RPCs: one transaction, server-computed totals, advance credits, guarded task linking. The app calls these; invoices cannot be saved until it is applied
- `0020_jobs_and_invoice_fix.sql` — fixes the ambiguous `total` variable in the invoice RPCs; adds `recurring_invoices.employment_type` (jobs, paid in arrears: invoice covers the period before its pay date) and `recurring_amount_changes` (salary/amount raises effective from a date); `generate_recurring_invoices()` updated to use both

When changing schema going forward, add a new numbered migration rather than editing an existing one in place, since a real install already exists.

## Architecture

### Data layer: Supabase is the backend

`src/lib/supabaseClient.ts` creates the single typed Supabase client (`Database` type from `src/types/database.ts`, hand-written to match the SQL schema — not generated, so it must be updated manually when the schema changes). All persistence goes through this client directly from feature `api.ts` files; there is no API server/routes layer.

Every domain table (`clients`, `projects`, `tasks`, `time_entries`, `invoices`, `invoice_items`, `attachments`, `settings`, `retainers`) has `user_id` (the account owner) and a Postgres RLS policy of the flat form `auth.uid() = user_id` — there is exactly one user per account, so this is the entire enforcement model. Because RLS enforces scoping server-side, feature `api.ts` functions do not filter by user in queries — they just insert the current `auth.getUser()` id and rely on RLS for read/update/delete scoping. New tables must follow this same pattern (enable RLS + an owner-only policy keyed off `user_id`) or they will be either unreadable or unprotected.

A Postgres trigger (`handle_new_user`) auto-creates a `profiles` row and a `settings` row on signup. `updated_at` is maintained by per-table triggers, not application code.

`useAuthStore` (`src/store/authStore.ts`) exposes `accountId`, which is simply the signed-in user's own id — kept as a named field (rather than reading `auth.uid()` inline everywhere) because every feature `api.ts` insert already reads it that way. There is no role, no team, no portal concept anywhere in this app.

`created_by` (on every business table, always equal to `user_id` for a single-user account) is a holdover from a removed multi-user feature — harmless to leave alongside `user_id` on inserts, not meaningful to reason about beyond that.

### Feature module structure

Each domain lives under `src/features/<name>/` with a consistent shape:
- `schema.ts` — Zod schema + inferred input type, used by `react-hook-form` via `@hookform/resolvers`
- `types.ts` — row/view types for the feature
- `api.ts` — thin async functions wrapping `supabase.from(...)` calls, throwing on `error`
- `components/` — feature-specific dialogs/forms, often `*FormDialog.tsx` + `columns.tsx` for table column defs

Pages in `src/pages/` are route-level and compose feature components; routing/layout/data-fetching glue lives there rather than in `features/`.

Every page header follows the same pattern: an `<InfoTooltip>` (`src/components/shared/InfoTooltip.tsx`) next to the `<h1>` giving a one-sentence, plain-language explanation of the page for non-technical users — match this when adding a new page rather than leaving it unexplained or writing inline help text some other way.

`DataTable` (`src/components/shared/DataTable.tsx`) auto-generates a "Columns" visibility toggle for any column that doesn't opt out — set `enableHiding: false` on columns that must always render (e.g. the row-actions column) when defining a new `columns.tsx`.

### Routing and auth gating

`src/App.tsx` defines all routes. `ProtectedRoute`/`PublicOnlyRoute` (`src/components/layout/ProtectedRoute.tsx`) gate access based on `useAuthStore` (`src/store/authStore.ts`), which mirrors Supabase's session via `getSession()` + `onAuthStateChange` and exposes `initialized`/`user`/`session`/`accountId`. Authenticated pages render inside `AppShell` (`src/components/layout/AppShell.tsx`); unauthenticated routes render inside `AuthLayout`. `NAV_ITEMS` (`src/components/layout/nav-items.ts`) is shown in full to any signed-in user — there is no gating left, since there is only one role.

### Command palette

`src/components/layout/CommandPalette.tsx` (cmdk-based, `src/components/ui/command.tsx`) provides global search across clients/projects/tasks/invoices/expenses plus quick-create and quick-nav actions. When adding a new searchable/creatable entity, extend this file's per-entity `useEffect` fetch + result list rather than introducing a separate search mechanism.

### Billing is per-second, not per-minute

`tasks.duration_seconds` and `invoice_items.duration_seconds` are the source of truth for time worked — there is no minutes-granularity field anywhere. Revenue/amount math is always `(duration_seconds / 3600) * hourly_rate`, never rounded to whole minutes. `src/lib/duration.ts` exports the single `formatDuration(seconds) → "H:MM:SS"` helper used for every per-entry/per-row time display (Tasks table, Recent Tasks, Reports table, Report PDF, Invoice PDF/dialog, Timer). Aggregate KPI tiles (Dashboard hours, Reports "Total Hours" card) are the one deliberate exception — those stay as decimal hours (e.g. "12.5h"), matching the convention of tools like Toggl/Harvest for summary stats.

### Timer state — timers are tasks

`src/store/timerStore.ts` is a Zustand store persisted to localStorage (`zustand/middleware persist`) so an in-progress timer survives reloads. Starting the timer requires a task name and **creates a row in `tasks`** (not just `time_entries`) — the timer is just a live way of logging a task. `pause()`/`stop()` write the exact elapsed second onto both the `time_entries` row and the linked task's `duration_seconds`/`end_time` (no rounding). Elapsed time while running is computed on read (`getCurrentElapsedSeconds`) from `startedAt` + `accumulatedSeconds` rather than ticking in the store; `src/hooks/useElapsedSeconds.ts` drives the live display and re-exports `formatDuration` as `formatElapsed`.

### Invoicing is task-derived, not manually entered

There is no line-item editor. `InvoiceFormDialog` takes a client/project filter + a billing period (`period_start`/`period_end`); `listBillableTasks` (`features/invoices/api.ts`) fetches matching tasks that are `billable` and not yet linked to another invoice (`tasks.invoice_id is null`, or equal to the invoice being edited), computing each one's amount from `project.hourly_rate`. The user can uncheck individual tasks before saving. On save, `invoice_items` rows are created from the selected tasks (snapshotting `task_name`/`task_date`/`duration_seconds`/`rate`/`amount`) and those tasks get `invoice_id` set so they can't be double-billed; deleting an invoice (`ON DELETE SET NULL`) frees them up again automatically.

**Fixed-price projects** (`hourly_rate` null, `fixed_price` set) don't fit the per-task hourly math — every task on one prices at $0 via `revenueFor`/`hourly_rate ?? 0`. Instead, `listBillableTasks` offers one synthetic line item (`FLAT_FEE_ITEM_ID`, `getFlatFeeItemFor` in `features/invoices/api.ts`) for the project's full `fixed_price`, checked by default, alongside the (still $0) real tasks. It's offered once per project — `getFlatFeeItemFor` checks whether any other invoice for that project already has an `invoice_items` row with `task_id is null` and stops offering it once billed. `linkInvoiceItems` routes this synthetic item to `task_id: null` on save rather than passing its sentinel id into the real-task `tasks.invoice_id` update.

Partial payments, scheduled invoices, and recurring invoices are all **client-driven, not server-cron** — this app has no Edge Functions/backend to run a real scheduled job. `invoice_payments` rows accumulate into `invoices.amount_paid`, flipping status via `recomputePaymentStatus` (`features/invoices/api.ts`), which both `recordPayment` and `deletePayment` call — it always sets an explicit status (`sent`/`partial`/`paid`) from the current sum rather than leaving it unchanged, so deleting a mistaken payment correctly un-pays an invoice too. `RecordPaymentDialog` shows the full payment history (`getInvoicePayments`) with a delete action per row, not just a running balance. `promoteScheduledInvoices()` and `generateDueRecurringInvoices()` (`features/recurring-invoices/api.ts`) both run lazily — called once on `AppShell` mount / `InvoicesPage` load — and flip `scheduled` invoices past their `scheduled_date` to `sent`, or generate the next invoice from a `recurring_invoices` template past its `next_run_date`, respectively. If a real background job is ever added, these are the two functions to move server-side; don't change their call signatures without checking both call sites.

### Retainers compute usage, they don't track it

`retainers` (client, monthly fee, `included_hours`, `overage_rate`) has no `retainer_id` foreign key on `tasks`. Used/remaining/overage hours are computed in the application from existing `tasks` rows for the retainer's client during the current calendar month, not from a stored link — this was a deliberate choice so the feature works immediately against historical data with no backfill. Keep that in mind before adding a `tasks.retainer_id` column: it would require reconciling against this computed approach rather than just being additive.

### Insights are derived, not separately tracked

`features/insights/` (`/insights`) computes Top Clients, Most Profitable Projects, a Client Health Score, Burn Rate, and Retention Rate entirely from existing `tasks`/`invoices`/`invoice_payments`/`expenses` data — no new tracked metrics, no AI calls. It deliberately reuses this app's one definition of "revenue" (`(duration_seconds / 3600) * hourly_rate` from billable tasks, via `getYearTasks()`/`revenueFor()` exported from `features/dashboard/api.ts`) rather than introducing a second invoice-based revenue figure that could disagree with the Dashboard. The Client Health Score's three sub-scores (revenue, payment speed, recent activity) are each ranked *relative to the top client*, not against an absolute target — the spec's "Communication Activity" dimension was dropped since this app has no email/call/message tracking anywhere. The Revenue Forecast is an explicitly-labeled heuristic (trailing-3-month average delta extrapolated forward, `getRevenueForecast` in `features/insights/api.ts`), not a real model — swap the function body, not its signature, if a real forecasting approach is added later.

### PDF generation

`src/lib/pdf/` builds invoices and reports as PDFs client-side with `pdf-lib` (`invoicePdf.ts`, `reportPdf.ts`, with shared layout helpers in `shared.ts` — including `drawRect`/`drawText`/`ensureSpace` for custom layouts and a `headerFill` option on `drawTable` for shaded table headers). All pages are fixed at A4 (`PAGE_WIDTH`/`PAGE_HEIGHT` in `shared.ts`). `drawTable`'s cells word-wrap to their column's `width` (hard-breaking a single overlong word) rather than drawing a single line, so long task names grow the row height instead of overflowing into the next column — respect existing column `width`s (they're sized to sum to the A4 content width) when adding table columns. No server round-trip — PDFs are generated and downloaded entirely in the browser. `invoicePdf.ts` is the most elaborate template (accent header bar, two-column Billed To/Invoice Details block, highlighted Total Due box) and is the reference to follow if other PDFs need similar polish.

### Theming

Dark mode is wired through `next-themes` (`ThemeProvider attribute="class"` in `main.tsx`, `defaultTheme="system"`); the toggle lives in `Topbar.tsx`. Color tokens are CSS variables in `src/index.css` (light + `.dark` variants) — don't hardcode colors in components, use the existing `bg-*`/`text-*` Tailwind tokens (`bg-card`, `text-muted-foreground`, etc.) or the `border-l-{color}-500` / `bg-{color}-500/10` accent pattern used on dashboard stat cards for tinted icon chips.

### Currency

The app supports multiple currencies per-client/project (`currency_code` enum: USD, BDT, EUR, GBP, PHP). `src/lib/currency.ts` maps each code to an `Intl.NumberFormat` locale for display — use `formatCurrency` rather than formatting amounts manually.

### Path alias

`@/*` maps to `src/*` (configured in both `vite.config.ts` and `tsconfig.app.json`) — use it instead of relative imports across feature boundaries.

### Deployment

Static SPA build deployed to Hostinger shared hosting (no Node server in production); see `DEPLOYMENT.md`. `VITE_*` env vars are inlined at build time, so the app must be rebuilt whenever Supabase credentials change. Client-side routing requires the `.htaccess` rewrite in `public/` to reach `index.html` on full page loads.


## Overhaul notes (ui-overhaul branch)

- Removed features: Insights, Calendar, Retainers, Proposals, CRM pipeline, Expenses. Kept: Recurring (now server-side, route `/recurring`).
- UI rules: no icons, no gradients, no shadows. Palette is deep teal on warm paper with a dark teal sidebar (tokens in `src/index.css`). Invoice and receipt PDFs stay black and white (`src/lib/pdf/invoicePdf.ts`, ISO currency codes because the PDF font cannot draw the taka sign).
- Shared UI: `PageHeader`, `Stat`/`Status`/`InvoiceStatus`, `EmptyState`/`ErrorState`, `Money`, `Converted`/`ShowInSelector`. `DataTable` renders stacked cards below `md`.
- Currency: default currency (BDT) is the base; `settings.exchange_rates` are base-per-unit. A project can lock an agreed rate (`fx_rate`/`fx_base`), which wins over the table (`rateToBase` in `src/lib/currency.ts`). Totals are never summed across currencies; `Converted` shows the chosen currency plus the originals, and names any currency with no rate.
- Invoices: `kind` standard/advance/milestone; the final invoice can credit paid advances (`advance_credit` lines). Payments are labelled Advance/Partial/Final/Full; status and `amount_paid` come from DB triggers. "Overdue" is derived from `due_date`, never stored.
- Tests: `npm test` (Vitest) covers currency conversion and PDF text safety.

- Reports: revenue = hourly tasks at project rate + amount paid on non-hourly invoices (fixed projects, jobs), dated by invoice `issue_date` (`listFixedFeeRevenue`); `listPending` gives money still to receive. Project filter applies to both.
