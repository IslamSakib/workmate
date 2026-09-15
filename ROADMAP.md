# WorkMate Roadmap

Plan for evolving WorkMate into a compact, production-ready all-in-one tool for a solo freelancer — grounded in the actual codebase (`CLAUDE.md`) and a scan of what competing all-in-one freelancer tools (Plutio, Agiled, HoneyBook, Bonsai, Deelo, OneSuite) offer in 2026. Written 2026-09-15.

**Hard constraint carried through every item below:** WorkMate is a static SPA with no backend server — no cron, no webhooks, no email sending. `0011_single_user.sql` deliberately killed multi-user/team access and the client portal. Nothing here reintroduces a second login role or a server process; every "client-facing" feature uses a public, token-based, read-only route instead (same shape as the existing recurring-invoice/scheduled-invoice "lazy, client-driven" pattern).

## P0 — Fix first (correctness bug, found during this review)

**Dashboard/Reports totals silently sum different currencies together.**
`StatsCards.tsx` calls `formatCurrency(stats.revenueMonth)` with no currency argument, defaulting to USD. `revenueFor()` and the Reports aggregates sum `duration_seconds/3600 * hourly_rate` across *all* projects regardless of each project's `currency_code` — so a $100 USD project and a ৳10,000 BDT project both just add as raw numbers, then get labeled "$". Every aggregate figure (Revenue This Month, Profit, Outstanding, Insights) is wrong for any account with more than one currency in play — which this account already has (USD + BDT projects).

