-- Role helpers (security definer so RLS policies can call them without recursion)
create or replace function auth_role() returns user_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

create or replace function is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() = 'owner', false)
$$;

create or replace function is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(auth_role() in ('owner','trainer'), false)
$$;

create or replace function is_trainer_of(m uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from members where profile_id = m and trainer_id = auth.uid())
    and coalesce(auth_role() = 'trainer', false)
$$;

-- New auth user -> profile (+ member row). Role is ALWAYS member here; never read from client metadata.
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, role, full_name, email, phone)
  values (
    new.id, 'member',
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    nullif(new.phone, '')
  );
  insert into members (profile_id, member_code)
  values (new.id, 'VF' || nextval('member_code_seq'));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users for each row execute function handle_new_user();

-- Keep profile email/phone in sync with auth.users
create or replace function sync_user_contact() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set email = new.email, phone = nullif(new.phone, '') where id = new.id;
  return new;
end $$;
create trigger on_auth_user_updated
  after update of email, phone on auth.users for each row execute function sync_user_contact();

-- Block privilege escalation on profiles / members
create or replace function guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_owner() then
    if new.role is distinct from old.role or new.active is distinct from old.active then
      raise exception 'Only the owner can change role or active status';
    end if;
  end if;
  return new;
end $$;
create trigger guard_profile before update on profiles
  for each row execute function guard_profile_update();

create or replace function guard_member_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not is_owner() then
    if new.trainer_id is distinct from old.trainer_id or new.member_code is distinct from old.member_code then
      raise exception 'Only the owner can change trainer or member code';
    end if;
  end if;
  return new;
end $$;
create trigger guard_member before update on members
  for each row execute function guard_member_update();

-- Owner promotes a registered user to trainer/owner/member by email
create or replace function set_user_role(target_email text, new_role user_role) returns void
language plpgsql security definer set search_path = public as $$
declare t uuid;
begin
  if not is_owner() then raise exception 'Not allowed'; end if;
  select id into t from profiles where lower(email) = lower(target_email);
  if t is null then raise exception 'No user with that email. Ask them to sign up first.'; end if;
  if t = auth.uid() and new_role <> 'owner' then raise exception 'You cannot demote yourself'; end if;
  update profiles set role = new_role where id = t;
end $$;

-- Member check-in / check-out (requires an active membership)
create or replace function check_in() returns uuid
language plpgsql security definer set search_path = public as $$
declare rid uuid;
begin
  if auth_role() <> 'member' then raise exception 'Members only'; end if;
  if not exists (select 1 from memberships where member_id = auth.uid()
                 and status = 'active' and ist_today() between start_date and end_date) then
    raise exception 'No active membership. Please renew your plan.';
  end if;
  insert into attendance (member_id) values (auth.uid()) returning id into rid;
  return rid;
exception when unique_violation then
  raise exception 'You are already checked in today';
end $$;

create or replace function check_out() returns void
language plpgsql security definer set search_path = public as $$
begin
  update attendance set check_out = now()
  where member_id = auth.uid() and day = ist_today() and check_out is null;
  if not found then raise exception 'No open check-in found'; end if;
end $$;

