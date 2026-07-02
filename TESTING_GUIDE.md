# WorkMate Testing Guide

A plain-language walkthrough for manually testing every feature in WorkMate. Written for support/QA use — no coding knowledge required. Follow each section top to bottom; "Expected result" tells you what should happen if the feature is working.

Tip: Test as an **Owner** account first (full access to everything), then repeat the relevant sections as **Manager**, **Employee**, and **Client Portal** users to confirm permissions are correct.

---

## 1. Sign up & login

1. Go to `/register`, create an account with email + password.
2. Check your email for a confirmation link (if email confirmation is enabled in Supabase).
3. Log in at `/login`.
4. Click "Forgot password" → enter your email → check inbox for reset link → set a new password at `/reset-password`.

**Expected result:** You land on the Dashboard after login. A new account always starts as the **Owner** (full access, no role badge needed).

---

## 2. Dashboard

1. Open `/dashboard`.

**Expected result:** KPI tiles for hours, revenue, and profit; a trend chart; recent tasks list. Numbers should update as you add clients/tasks/invoices in later sections.

---

## 3. Clients

1. Go to **Clients** → "Add Client".
2. Fill in name, email, currency (try a non-USD currency, e.g. EUR), save.
3. Edit the client, change a field, save.
4. Delete a test client you don't need.

**Expected result:** Client appears in the table immediately. Currency you picked shows up correctly formatted later on invoices/reports for that client.

---

## 4. Projects

1. Go to **Projects** → "Add Project", link it to the client from Step 3.
2. Set an hourly rate and currency.
3. Edit and delete a test project.

**Expected result:** Project list shows the linked client name. Hourly rate is used later for invoice/task amount calculations.

---

## 5. Tasks (manual time entry)

1. Go to **Tasks** → "Add Task".
2. Pick the project, enter a start time and end time, mark it **Billable**.
3. Save and confirm the duration shown is `H:MM:SS` (e.g. `2:15:00`), not decimal.
4. Edit a task's duration and confirm the total updates.
5. Delete a test task.

**Expected result:** Duration is always exact to the second. Non-billable tasks should never appear later as invoice candidates (Step 9).

---

## 6. Timer (live time tracking)

1. Go to **Timer**.
2. Type a task name, pick a project, click **Start**.
3. Wait a few seconds, click **Pause**, then **Resume**.
4. Refresh the browser page while the timer is running.
5. Click **Stop**.

