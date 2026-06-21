# Deploying WorkMate

## 1. Supabase project setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open the SQL editor and run `supabase/migrations/0001_init.sql`. This creates all tables, enums, RLS policies, triggers, and the `attachments` storage bucket. If you already had a project from before per-second billing was added, also run `0002_per_second_billing.sql` to migrate it in place (`0001` alone is for brand-new projects only).
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
