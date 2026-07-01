insert into public.r_values (key, name, description, locked, sort_order) values
  ('righteousness', 'Righteousness', 'Living with moral courage and Islamic character', true, 1),
  ('responsibility', 'Responsibility', 'Taking ownership, initiative, and care', true, 2),
  ('respect', 'Respect', 'Honoring people, places, and community expectations', true, 3)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  locked = excluded.locked,
  sort_order = excluded.sort_order;

insert into public.domains (key, name, description, locked, is_active, sort_order) values
  ('washrooms', 'Washrooms', 'Adab, privacy, cleanliness, and safe use of washroom spaces', true, true, 1),
  ('hallways_transition', 'Hallways and Transition', 'Movement, line culture, quiet voices, and safe transitions', true, true, 2),
  ('prayer_space', 'Prayer Space', 'Salah adab, wudu readiness, stillness, and sacred space respect', true, true, 3),
  ('classrooms', 'Classrooms', 'Learning behaviours, responsibility, participation, and peer respect', true, true, 4),
  ('lunch_recess', 'Lunch/Recess', 'Inclusion, conflict resolution, play, and care for shared spaces', true, true, 5)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  locked = excluded.locked,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.point_values (value, label, description, sort_order, is_active) values
  (5, '+5', 'Expected positive behaviour', 1, true),
  (10, '+10', 'Strong positive behaviour', 2, true),
  (20, '+20', 'Significant character moment', 3, true),
  (50, '+50', 'Exceptional moral courage / rare high-impact recognition', 4, true)
on conflict (value) do update set
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
