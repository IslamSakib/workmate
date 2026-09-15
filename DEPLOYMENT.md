# Deploying WorkMate

## 1. Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run every file in `supabase/migrations/` **in numeric order**, `0001` through the highest-numbered file. `0001_init.sql` creates the base tables/enums/RLS/triggers and the `attachments` storage bucket; every later file is an additive, idempotent upgrade (safe to run even if some already partially applied) adding one feature each — per-second billing, retainers, expenses, advanced invoicing, and (in `0011`) reverting the app back down to single-user RLS. For a brand-new project, running all of them once gets you the current schema; for an existing project, just run whichever ones you haven't applied yet.
3. In **Project Settings → API**, copy the **Project URL** and **anon public key**.
4. In **Authentication → URL Configuration**, set the Site URL to your production domain and add `https://yourdomain.com/reset-password` as a redirect URL (needed for the forgot-password flow).

## 2. Environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Vite inlines `VITE_*` variables at build time — there is no server-side env handling on static hosting, so rebuild whenever these change.

## 3. Build

```bash
npm install
npm run build
```

This produces a static `dist/` folder (HTML/CSS/JS only — no Node server required).

## 4. Upload to Hostinger shared hosting

1. In hPanel, open **File Manager** (or use an FTP client/SFTP).
2. Upload the **contents** of `dist/` (not the folder itself) into `public_html/` (or a subfolder if deploying to a subdirectory).
3. Ensure the `.htaccess` file (already included in `public/`, so it ends up in `dist/`) is uploaded too — it rewrites all unmatched routes to `index.html` so React Router's client-side routes (`/dashboard`, `/clients`, etc.) work on full page loads/refreshes instead of 404ing.
4. If deploying under a subdirectory (e.g. `yourdomain.com/app/`), no extra Vite config is needed since the app uses root-relative asset paths by default; just confirm the `.htaccess` rewrite rule still resolves correctly for that path.

## 5. HTTPS

Enable Hostinger's free SSL (Let's Encrypt) for the domain — Supabase Auth requires HTTPS in production for secure cookie/session handling.

## 6. Redeploying after changes

Each deploy is just: `npm run build` → re-upload the new `dist/` contents, overwriting the old ones.

## 7. Keeping a free-tier Supabase project from pausing

Supabase's free plan auto-pauses a project after 7 days with zero API traffic; restoring it from the dashboard is free, just manual. `.github/workflows/keep-supabase-alive.yml` pings the project's REST endpoint every 2 days via a scheduled GitHub Action so it never goes idle long enough to pause — no Pro plan needed. It uses the anon/publishable key inline (safe to expose; it's already public in the app's JS bundle) and needs no secrets configured. If you rotate the Supabase project (new URL/key), update the `SUPABASE_URL`/`SUPABASE_ANON_KEY` values in that workflow file to match.
