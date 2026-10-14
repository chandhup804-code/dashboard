# Troubleshooting

**Blank page or "Setup needed"**: `.env.local` is missing or the dev server was not restarted. Keys must start with `VITE_`. On Vercel, add variables and redeploy.

**`npm install` fails on Windows**: use Node 20 LTS, close VS Code terminals, delete `node_modules` and `package-lock.json`, run `npm install` again. If PowerShell blocks scripts: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

**Sign-in works but I am sent back to login**: the account role does not match the portal. Check `select email, role, active from profiles;`.

**New user has no profile row**: migration `0002_functions.sql` (trigger `on_auth_user_created`) was not run. Run it, then insert the missing rows manually or delete and recreate the user.

**"Signups not allowed for otp" on phone login**: the number has no account and you are on the trainer/owner portal. Members create accounts from `/signup`.

**No OTP SMS arrives (India)**: Phone provider not enabled, provider credits empty, or DLT registration not complete. Test with Supabase test phone numbers first. Twilio Verify is the simplest production route.

**Confirmation email never arrives**: the built-in Supabase mailer is rate limited. Configure custom SMTP and check spam.

**"new row violates row-level security policy"**: the signed-in role is not allowed to write that table. Writes to attendance, memberships and payments go through functions (`check_in`, `record_payment`). Re-run `0003_rls.sql` if policies are missing.

**"function ... does not exist" / permission denied for function**: re-run `0002_functions.sql` and the final grant lines in `0003_rls.sql`. After changing functions, Supabase may need ~10 seconds to refresh its schema cache.

**Check-in says "No active membership"**: record a payment for the member (Owner > Members > Manage) or have them pay online. Membership dates use India time.

**Razorpay window does not open**: ad blocker, or `VITE_RAZORPAY_KEY_ID` missing. The function `razorpay-order` must be deployed and secrets set (`supabase secrets list`).

**Payment succeeded but plan not active**: the webhook did not run. Check Razorpay Dashboard > Webhooks > recent deliveries; confirm URL, secret and that the function was deployed with `--no-verify-jwt`. Re-send the event; the handler is idempotent.

**Reminders not sending**: messages sit in `message_queue`. Check Owner > Settings counters, then the `process-queue` logs (Supabase Dashboard > Edge Functions > Logs). WhatsApp needs an approved template named `membership_reminder`.

**Realtime dashboard does not update**: confirm `0004_audit.sql` ran (adds tables to the `supabase_realtime` publication) and Realtime is enabled for the project.

**Vercel 404 on refresh**: ensure `vercel.json` is in the repo root.

**Receipt prints blank**: use the browser's print dialog and enable background graphics; the receipt prints in black on white.
