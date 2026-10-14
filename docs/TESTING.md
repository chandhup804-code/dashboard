# Testing checklist

Use three browser profiles (or one normal + two private windows) so you can stay signed in as member, trainer and owner at once.

## Auth
- [ ] Email sign-up creates a member and lands on onboarding (after email confirmation if enabled)
- [ ] Phone OTP sign-up with a new number creates an account and lands on onboarding
- [ ] Email sign-in link works
- [ ] Wrong password shows "Email or password is incorrect"
- [ ] Member account on `/login/owner` is rejected with a clear message and signed out
- [ ] Trainer and owner pages are unreachable by URL when signed in as a member (redirects to login)
- [ ] Disabled member (Owner > Manage > Disable) cannot sign in

## Member
- [ ] Without an active plan, check-in is blocked with a message
- [ ] After the owner records a payment, plan shows days left and check-in works
- [ ] Double check-in on the same open session is rejected; check-out works
- [ ] Workout and diet assigned by trainer appear
- [ ] Progress entry saves; chart appears with two entries; deleting works
- [ ] Receipt opens and prints / saves as PDF
- [ ] Alerts appear live when the owner runs reminders
- [ ] Online payment with Razorpay test mode activates the plan and creates a receipt

## Trainer
- [ ] Sees only assigned members; cannot open another trainer's member by URL (empty / error)
- [ ] Assigns a workout and a diet plan; member sees them
- [ ] Verifies attendance (single and "Verify all")
- [ ] Cannot see payments or enquiries

## Owner
- [ ] Dashboard stats match data; numbers move live when a member checks in (second window)
- [ ] Create, edit, hide plans; hidden plans disappear for members
- [ ] Record cash/UPI payment: membership extends from the previous end date when renewing early
- [ ] Assign trainer to member; promote/demote staff by email
- [ ] Enquiry from the landing page appears; status change and delete work
- [ ] Attendance report filters by date and exports CSV; payments export CSV
- [ ] Audit log shows plan, payment and role changes
- [ ] Settings save and appear on receipts; "Run reminders now" queues messages

## Security (SQL Editor, "Run as" a user via the API or app)
- [ ] A member cannot update `profiles.role` (error: Only the owner can change role)
- [ ] A member cannot insert into `attendance`, `payments` or `memberships` directly
- [ ] A member cannot select another member's rows
- [ ] Anonymous visitors can only insert enquiries
