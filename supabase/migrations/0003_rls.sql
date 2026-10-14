-- Row Level Security. Everything denied by default; policies open only what each role needs.
alter table profiles enable row level security;
alter table members enable row level security;
alter table plans enable row level security;
alter table memberships enable row level security;
alter table payments enable row level security;
alter table attendance enable row level security;
alter table workout_plans enable row level security;
alter table diet_plans enable row level security;
alter table progress_logs enable row level security;
alter table notifications enable row level security;
alter table enquiries enable row level security;
alter table message_queue enable row level security;
alter table audit_logs enable row level security;
alter table gym_settings enable row level security;

-- profiles
create policy profiles_self_read on profiles for select using (id = auth.uid());
create policy profiles_owner_all on profiles for all using (is_owner()) with check (is_owner());
create policy profiles_trainer_read on profiles for select using (is_trainer_of(id));
create policy profiles_self_update on profiles for update using (id = auth.uid()) with check (id = auth.uid());
-- staff names visible to members (so they can see their trainer)
create policy profiles_trainer_visible on profiles for select using (
  role = 'trainer' and exists (select 1 from members where profile_id = auth.uid() and trainer_id = profiles.id));

-- members
create policy members_self on members for select using (profile_id = auth.uid());
create policy members_self_update on members for update using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy members_trainer on members for select using (trainer_id = auth.uid() and auth_role() = 'trainer');
create policy members_owner on members for all using (is_owner()) with check (is_owner());

-- plans
create policy plans_read on plans for select using (auth.uid() is not null and (active or is_owner()));
create policy plans_owner on plans for all using (is_owner()) with check (is_owner());

-- memberships (writes only through security-definer functions)
create policy memberships_self on memberships for select using (member_id = auth.uid());
create policy memberships_trainer on memberships for select using (is_trainer_of(member_id));
create policy memberships_owner on memberships for all using (is_owner()) with check (is_owner());

-- payments
create policy payments_self on payments for select using (member_id = auth.uid());
create policy payments_owner on payments for all using (is_owner()) with check (is_owner());

-- attendance (members create via check_in())
create policy attendance_self on attendance for select using (member_id = auth.uid());
create policy attendance_trainer on attendance for select using (is_trainer_of(member_id));
create policy attendance_owner on attendance for all using (is_owner()) with check (is_owner());

-- workouts & diets
create policy workout_self on workout_plans for select using (member_id = auth.uid());
create policy workout_trainer on workout_plans for all
  using (is_trainer_of(member_id)) with check (is_trainer_of(member_id) and assigned_by = auth.uid());
create policy workout_owner on workout_plans for all using (is_owner()) with check (is_owner());

create policy diet_self on diet_plans for select using (member_id = auth.uid());
create policy diet_trainer on diet_plans for all
  using (is_trainer_of(member_id)) with check (is_trainer_of(member_id) and assigned_by = auth.uid());
create policy diet_owner on diet_plans for all using (is_owner()) with check (is_owner());

-- progress
create policy progress_self_read on progress_logs for select using (member_id = auth.uid());
create policy progress_self_insert on progress_logs for insert with check (member_id = auth.uid() and logged_by = auth.uid());
create policy progress_self_delete on progress_logs for delete using (member_id = auth.uid() and logged_by = auth.uid());
create policy progress_trainer on progress_logs for all
  using (is_trainer_of(member_id)) with check (is_trainer_of(member_id) and logged_by = auth.uid());
create policy progress_owner on progress_logs for all using (is_owner()) with check (is_owner());

-- notifications
create policy notif_self_read on notifications for select using (user_id = auth.uid());
create policy notif_self_update on notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notif_staff_insert on notifications for insert with check (is_staff());
create policy notif_owner_all on notifications for all using (is_owner()) with check (is_owner());

-- enquiries: website/walk-in form can insert anonymously; staff manage
create policy enquiries_public_insert on enquiries for insert to anon, authenticated
  with check (status = 'new' and assigned_to is null and char_length(name) between 2 and 100 and char_length(phone) between 8 and 20);
create policy enquiries_staff_read on enquiries for select using (is_staff());
create policy enquiries_staff_update on enquiries for update using (is_staff()) with check (is_staff());
create policy enquiries_owner_delete on enquiries for delete using (is_owner());

-- message queue, audit log, settings
create policy mq_owner on message_queue for select using (is_owner());
create policy audit_owner on audit_logs for select using (is_owner());
create policy settings_read on gym_settings for select using (auth.uid() is not null);
create policy settings_owner on gym_settings for update using (is_owner()) with check (is_owner());

-- Members have no insert/update/delete policy on attendance, so writes happen only through check_in()/check_out().
revoke execute on function check_in, check_out, verify_attendance, set_user_role, record_payment, owner_stats, run_daily_automation from public, anon;
grant execute on function check_in, check_out, verify_attendance, set_user_role, record_payment, owner_stats, run_daily_automation to authenticated;