**Expected result:**
- Starting the timer immediately creates a row in **Tasks** with that name.
- After refreshing mid-run, the elapsed time keeps counting correctly (it isn't reset to zero).
- Stopping writes the final duration to the task — check **Tasks** to confirm the seconds match what the timer showed.

---

## 7. Timesheet approval (multi-user only)

Requires at least one teammate invited as **Employee** (see Section 13 first).

1. Log in as an Employee, create a task.

**Expected result:** New task is automatically marked `submitted`.

2. Log in as the Owner or a Manager+ teammate, go to **Tasks**, find the submitted task, click **Approve** (or **Reject**).

**Expected result:**
- Approving changes status to `approved`.
- An Employee cannot approve their own task — try it and confirm the action is blocked.
- Only `approved` tasks show up as billable candidates in Step 9 (Invoicing).

---

## 8. Reports

1. Go to **Reports**, pick a date range and optionally filter by client/project.
2. Export the **Report PDF**.

**Expected result:** Table on screen matches the PDF contents. "Total Hours" KPI shows decimal hours (e.g. "12.5h"); per-row durations show `H:MM:SS`. PDF is A4-sized with no overlapping text — long task names wrap onto multiple lines within their column instead of bleeding into the next one.

---

## 9. Invoices (task-based)

1. Make sure you have at least one **billable**, **approved** task on a project that isn't already invoiced.
2. Go to **Invoices** → "New Invoice", pick the client/project and a billing period covering that task's date.
3. Confirm the task appears as a checked line item with the correct amount (`hours × hourly rate`).
4. Uncheck a task, confirm it's excluded; save the invoice.
5. Open the saved invoice and check the date you unchecked is still available for a future invoice (not stuck as billed).
6. Export the **Invoice PDF**.
7. Delete the invoice and confirm the task becomes billable again (its `invoice_id` clears).

**Expected result:** Tasks already linked to an invoice never show up again as candidates on a new invoice for the same period.

---

## 10. Payments, scheduled & recurring invoices (Manager+)

1. Open an invoice, record a **partial payment** (less than the full amount).

**Expected result:** Status becomes `partial`; "Amount Paid" updates. Recording the remaining balance flips status to `paid`.

2. Create a new invoice and set a future **scheduled date** instead of sending immediately.

**Expected result:** Status is `scheduled`. After the scheduled date passes and you reload the Invoices page (or Dashboard), it flips automatically to `sent`. (This only happens when someone loads the app — there's no background server job.)

3. Go to **Recurring Invoices** → create a template (client/project, amount basis, frequency, next run date in the past or today).
4. Reload the Recurring Invoices page or Dashboard.

**Expected result:** A new invoice is generated from the template and the template's `next_run_date` advances to the next cycle.

5. Use the reminder action on an unpaid invoice.

**Expected result:** Opens a pre-filled `mailto:` email — no email is sent by the app itself.

---

## 11. Retainers (Manager+)

1. Go to **Retainers** → create one for a client (monthly fee, included hours, overage rate).
2. Log billable tasks for that client this month totaling more than the included hours.
3. Reopen the retainer.

**Expected result:** Used/remaining/overage hours are calculated live from this month's tasks — there's nothing to "link" manually. Overage hours × overage rate should appear as extra charge.

---

## 12. Expenses (Manager+)

1. Go to **Expenses** → add an expense tied to a client/project, with an amount.
2. Check **Reports** or **Insights** for profit/profit-margin including this expense.

**Expected result:** Profit = revenue − expenses for that client/project.

---

## 13. Multi-user team accounts

1. Go to **Team** → "Invite Member", enter an email, pick a role (Admin / Manager / Employee).
2. Have that person register/log in with the invited email.

**Expected result:** Their invite auto-activates on signup; they land in **your** account (not their own), with nav items filtered by role:
- **Employee:** no Invoices/Retainers/Expenses/Audit Logs/Insights in the sidebar; read-only on Clients/Projects; full access only to tasks/time entries they created.
- **Manager:** sees everything an Owner sees except Team management (if restricted).
- **Admin:** near-Owner-level access.

3. As Employee, try to directly open `/invoices` or `/audit-logs` by typing the URL.

**Expected result:** Page loads but shows no data / an empty or error state — access is enforced by the database, not just the hidden menu link.

---

## 14. Audit logs (Manager+)

1. Make a change to a client, project, task, time entry, invoice, retainer, or expense.
2. Go to **Audit Logs**, search/filter for it.

**Expected result:** A new row appears immediately showing who made the change (`actor_id`) and the before/after values. You should never be able to edit or delete an audit log row.

---

## 15. Business Insights (Manager+)

1. Go to **Insights** (needs some invoiced/paid history to be meaningful).

**Expected result:** Top Clients, Most Profitable Projects, Client Health Score (0–100), Burn Rate, Retention Rate, and a Revenue Forecast all render without errors. Revenue figures here should match the Dashboard — if they disagree, that's a bug.

---

## 16. Client portal

1. Go to **Team** or **Clients** → grant **client portal access** for a client, using an email.
2. Log in (or register) with that email.

**Expected result:** You're routed to `/portal`, a completely separate, simplified layout (no sidebar/nav from the main app). You only see that one client's projects, hours, and invoices.

3. Try downloading an invoice PDF from the portal.
4. If a project has a deliverable awaiting approval, click **Approve**.

**Expected result:** Portal is read-only everywhere except deliverable approval. The client can never edit hourly rates or other sensitive fields — there is no edit form available anywhere in the portal.

---

## 17. Command palette

1. Press `Ctrl+K` (or `Cmd+K` on Mac) from anywhere in the main app.
2. Search for a client, project, task, invoice, or expense by name.
3. Try a quick-create action (e.g. "New Client").

**Expected result:** Results appear as you type; selecting one navigates straight to it. Items respect the same role permissions as the sidebar (e.g. an Employee won't see invoice quick-create).

---

## 18. Settings

1. Go to **Settings**, change any account-level preference available there, save.
2. Reload the page.

**Expected result:** Setting persists after reload.

---

## 19. Dark mode

1. Click the theme toggle in the top bar.
2. Switch between Light / Dark / System.
3. Reload the page.

**Expected result:** Theme choice persists across reloads; all pages remain readable (no invisible text or clashing colors) in both modes.

---

## 20. Multi-currency

1. Confirm clients/projects created with different `currency_code` values (Step 3) each display amounts in their own currency format (symbol + locale grouping) across Tasks, Invoices, Reports, and PDFs.

**Expected result:** No mixing — each client/project's money values always show in the currency you set for it, not a single global currency.

---

## Quick regression checklist (after any code change)

- [ ] Can log in/out
- [ ] Can create a client → project → task → invoice end-to-end
- [ ] Timer starts, survives a refresh, and stops with correct duration
- [ ] Employee-submitted task requires Manager+ approval before it's invoiced
- [ ] Invoiced tasks don't show up again on a new invoice
- [ ] Audit log records a recent change
- [ ] Client portal login only shows that client's data
- [ ] Dark mode toggle still works
