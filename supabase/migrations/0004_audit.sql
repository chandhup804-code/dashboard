-- Audit trail: every insert/update/delete on sensitive tables is recorded. Clients cannot write to audit_logs.
create or replace function audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare rid text;
begin
  if tg_op = 'DELETE' then rid := coalesce(to_jsonb(old)->>'id', to_jsonb(old)->>'profile_id');
  else rid := coalesce(to_jsonb(new)->>'id', to_jsonb(new)->>'profile_id'); end if;
  insert into audit_logs (actor_id, action, table_name, row_id, old_data, new_data)
  values (auth.uid(), tg_op, tg_table_name, rid,
          case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
          case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end);
  return null;
end $$;

create trigger audit_profiles after insert or update or delete on profiles for each row execute function audit_trigger();
create trigger audit_members after update or delete on members for each row execute function audit_trigger();
create trigger audit_plans after insert or update or delete on plans for each row execute function audit_trigger();
create trigger audit_memberships after insert or update or delete on memberships for each row execute function audit_trigger();
create trigger audit_payments after insert or update or delete on payments for each row execute function audit_trigger();
create trigger audit_attendance after update or delete on attendance for each row execute function audit_trigger();
create trigger audit_enquiries after update or delete on enquiries for each row execute function audit_trigger();
create trigger audit_settings after update on gym_settings for each row execute function audit_trigger();

-- Realtime for the owner dashboard (RLS still applies to what each subscriber receives)
alter publication supabase_realtime add table attendance, payments, enquiries, notifications;

-- Optional: daily automation at 07:00 IST (01:30 UTC). Enable pg_cron in Dashboard > Database > Extensions first.
-- select cron.schedule('vf-daily', '30 1 * * *', $$select run_daily_automation()$$);
