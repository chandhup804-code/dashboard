-- Sample plans for local dev. Safe to run once.
insert into plans (name, duration_days, price_inr, description) values
  ('Monthly', 30, 1500, 'Full gym access for 30 days'),
  ('Quarterly', 90, 3999, 'Full gym access for 3 months'),
  ('Half-yearly', 180, 6999, 'Full gym access for 6 months + 1 PT session'),
  ('Annual', 365, 11999, 'Full gym access for 12 months + 2 PT sessions');

update gym_settings set gym_name = 'VivekFitness', address = 'Update address in Settings', reminder_days = 3 where id = 1;
-- Members / trainers appear automatically when people sign up through the app.
-- Promote your first owner:  update profiles set role = 'owner' where email = 'you@example.com';
