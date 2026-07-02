# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WorkMate is a freelancer productivity SaaS: time tracking, project/client/task management, reporting, and invoicing. React 19 + Vite + TypeScript SPA backed entirely by Supabase (Postgres + Auth + Storage) — there is no custom backend server.

## Commands

- `npm run dev` — start the Vite dev server
- `npm run build` — type-check (`tsc -b`) then build for production into `dist/`
- `npm run lint` — ESLint over the whole repo
- `npm run preview` — preview the production build locally

There is no automated test suite configured. There is no command to run a single test. `TESTING_GUIDE.md` is a manual QA walkthrough (per feature, per role: Owner/Manager/Employee/Client Portal) — use it to verify a change by hand rather than looking for a test runner.

Database changes are applied by running SQL files directly in the Supabase SQL editor (or `supabase db push`) — there is no migration framework wiring this up automatically. `0001_init.sql` is the full schema for a brand-new project; every later file is an idempotent upgrade script (safe to re-run) for databases created before that feature existed:
- `0002_per_second_billing.sql` — renames `duration_minutes`→`duration_seconds` converting values, adds `tasks.invoice_id`, replaces `invoice_items`' manual line-item columns with task-derived ones
- `0003_retainers.sql` / `0004_expenses.sql` / `0005_audit_logs.sql` — purely additive new tables, no changes to existing columns
- `0006_team_members.sql` — adds multi-user team access (`team_members`, `has_account_access()`); also adds `created_by` to every business table and contains the one real data-touching statement in this set (an idempotent `created_by` backfill guarded by `where created_by is null`)
- `0007_permission_matrix.sql` — replaces the v1 "every role can do everything" policies from 0006 with the real per-role matrix (see "Multi-user accounts and permissions" below); pure policy/function replacement, no data changes
- `0008_timesheet_approval.sql` — adds `tasks.approval_status` (`draft`/`submitted`/`approved`/`rejected`) plus two triggers: one defaults new tasks to `submitted` (Employee) or `approved` (Manager+) based on `has_min_role`, the other (`prevent_self_approval`) blocks an Employee from setting their own row to `approved` directly
- `0009_advanced_invoicing.sql` — extends the `invoice_status` enum with `scheduled`/`partial`, adds `invoices.notes`/`scheduled_date`/`reminder_count`/`amount_paid`, and adds `invoice_payments` + `recurring_invoices` tables (manager+ RLS, same shape as `retainers`)
- `0010_client_portal.sql` — adds `client_portal_access` + `has_client_portal_access()`, a parallel client_id-scoped access path independent of `team_members`/`TeamRole` (see "Client portal" below); also adds `projects.client_approval_status`/`client_approved_at` and an `approve_project_deliverable()` RPC

When changing schema going forward, add a new numbered migration rather than editing an existing one in place, since real installs already exist.

## Architecture

### Data layer: Supabase is the backend

`src/lib/supabaseClient.ts` creates the single typed Supabase client (`Database` type from `src/types/database.ts`, hand-written to match the SQL schema — not generated, so it must be updated manually when the schema changes). All persistence goes through this client directly from feature `api.ts` files; there is no API server/routes layer.

Every domain table (`clients`, `projects`, `tasks`, `time_entries`, `invoices`, `invoice_items`, `attachments`, `settings`, `retainers`, `expenses`) has `user_id` (the account owner) and Postgres RLS policies — originally a flat `auth.uid() = user_id` check, now role-aware via `has_account_access()`/`has_min_role()` (see "Multi-user accounts and permissions" below). Because RLS enforces scoping server-side, feature `api.ts` functions do not filter by user/role in queries — they just insert the current `auth.getUser()` id and rely on RLS for read/update/delete scoping. New tables must follow this same pattern (enable RLS + policies keyed off `user_id`) or they will be either unreadable or unprotected.

A Postgres trigger (`handle_new_user`) auto-creates a `profiles` row and a `settings` row on signup, and (since `0006`) activates any pending `team_members` invite matching the new user's email. `updated_at` is maintained by per-table triggers, not application code.

### Multi-user accounts and permissions

An account can have teammates, not just a solo owner. `team_members` (`account_id`, `member_id`, `role: TeamRole = "admin" | "manager" | "employee"`, `status: "invited" | "active"`) links a teammate's own `auth.users` login to the owning account. `useAuthStore` (`src/store/authStore.ts`) resolves on session load whether the current user *is* an account owner (`role: null`, `accountId = own id`) or an active team member (`role` from `team_members`, `accountId` = the inviting owner's id) — every feature query should reason in terms of `accountId`/`role` from this store, not assume `auth.uid()` is the account.