**Status: fully fixed (2026-09-15).** Every place that aggregated money across rows now groups by currency instead of blending, via new `sumByCurrency`/`addCurrencyAmounts`/`subtractCurrencyAmounts`/`formatCurrencyAmounts`/`currenciesIn` helpers in `src/lib/currency.ts`:
- **Dashboard**: Revenue/Profit/Outstanding KPI cards, Upcoming Deadlines, Retainer Usage — render e.g. `$41.12 + ৳18,000.00` instead of a blended `$18,041.12`.
- **Dashboard trend charts** (`RevenueTrendChart`, `ProfitChart`): render one mini chart per currency in play inside the same Card (so a single-currency account sees no visual change at all — it's still just one chart).
- **Reports**: Total Revenue card, PDF export, and the Revenue trend chart — same per-currency split.
- **Insights**: Top Clients revenue, Most Profitable Projects (revenue/expenses/profit — this one could genuinely mix currencies within a single project if an expense was logged in a different currency than the project, now handled correctly instead of silently blending), Monthly Burn Rate, and the Revenue Forecast (projected per currency using that currency's own trailing delta, not one blended delta).
- A ratio that can't honestly be blended (profit margin %, month-over-month growth %) is shown only when exactly one currency is active for that comparison, and hidden (`—`) otherwise — same "null when meaningless" pattern the codebase already used for the zero-revenue case.
- Swept every `formatCurrency(...)` call site in the repo afterward (25 total) to confirm none were left defaulting to USD.

No remaining gap. `tsc -b`, `eslint`, and `vite build` all pass clean throughout.

## P1 — High-value, fits the existing architecture cleanly

1. ✅ **Attachments UI** (done 2026-09-15) — `src/features/attachments/` + `AttachmentsPanel` wired into Clients, Projects, and Invoices edit dialogs, using the storage bucket that already existed. Not click-tested live (couldn't log in as the account from this session — see below); worth a manual pass.
2. ✅ **CSV export** (done 2026-09-15) — `ExportCsvButton` + `src/lib/csv.ts`, added to Clients, Projects, Tasks, Invoices, Reports.
3. ✅ **Tax set-aside estimator** (done 2026-09-15) — `settings.tax_rate_pct` (migration `0012_tax_rate.sql` — **run this against Supabase manually**, this repo has no migration runner), a rate field in Settings, and a Dashboard "Tax Set-Aside" card (hidden when rate is 0).
4. ✅ **Shareable public invoice link** (done 2026-09-15) — migration `0013_public_invoice_link.sql` (**run this against Supabase manually**) adds `invoices.public_token` and a `get_public_invoice(token)` security-definer function that returns one invoice's display fields for an exact token match — deliberately **not** a broad RLS policy, so no anonymous query can ever list or enumerate other invoices. Public route `/i/:token` (`PublicInvoicePage.tsx`) renders it read-only with a "Pay now" button from the new `settings.payment_url` (global, freelancer sets a Stripe Payment Link / PayPal.me / etc. — no webhook needed). "Copy share link" added to the Invoices row menu. This is the app's first unauthenticated-access surface; reviewed the RLS/function design for enumeration and privilege-escalation risk before committing (see the migration file's comments) — worth a second look from you too given the security stakes.

## P2 — Medium effort, still single-user / no-backend friendly

5. ✅ **Lightweight CRM pipeline on Clients** (done 2026-09-15, migration `0014_client_pipeline.sql` already run) — `clients.pipeline_stage` enum (`lead → contacted → proposal_sent → won → lost`, existing clients backfilled to `won`), a stage badge in the Clients table, and a `Table`/`Pipeline` tab toggle showing a 5-column board (`ClientPipelineBoard`) with a per-card stage dropdown — click-to-change, no `@dnd-kit` added since that felt unnecessary once built.
6. **Proposals** — new `proposals` feature: a lightweight PDF doc (reuse `src/lib/pdf/shared.ts` layout helpers like invoices already do) with a public accept link (same token-route pattern as #4). Accepting can optionally auto-create a Project, closing the "proposal → project → invoice" loop every competitor above leads with.
7. **Calendar view** — month view plotting task due dates, invoice due dates, retainer renewal dates. `date-fns` and `react-day-picker` are already dependencies — no new library needed.

## P3 — Bigger scope, sequence last (evaluate after P1/P2 land)

8. **Contracts + lightweight e-signature** — full legal-grade e-signature (audit trail, identity verification) is out of scope for a backend-less SPA. Pragmatic version: PDF contract + a public accept link that captures a typed name + timestamp + IP as a click-through acceptance record. Good enough for most freelance work; say so explicitly to the user rather than oversell it as DocuSign-equivalent.
9. **Booking/scheduling page** — public `/book/:slug` page showing availability from `settings` and letting a lead request a slot into a new `bookings` table. No emails sent (matches the app's existing no-cron philosophy) — the freelancer just checks the Dashboard for new requests, same as `promoteScheduledInvoices()`/`generateDueRecurringInvoices()` already do lazily on load.
10. **Bundle size** — `vite build` already warns the JS chunk is 1.8MB. Not urgent today, but once P1–P3 add pages, revisit route-level code-splitting (`React.lazy` per page) before it becomes a real problem.

## Explicitly NOT recommended
Full client portal / multi-user roles, live Stripe billing with webhooks, real-time notifications/email — all require a backend server this app deliberately doesn't have. Re-adding any of them contradicts `0011_single_user.sql` and the "no Edge Functions" architecture. If the freelancer's needs outgrow that later, it's a new project decision, not an incremental feature.

## UI/UX bar: "not AI slop", production-ready, responsive

Concrete, checkable rules — not vibes:
- No default shadcn gray-on-gray with a stock purple-to-blue gradient hero. Keep using the existing CSS-variable token system (`bg-card`, `text-muted-foreground`, the `border-l-{color}-500` accent-chip pattern already established on Dashboard stat cards) — consistency across old and new pages matters more than novelty.
- Every new page follows the existing conventions already documented in `CLAUDE.md`: `InfoTooltip` next to the `<h1>`, `DataTable` with `enableHiding: false` on the actions column, dark+light theme from day one (not bolted on after).
- Every new list/table/chart needs real empty, loading, and error states — not a blank screen.
- Test every new page at 400px width (phone), not just desktop — this app already commits to that bar in its own build rules.
- Charts (Insights, Reports, new Dashboard currency chips) go through a single consistent color system, not ad-hoc colors per chart.

## Mapping this plan to your installed skills

| Task | Skill to invoke | Why |
|---|---|---|
| Turn any item above into a precise build spec before coding | `/spec` | Prevents vague-intent drift once you start a phase |
| Get a second opinion on this roadmap itself before committing | `/plan-eng-review`, `/plan-ceo-review`, `/plan-design-review` | Interactive review from different lenses; optional, run if you want pushback before P1 starts |
| Any new chart (currency chips, Insights, calendar heat) | `dataviz` skill | Load before writing chart code — enforces one consistent color system instead of ad-hoc chart colors |
| Visual QA after each phase ships | `design-review` | Finds spacing/hierarchy/AI-slop patterns on the *actual* running app, not a mockup — the right fit since WorkMate already exists (vs. the landing-page-generation skills like `gpt-taste`/`minimalist-ui`, which don't apply here) |
| A broader visual pass later, if the whole app needs a facelift | `redesign-existing-projects` | Audits current design, flags generic AI patterns, upgrades without breaking functionality |
| Every diff before merging | `code-review` | Correctness + reuse/simplification check, matches this repo's own lazy-diff standard |
| Cleanup pass after a phase | `simplify` | Catches leftover complexity once a feature is working |
| Before/after adding public token routes (#4, #6, #9) | `security-review` | Public unauthenticated routes are the one new attack surface this plan introduces — token guessability, RLS on the public read path |
| Click-through test each new page before calling it done | `qa` / `qa-only` | Systematic test pass instead of "looks fine to me" |
| Responsive check at phone width | `claude-in-chrome` (resize + screenshot) | Directly verifies the 400px rule above on the real running app |
| Bundle-size creep as pages get added | `benchmark` | Flags regression before it's a surprise at ship time |
| Cross-session continuity on a multi-week roadmap | `claude-mem` (`mem-search`, already wired globally per your CLAUDE.md) | So a future session doesn't need this whole analysis re-explained |
| Turn this file into a shareable PDF | `make-pdf` | If you ever want to hand this roadmap to someone else to read |

## Suggested order

P0 (today, tiny) → P1 items 1–4 (each is small and independent, ship one at a time) → re-evaluate P2 based on which P1 items you actually use → P3 only if P1/P2 prove the app needs them.
