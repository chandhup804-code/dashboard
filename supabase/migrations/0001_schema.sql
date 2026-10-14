-- VivekFitness schema. Run migrations in order (0001 -> 0004).
create extension if not exists pgcrypto;

create type user_role as enum ('member', 'trainer', 'owner');
create type membership_status as enum ('active', 'expired', 'cancelled');
create type payment_status as enum ('pending', 'paid', 'failed', 'refunded');
create type payment_method as enum ('cash', 'upi', 'card', 'online', 'bank');
create type lead_status as enum ('new', 'contacted', 'trial', 'converted', 'lost');

-- India time helpers -------------------------------------------------------
create or replace function ist_today() returns date
language sql stable as $$ select (now() at time zone 'Asia/Kolkata')::date $$;

-- Tables -------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'member',
  full_name text not null default '',
  email text,
  phone text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index profiles_phone_key on profiles(phone) where phone is not null and phone <> '';
create index profiles_role_idx on profiles(role);

create table members (
  profile_id uuid primary key references profiles(id) on delete cascade,
  trainer_id uuid references profiles(id) on delete set null,
  member_code text unique,
  dob date,
  gender text check (gender in ('male','female','other')),
  height_cm numeric(5,1),
  goal text,
  emergency_contact text,
  join_date date not null default ist_today(),
  created_at timestamptz not null default now()
);
create index members_trainer_idx on members(trainer_id);

create sequence member_code_seq start 1001;
create sequence invoice_no_seq start 1001;

create table plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  duration_days int not null check (duration_days > 0),
  price_inr numeric(10,2) not null check (price_inr >= 0),
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table memberships (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(profile_id) on delete cascade,
  plan_id uuid not null references plans(id),
  start_date date not null,
  end_date date not null,
  status membership_status not null default 'active',
  created_at timestamptz not null default now()
);
create index memberships_member_idx on memberships(member_id, end_date desc);

create table payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(profile_id) on delete cascade,
  plan_id uuid references plans(id),
  membership_id uuid references memberships(id) on delete set null,
  amount_inr numeric(10,2) not null check (amount_inr >= 0),
  method payment_method not null,
  status payment_status not null default 'pending',
  invoice_no text unique,
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  notes text,
  paid_at timestamptz,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index payments_member_idx on payments(member_id, created_at desc);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(profile_id) on delete cascade,
  day date not null default ist_today(),
  check_in timestamptz not null default now(),
  check_out timestamptz,
  verified_by uuid references profiles(id),
  verified_at timestamptz
);
create index attendance_member_day_idx on attendance(member_id, day desc);
create index attendance_day_idx on attendance(day desc);
-- one open session per member per day
create unique index attendance_one_open on attendance(member_id, day) where check_out is null;

create table workout_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(profile_id) on delete cascade,
  assigned_by uuid not null references profiles(id),
  title text not null,
  day_label text not null default 'Daily',
  exercises jsonb not null default '[]'::jsonb, -- [{name, sets, reps, rest_sec, notes}]
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index workout_member_idx on workout_plans(member_id, active);

create table diet_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(profile_id) on delete cascade,
  assigned_by uuid not null references profiles(id),
  title text not null,
  calories int,
  meals jsonb not null default '[]'::jsonb, -- [{name, time, items}]
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index diet_member_idx on diet_plans(member_id, active);

create table progress_logs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(profile_id) on delete cascade,
  logged_on date not null default ist_today(),
  weight_kg numeric(5,1),
  body_fat_pct numeric(4,1),
  chest_cm numeric(5,1),
  waist_cm numeric(5,1),
  notes text,
  logged_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index progress_member_idx on progress_logs(member_id, logged_on desc);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  kind text not null default 'info',
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on notifications(user_id, created_at desc);

create table enquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  email text,
  interest text,
  source text default 'walk-in',
  status lead_status not null default 'new',
  notes text,
  assigned_to uuid references profiles(id),
  created_at timestamptz not null default now()
);

-- Outbound email / WhatsApp queue, drained by the process-queue edge function
create table message_queue (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  recipient text not null,
  subject text,
  body text not null,
  status text not null default 'pending' check (status in ('pending','sent','failed')),
  error text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index message_queue_pending_idx on message_queue(status, created_at) where status = 'pending';

create table audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid,
  action text not null,
  table_name text not null,
  row_id text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index audit_created_idx on audit_logs(created_at desc);

create table gym_settings (
  id int primary key default 1 check (id = 1),
  gym_name text not null default 'VivekFitness',
  address text,
  phone text,
  email text,
  gstin text,
  reminder_days int not null default 3
);
insert into gym_settings (id) values (1);
