# DUTYLOG AI — Complete Supabase Edition

Daily Duty Report & Institutional Work Journal for Thaiba Garden Group of Institutions.

## What is included

### Frontend
- `index.html` — complete browser application
- `app.js` — authentication, dashboards, reports, staff management, verification and exports
- `style.css` — responsive premium UI
- Google Sign-In through Supabase Auth
- Staff, Joint Director and Admin role-based navigation
- Daily report creation and professional report formatting
- PDF, DOCX and print export
- Staff hierarchy: Department → Position → Reports Under
- Joint Director read-only staff/report view
- Daily, weekly and monthly verification
- Verified reports are locked at database level

### Backend
- `schema.sql` — complete PostgreSQL schema, triggers, RLS and verification RPC
- `admin-users-index.ts` — secure Admin user invitation function
- `supabase-config.toml` — Supabase CLI function configuration

### Deployment helpers
- `vercel.json`
- `.gitignore`
- `.env.example`
- `package.json`

## Supabase project

Project URL:
`https://lksdkaiwvkcvjrfcqcpc.supabase.co`

The browser uses the supplied Supabase publishable key in `app.js`.

**Never put a Supabase service-role/secret key in the frontend.**

## 1. Database setup

Open Supabase → SQL Editor and run the complete `schema.sql` once.

It creates:
- profiles
- departments
- positions
- reports
- period_verifications
- roles
- RLS policies
- profile auto-creation trigger
- verification RPC
- verified-report locking trigger

## 2. Google Sign-In

Supabase → Authentication → Providers → Google → enable it.

Google OAuth authorized redirect URI:

`https://lksdkaiwvkcvjrfcqcpc.supabase.co/auth/v1/callback`

Also configure your application URL under Supabase → Authentication → URL Configuration.

For Google Cloud, add the same Supabase callback URL under the OAuth client's Authorized redirect URIs.

## 3. First Admin

Sign in once with the intended Admin Google account.

Then in Supabase SQL Editor run:

```sql
update public.profiles
set role = 'admin',
    full_name = 'Muhammad Basith Adany'
where email = 'YOUR_ADMIN_GOOGLE_EMAIL';
```

Sign out and sign in again.

## 4. Admin user invitations

The Admin Users screen calls the `admin-users` Supabase Edge Function.

Install/login to the Supabase CLI, then from this repository:

```bash
supabase link --project-ref lksdkaiwvkcvjrfcqcpc
supabase functions deploy admin-users
```

Set the server-side service-role secret:

```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

The service-role key is only used by the Edge Function. Do not put it in GitHub or frontend JavaScript.

The function validates that the caller is an active Admin before inviting users.

## 5. GitHub + Vercel

Upload the entire repository folder to GitHub.

For Vercel:
- Import the GitHub repository.
- No build command is required.
- Output directory is the repository root.
- Deploy.
- Add the Vercel URL to Supabase Authentication → URL Configuration.
- Add the Vercel URL as an Authorized JavaScript origin in Google Cloud if required by your OAuth setup.

## 6. User workflow

### Admin
- Invite users
- Assign Admin / Joint Director / Staff roles
- Activate/deactivate accounts
- Assign department
- Assign position
- Assign manager / reporting line
- Manage departments
- Manage positions
- View institutional reports

### Staff
- Sign in with Google
- Create daily reports
- Edit unverified reports
- Generate professional report text
- Export PDF/DOCX
- View own calendar and history

### Joint Director
- View staff/users
- View department and position information
- View reporting hierarchy
- View reports from all staff
- Verify Daily
- Verify Weekly
- Verify Monthly
- Export verified reports to PDF/DOCX
- Verified reports become locked and cannot be edited

## 7. Verification lock

Verification is enforced in PostgreSQL, not only in the UI.

When a Joint Director verifies a period, matching unverified reports receive:
- `verified_at`
- `verified_by`
- `verification_scope`

A database trigger prevents changes to verified reports.

## 8. Important security note

This project uses Supabase Row Level Security (RLS). Keep RLS enabled.

The Google publishable key may be exposed in browser code; the Supabase service-role key must never be exposed there.

## 9. Local testing

Because this is a static frontend, you can run it with any local HTTP server. For example with VS Code Live Server.

Do not open `index.html` directly with `file://` when testing OAuth.

Use an HTTP origin such as:

`http://localhost:5500`

and add that origin/redirect configuration to Supabase and Google as appropriate.


FLAT GIT PACKAGE
All files are intentionally in the repository root. The Admin Edge Function source is admin-users-index.ts; deploy its contents as the Supabase Edge Function named admin-users.