-- Trainer / owner verifies attendance
create or replace function verify_attendance(att_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare m uuid;
begin
  select member_id into m from attendance where id = att_id;
  if m is null then raise exception 'Not found'; end if;
  if not (is_owner() or is_trainer_of(m)) then raise exception 'Not allowed'; end if;
  update attendance set verified_by = auth.uid(), verified_at = now() where id = att_id;
end $$;

-- Activate a plan for a member and record the payment (offline by staff, or online by webhook)
create or replace function _activate_membership(p_member uuid, p_plan uuid, p_amount numeric,
  p_method payment_method, p_payment uuid, p_by uuid, p_order text default null, p_rzp_payment text default null, p_notes text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare pl plans%rowtype; start_d date; mid uuid; pid uuid; last_end date;
begin
  select * into pl from plans where id = p_plan and active;
  if not found then raise exception 'Plan not found or inactive'; end if;
  select max(end_date) into last_end from memberships
    where member_id = p_member and status = 'active' and end_date >= ist_today();
  start_d := coalesce(last_end + 1, ist_today());
  insert into memberships (member_id, plan_id, start_date, end_date)
    values (p_member, p_plan, start_d, start_d + pl.duration_days - 1) returning id into mid;

  if p_payment is not null then
    update payments set status = 'paid', paid_at = now(), membership_id = mid,
      invoice_no = coalesce(invoice_no, 'VF-' || to_char(ist_today(), 'YYYY') || '-' || nextval('invoice_no_seq')),
      razorpay_payment_id = coalesce(p_rzp_payment, razorpay_payment_id)
    where id = p_payment returning id into pid;
  else
    insert into payments (member_id, plan_id, membership_id, amount_inr, method, status, invoice_no, paid_at, created_by, notes, razorpay_order_id, razorpay_payment_id)
    values (p_member, p_plan, mid, p_amount, p_method, 'paid',
      'VF-' || to_char(ist_today(), 'YYYY') || '-' || nextval('invoice_no_seq'), now(), p_by, p_notes, p_order, p_rzp_payment)
    returning id into pid;
  end if;

  insert into notifications (user_id, title, body, kind)
  values (p_member, 'Membership activated',
    pl.name || ' is active until ' || to_char(start_d + pl.duration_days - 1, 'DD Mon YYYY') || '. Receipt available in Payments.', 'payment');
  return pid;
end $$;
revoke all on function _activate_membership from public, anon, authenticated;

create or replace function record_payment(p_member uuid, p_plan uuid, p_amount numeric, p_method payment_method, p_notes text default null)
returns uuid
language plpgsql security definer set search_path = public as $$
begin
  if not is_owner() then raise exception 'Not allowed'; end if;
  if p_method = 'online' then raise exception 'Online payments are recorded automatically'; end if;
  return _activate_membership(p_member, p_plan, p_amount, p_method, null, auth.uid(), null, null, p_notes);
end $$;

-- Called only by the razorpay-webhook edge function (service role)
create or replace function complete_online_payment(p_order text, p_rzp_payment text) returns void
language plpgsql security definer set search_path = public as $$
declare pay payments%rowtype;
begin
  select * into pay from payments where razorpay_order_id = p_order for update;
  if not found then raise exception 'Unknown order'; end if;
  if pay.status = 'paid' then return; end if; -- idempotent
  perform _activate_membership(pay.member_id, pay.plan_id, pay.amount_inr, 'online', pay.id, null, p_order, p_rzp_payment);
end $$;
revoke all on function complete_online_payment from public, anon, authenticated;
grant execute on function complete_online_payment to service_role;

-- Dashboard stats for owner (single round-trip)
create or replace function owner_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare r jsonb;
begin
  if not is_owner() then raise exception 'Not allowed'; end if;
  select jsonb_build_object(
    'total_members', (select count(*) from profiles where role='member' and active),
    'active_members', (select count(distinct member_id) from memberships where status='active' and ist_today() between start_date and end_date),
    'expiring_soon', (select count(distinct member_id) from memberships where status='active' and end_date between ist_today() and ist_today()+7),
    'checked_in_today', (select count(*) from attendance where day = ist_today()),
    'revenue_month', (select coalesce(sum(amount_inr),0) from payments where status='paid' and date_trunc('month', paid_at at time zone 'Asia/Kolkata') = date_trunc('month', now() at time zone 'Asia/Kolkata')),
    'new_leads', (select count(*) from enquiries where status='new'),
    'pending_payments', (select count(*) from payments where status='pending' and created_at > now() - interval '2 days')
  ) into r;
  return r;
end $$;

-- Daily automation: expire memberships, remind members, queue email/WhatsApp
create or replace function run_daily_automation() returns int
language plpgsql security definer set search_path = public as $$
declare n int := 0; rd int; r record;
begin
  if auth.uid() is not null and not is_owner() then raise exception 'Not allowed'; end if;
  select reminder_days into rd from gym_settings where id = 1;

  update memberships set status = 'expired' where status = 'active' and end_date < ist_today();

  for r in
    select m.member_id, m.end_date, p.full_name, p.email, p.phone
    from memberships m join profiles p on p.id = m.member_id
    where m.status = 'active' and m.end_date between ist_today() and ist_today() + rd
      and not exists (select 1 from notifications x where x.user_id = m.member_id
        and x.kind = 'reminder' and x.created_at::date = now()::date)
  loop
    insert into notifications (user_id, title, body, kind)
    values (r.member_id, 'Membership expiring soon',
      'Your membership ends on ' || to_char(r.end_date, 'DD Mon YYYY') || '. Renew to keep training without a break.', 'reminder');
    if r.email is not null then
      insert into message_queue (user_id, channel, recipient, subject, body)
      values (r.member_id, 'email', r.email, 'Your VivekFitness membership is expiring',
        'Hi ' || coalesce(nullif(r.full_name,''),'there') || ', your membership ends on ' || to_char(r.end_date, 'DD Mon YYYY') || '. Renew from the app or at the front desk.');
    end if;
    if r.phone is not null then
      insert into message_queue (user_id, channel, recipient, body)
      values (r.member_id, 'whatsapp', r.phone,
        'Hi ' || coalesce(nullif(r.full_name,''),'there') || ', your VivekFitness membership ends on ' || to_char(r.end_date, 'DD Mon YYYY') || '. Renew in the app or at the desk.');
    end if;
    n := n + 1;
  end loop;
  return n;
end $$;
