# VivekFitness

Gym management and member fitness platform for small and medium gyms in India.
React + TypeScript + Vite, Tailwind, Supabase (Postgres, Auth, Edge Functions), Recharts, React Hook Form + Zod.

Three separate logins, one app:

| Portal | URL | Who | What |
|---|---|---|---|
| Member | `/login/member`, `/signup` | Gym members (self sign-up) | Check-in, workouts, diet, progress, payments, receipts, alerts |
| Trainer | `/login/trainer` | Staff enabled by the owner | Assigned members, assign workouts/diet, verify attendance |
| Owner | `/login/owner` | Gym owner | Live dashboard, members, plans, payments, invoices, attendance reports, enquiries, staff, audit log, reminders |

New members can create an account with **email + password**, an **email sign-in link**, or **phone OTP**. Roles are never chosen by the user: every new account is a `member`; only an owner can promote someone to trainer/owner (enforced in the database).

## Folder structure

```
vivekfitness/
  index.html, vite.config.ts, tailwind.config.js, vercel.json, .env.example
  public/images/            optional: login-hero.jpg (your gym photo / AI image), logo overrides
  src/
    main.tsx, App.tsx       routes + role-based navigation
    auth/                   AuthProvider, RequireRole / NeedsOnboarding guards
    components/             ui kit, Shell (sidebar + mobile nav), Brand, GymArt, Receipt, CheckInButton
    lib/                    supabase client, formatting (INR, IST), types, helpers
    pages/
      Landing.tsx, AuthPage.tsx
      member/  trainer/  owner/
  supabase/
    migrations/0001_schema.sql   tables
    migrations/0002_functions.sql triggers, role helpers, check-in, payments, automation
    migrations/0003_rls.sql      row level security policies
    migrations/0004_audit.sql    audit triggers, realtime
    seed.sql                     sample plans for local dev
    functions/razorpay-order, razorpay-webhook, process-queue
  docs/                     SETUP.md, TESTING.md, TROUBLESHOOTING.md
```

## Quick start (Windows + VS Code)

1. Install **Node.js 20 LTS** from nodejs.org and **VS Code**. Optional: Git for Windows.
2. Unzip, then in VS Code: File > Open Folder > `vivekfitness`. Accept the recommended extensions.
3. Open the terminal (Ctrl+`) and run:
   ```powershell
   npm install
   copy .env.example .env.local
   ```
4. Create a Supabase project, fill `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env.local` (Project Settings > API).
5. In the Supabase SQL Editor run, in order: `0001_schema.sql`, `0002_functions.sql`, `0003_rls.sql`, `0004_audit.sql`, then `seed.sql`.
6. `npm run dev` and open http://localhost:5173.
7. Sign up as a member, then make yourself the owner (SQL Editor):
   ```sql
   update profiles set role = 'owner' where email = 'you@example.com';
   ```
   Sign in at `/login/owner`.

Full production setup (auth providers, phone OTP, Vercel, Razorpay, email, WhatsApp, scheduling): see `docs/SETUP.md`.

## Notes

- All dates use Asia/Kolkata, money uses INR (`Intl.NumberFormat("en-IN")`).
- Every table has RLS. Members can only read their own data; trainers only their assigned members; owners everything. Attendance, payments and memberships are written only through security-definer functions.
- Audit logs are written by database triggers; clients cannot write or edit them.
- Login imagery is built-in SVG equipment art. To use real photos, add `public/images/login-hero.jpg`.