Permissions are enforced in two places that must be kept in sync:
- **Database**: `has_account_access(target_user_id)` (any active member, read access baseline) and `has_min_role(target_user_id, min_role)` (role-ranked: admin=3, manager=2, employee=1) are `security definer` SQL functions used directly in RLS policies — see `supabase/migrations/0007_permission_matrix.sql` for the table-by-table matrix (e.g. Employees get read-only on Clients/Projects, full access only to their own Tasks/Time Entries via `created_by`, and no access at all to Invoices/Retainers/Expenses/Audit Logs).
- **Client**: `src/lib/permissions.ts` exports `hasMinRole(role, min)`, a pure-TS mirror of the SQL `has_min_role()` ranking (`null` role = Owner, always passes), used to hide nav items (`src/components/layout/nav-items.ts`'s `minRole` field), command palette actions (`CommandPalette.tsx`), and other UI gating. The client-side check is for UX only — RLS is the actual enforcement boundary, so any new restricted table needs a matching policy, not just a hidden button.

`created_by` (added in `0006`, distinct from `user_id`) tracks who actually performed an action versus which account owns the data — needed because Employee RLS policies on `tasks`/`time_entries` check `created_by = auth.uid()` to scope them to their own records.

### Timesheet approval

`tasks.approval_status` gates invoice eligibility — `listBillableTasks` (`features/invoices/api.ts`) only picks up `approval_status = 'approved'` tasks, on top of the existing `billable`/`invoice_id is null` filters. Employees submit (`submitTask`), Manager+ approve/reject (`approveTask`/`rejectTask`, `features/tasks/api.ts`); a DB trigger (`prevent_self_approval`, `0008`) blocks an Employee from approving their own row even via a direct API call — this is enforced server-side, not just hidden in the UI.

### Client portal

A client is **not** a `TeamRole` — team members get account-wide access scoped by role; a client must only ever see their own `client_id`'s data. This is a parallel, independent access path: `client_portal_access` + `has_client_portal_access(client_id)` (`0010`), checked in `useAuthStore.resolveAccount()` *before* the "I'm the Owner" fallback. **Critical invariant**: `hasMinRole(null, ...)` treats `role: null` as Owner-always-passes, and a portal client also has `role: null` — so every portal session is routed through a completely separate route tree (`PortalRoute` → `PortalShell` → `/portal`, `src/components/layout/ProtectedRoute.tsx`/`PortalShell.tsx`) that never renders `AppShell`/`Sidebar`/`NAV_ITEMS`/`CommandPalette`, rather than trying to patch every `hasMinRole` call site to also check `isClientPortal`. The portal is read-only except `approveProjectDeliverable` (`features/client-portal/api.ts`), which calls the `approve_project_deliverable` RPC — a `security definer` function is used instead of an UPDATE policy specifically so a client can never get row-level write access to `projects` (which has far more sensitive columns like `hourly_rate`).

### Feature module structure

Each domain lives under `src/features/<name>/` with a consistent shape:
- `schema.ts` — Zod schema + inferred input type, used by `react-hook-form` via `@hookform/resolvers`
- `types.ts` — row/view types for the feature
- `api.ts` — thin async functions wrapping `supabase.from(...)` calls, throwing on `error`
- `components/` — feature-specific dialogs/forms, often `*FormDialog.tsx` + `columns.tsx` for table column defs

Pages in `src/pages/` are route-level and compose feature components; routing/layout/data-fetching glue lives there rather than in `features/`.

### Routing and auth gating

`src/App.tsx` defines all routes. `ProtectedRoute`/`PublicOnlyRoute` (`src/components/layout/ProtectedRoute.tsx`) gate access based on `useAuthStore` (`src/store/authStore.ts`), which mirrors Supabase's session via `getSession()` + `onAuthStateChange` and exposes `initialized`/`user`/`session`/`accountId`/`role`. Authenticated pages render inside `AppShell` (`src/components/layout/AppShell.tsx`); unauthenticated routes render inside `AuthLayout`. Sidebar items are filtered by role (see "Multi-user accounts and permissions" above) but routes themselves are not separately role-gated — page-level access ultimately relies on RLS returning empty/erroring for data the role can't see.

### Audit logging

`audit_logs` is populated entirely by a generic Postgres trigger (`log_audit_entry()`, `supabase/migrations/0005_audit_logs.sql`/`0006_team_members.sql`) attached to `clients`, `projects`, `tasks`, `time_entries`, `invoices`, `retainers`, `expenses` — there is no application code that writes audit rows, since every mutation goes straight from the browser to Supabase with no backend to intercept it. Each row snapshots `old_values`/`new_values` as full-row JSONB plus `user_id` (account owner) and `actor_id` (who actually did it, once team members exist). Rows are insert-only — no update/delete RLS policy exists for any role, including the Owner. `features/audit-logs/api.ts` only reads; the table/column-name strings it filters on must match real Postgres table names since the trigger uses `tg_table_name` directly.

### Command palette

`src/components/layout/CommandPalette.tsx` (cmdk-based, `src/components/ui/command.tsx`) provides global search across clients/projects/tasks/invoices/expenses plus quick-create and quick-nav actions, each gated by `hasMinRole` the same way the sidebar is. When adding a new searchable/creatable entity, extend this file's per-entity `useEffect` fetch + result list rather than introducing a separate search mechanism.

### Billing is per-second, not per-minute

`tasks.duration_seconds` and `invoice_items.duration_seconds` are the source of truth for time worked — there is no minutes-granularity field anywhere. Revenue/amount math is always `(duration_seconds / 3600) * hourly_rate`, never rounded to whole minutes. `src/lib/duration.ts` exports the single `formatDuration(seconds) → "H:MM:SS"` helper used for every per-entry/per-row time display (Tasks table, Recent Tasks, Reports table, Report PDF, Invoice PDF/dialog, Timer). Aggregate KPI tiles (Dashboard hours, Reports "Total Hours" card) are the one deliberate exception — those stay as decimal hours (e.g. "12.5h"), matching the convention of tools like Toggl/Harvest for summary stats.

### Timer state — timers are tasks

`src/store/timerStore.ts` is a Zustand store persisted to localStorage (`zustand/middleware persist`) so an in-progress timer survives reloads. Starting the timer requires a task name and **creates a row in `tasks`** (not just `time_entries`) — the timer is just a live way of logging a task. `pause()`/`stop()` write the exact elapsed second onto both the `time_entries` row and the linked task's `duration_seconds`/`end_time` (no rounding). Elapsed time while running is computed on read (`getCurrentElapsedSeconds`) from `startedAt` + `accumulatedSeconds` rather than ticking in the store; `src/hooks/useElapsedSeconds.ts` drives the live display and re-exports `formatDuration` as `formatElapsed`.

### Invoicing is task-derived, not manually entered

There is no line-item editor. `InvoiceFormDialog` takes a client/project filter + a billing period (`period_start`/`period_end`); `listBillableTasks` (`features/invoices/api.ts`) fetches matching tasks that are `billable`, `approval_status = 'approved'`, and not yet linked to another invoice (`tasks.invoice_id is null`, or equal to the invoice being edited), computing each one's amount from `project.hourly_rate`. The user can uncheck individual tasks before saving. On save, `invoice_items` rows are created from the selected tasks (snapshotting `task_name`/`task_date`/`duration_seconds`/`rate`/`amount`) and those tasks get `invoice_id` set so they can't be double-billed; deleting an invoice (`ON DELETE SET NULL`) frees them up again automatically.

Partial payments, scheduled invoices, and recurring invoices are all **client-driven, not server-cron** — this app has no Edge Functions/backend to run a real scheduled job. `invoice_payments` rows accumulate into `invoices.amount_paid`, flipping status to `partial`/`paid` (`recordPayment`, `features/invoices/api.ts`). `promoteScheduledInvoices()` and `generateDueRecurringInvoices()` (`features/recurring-invoices/api.ts`) both run lazily — called once on `AppShell` mount / `InvoicesPage` load — and flip `scheduled` invoices past their `scheduled_date` to `sent`, or generate the next invoice from a `recurring_invoices` template past its `next_run_date`, respectively. If a real background job is ever added, these are the two functions to move server-side; don't change their call signatures without checking both call sites.

### Retainers compute usage, they don't track it

`retainers` (client, monthly fee, `included_hours`, `overage_rate`) has no `retainer_id` foreign key on `tasks`. Used/remaining/overage hours are computed in the application from existing `tasks` rows for the retainer's client during the current calendar month, not from a stored link — this was a deliberate choice so the feature works immediately against historical data with no backfill. Keep that in mind before adding a `tasks.retainer_id` column: it would require reconciling against this computed approach rather than just being additive.

### Insights are derived, not separately tracked

`features/insights/` (Manager+ only, `/insights`) computes Top Clients, Most Profitable Projects, a Client Health Score, Burn Rate, and Retention Rate entirely from existing `tasks`/`invoices`/`invoice_payments`/`expenses` data — no new tracked metrics, no AI calls. It deliberately reuses this app's one definition of "revenue" (`(duration_seconds / 3600) * hourly_rate` from billable tasks, via `getYearTasks()`/`revenueFor()` exported from `features/dashboard/api.ts`) rather than introducing a second invoice-based revenue figure that could disagree with the Dashboard. The Client Health Score's three sub-scores (revenue, payment speed, recent activity) are each ranked *relative to the top client*, not against an absolute target — the spec's "Communication Activity" dimension was dropped since this app has no email/call/message tracking anywhere. The Revenue Forecast is an explicitly-labeled heuristic (trailing-3-month average delta extrapolated forward, `getRevenueForecast` in `features/insights/api.ts`), not a real model — swap the function body, not its signature, if a real forecasting approach is added later.

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
