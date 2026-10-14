# Setup guide

## 1. Supabase project

1. supabase.com > New project (choose the Mumbai region for India). Save the database password.
2. **Project Settings > API**: copy Project URL and `anon` key into `.env.local`.
3. **SQL Editor**: run `0001` to `0004` in order, then `seed.sql`.
4. **Authentication > URL Configuration**
   - Site URL: your Vercel URL (use `http://localhost:5173` while developing)
   - Redirect URLs: add `http://localhost:5173/**` and `https://YOUR-APP.vercel.app/**`
5. **Authentication > Providers > Email**: enabled. Recommended: "Confirm email" ON, minimum password length 8.
6. **Authentication > SMTP Settings**: the built-in mailer is heavily rate limited. For a live gym, set custom SMTP (Resend, Brevo or Amazon SES).

## 2. Phone OTP (India)

1. **Authentication > Providers > Phone**: enable it and choose an SMS provider (Twilio, MessageBird, Vonage, or Twilio Verify).
2. India requires **DLT registration** for SMS. Twilio's India route needs a registered sender ID and approved template; use a Twilio Verify service to avoid managing templates yourself. Start with Supabase test numbers while developing (Phone provider settings > Test phone numbers).
3. The app sends numbers as `+91XXXXXXXXXX`. Phone sign-ups create an account automatically; the member then completes a short onboarding form.

## 3. Make the first owner

Sign up through the app, then in the SQL Editor:
```sql
update profiles set role = 'owner' where email = 'you@example.com';
```
For a phone-only owner use `where phone = '919876543210'` (no plus sign).

Add trainers: they sign up from `/signup`, then you open **Owner > Staff** and enter their email with role Trainer. Assign members to trainers from **Owner > Members > Manage**.

## 4. Edge Functions (payments + messages)

Install the Supabase CLI (Windows: `scoop install supabase`, or `npx supabase`). Then:
```powershell
supabase login
supabase link --project-ref YOUR-PROJECT-REF
supabase secrets set RAZORPAY_KEY_ID=... RAZORPAY_KEY_SECRET=... RAZORPAY_WEBHOOK_SECRET=... RESEND_API_KEY=... EMAIL_FROM="VivekFitness <no-reply@yourdomain.com>" WHATSAPP_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=... CRON_SECRET=...
supabase functions deploy razorpay-order
supabase functions deploy razorpay-webhook --no-verify-jwt
supabase functions deploy process-queue --no-verify-jwt
```

### Razorpay (online payments)
1. Create a Razorpay account, copy test keys (Settings > API Keys).
2. Put `VITE_RAZORPAY_KEY_ID` in `.env.local` / Vercel, and the key id + secret in Supabase secrets.
3. Razorpay Dashboard > Webhooks > Add: URL `https://YOUR-PROJECT-REF.supabase.co/functions/v1/razorpay-webhook`, events `payment.captured` and `order.paid`, set a secret and save it as `RAZORPAY_WEBHOOK_SECRET`.
4. Flow: member taps Pay online > `razorpay-order` creates the order and a pending payment > Razorpay checkout > webhook verifies the signature and activates the plan, creates the invoice number and sends an in-app alert. The webhook is idempotent, so retries are safe.
5. Switch to live keys only after a successful test payment (use Razorpay test UPI `success@razorpay`).

### Email (Resend)
Verify your domain in Resend, create an API key, set `RESEND_API_KEY` and `EMAIL_FROM`.

### WhatsApp (Meta Cloud API)
1. Meta Business Manager > WhatsApp > create an app, add a phone number, get a permanent access token and the phone number ID.
2. Create a message template named `membership_reminder` (category Utility) with one body variable, e.g. `{{1}}`, and wait for approval. Messages outside the 24-hour window must use an approved template.
3. Set `WHATSAPP_TOKEN` and `WHATSAPP_PHONE_NUMBER_ID`.

### Daily automation
`run_daily_automation()` expires finished memberships and queues reminder emails/WhatsApp messages plus in-app alerts. `process-queue` runs it and then sends the queue. Schedule one call per day (07:00 IST) with any scheduler:

- cron-job.org or GitHub Actions: `POST https://YOUR-PROJECT-REF.supabase.co/functions/v1/process-queue` with header `x-cron-secret: YOUR_CRON_SECRET`
- or Supabase pg_cron: enable the extension, then `select cron.schedule('vf-daily','30 1 * * *',$$select run_daily_automation()$$);` (queues messages; still call `process-queue` to send them).

You can also press **Owner > Settings > Run reminders now** to test.

## 5. Deploy the frontend to Vercel

1. Push the folder to a GitHub repository (`git init`, commit, push).
2. vercel.com > Add New Project > import the repo. Framework preset: **Vite** (build `npm run build`, output `dist`).
3. Environment Variables (Production and Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_RAZORPAY_KEY_ID`, `VITE_GYM_NAME`.
4. Deploy. Then add the Vercel URL to Supabase Auth Redirect URLs and Site URL.
5. `vercel.json` already rewrites all routes to `index.html` so deep links such as `/owner/members` work on refresh.

## 6. Production checks

- [ ] RLS enabled on every table (Table Editor shows a lock; or run `select tablename from pg_tables where schemaname='public' and not rowsecurity;` and expect zero rows)
- [ ] Service-role key exists only in Supabase secrets, never in Vercel or the repo
- [ ] Custom SMTP set, "Confirm email" on, password minimum 8
- [ ] Razorpay live keys + webhook secret set; one real small payment tested and refunded
- [ ] Daily scheduler running; `process-queue` returns `{sent, failed}`
- [ ] Supabase backups enabled (Pro plan has daily backups; on Free export regularly)
- [ ] Owner account uses a strong password; second owner added as backup
