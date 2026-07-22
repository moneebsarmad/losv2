begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into public.schools (id, code, name, timezone)
values
  ('80000000-0000-0000-0000-000000000001', 'period-test', 'Period Test School', 'America/Chicago'),
  ('80000000-0000-0000-0000-000000000002', 'period-other', 'Other Period School', 'America/Chicago');

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('80000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'period-super@test.local', now(), now()),
  ('80000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'period-admin@test.local', now(), now());

insert into public.profiles (id, school_id, role, email)
values
  ('80000000-0000-0000-0000-000000000003', '80000000-0000-0000-0000-000000000001', 'super_admin', 'period-super@test.local'),
  ('80000000-0000-0000-0000-000000000004', '80000000-0000-0000-0000-000000000001', 'admin', 'period-admin@test.local');

insert into public.quarterly_award_periods (
  id, school_id, code, name, starts_on, ends_on, status
) values (
  '80000000-0000-0000-0000-000000000005',
  '80000000-0000-0000-0000-000000000002',
  'OTHER-BASELINE', 'Other School Baseline', '2094-01-01', '2094-03-31', 'finalised'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"80000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select extensions.lives_ok(
  $$select public.create_quarterly_award_period('Q1-2095', 'Quarter 1', '2095-08-01', '2095-10-15', null, null, 1)$$,
  'super admin can create the first upcoming period'
);
select extensions.lives_ok(
  $$select public.create_quarterly_award_period('Q2-2095', 'Quarter 2', '2095-10-16', '2095-12-20', null, null, 2)$$,
  'a second quarter in the same year reuses the academic-year record'
);
select extensions.is(
  (select count(distinct academic_year_id) from public.quarterly_award_periods where school_id = '80000000-0000-0000-0000-000000000001'),
  1::bigint,
  'same-year quarters share one academic year'
);
select extensions.ok(
  (select starts_on <= '2095-08-01' and ends_on >= '2095-12-20' from public.academic_years where school_id = '80000000-0000-0000-0000-000000000001'),
  'inferred academic year expands to cover both quarters'
);
select extensions.lives_ok(
  $$select public.update_quarterly_award_period(
    (select id from public.quarterly_award_periods where school_id = '80000000-0000-0000-0000-000000000001' and code = 'Q2-2095'),
    'Q2-2095', 'Quarter 2 Updated', '2095-10-16', '2095-12-21', null, null, 2
  )$$,
  'super admin can edit an upcoming period'
);
select extensions.ok(
  (select name = 'Quarter 2 Updated' and recipient_limit_per_award = 2 from public.quarterly_award_periods where school_id = '80000000-0000-0000-0000-000000000001' and code = 'Q2-2095')
  and (select count(*) from public.audit_logs where action = 'quarterly_honours.period_updated' and user_id = '80000000-0000-0000-0000-000000000003') = 1,
  'period edit and recipient limit are stored and audited'
);
select extensions.throws_ok(
  $$select public.update_quarterly_award_period(
    (select id from public.quarterly_award_periods where school_id = '80000000-0000-0000-0000-000000000001' and code = 'Q2-2095'),
    'Q2-2095', 'Quarter 2 Updated', '2095-10-16', '2095-12-21', null,
    '80000000-0000-0000-0000-000000000005', 2
  )$$,
  'P0001',
  'Baseline period must be an earlier finalised period in the same school.',
  'cross-school baseline IDs are rejected'
);

select set_config('request.jwt.claims', '{"sub":"80000000-0000-0000-0000-000000000004","role":"authenticated"}', true);
select extensions.throws_ok(
  $$select public.update_quarterly_award_period(
    (select id from public.quarterly_award_periods where school_id = '80000000-0000-0000-0000-000000000001' and code = 'Q2-2095'),
    'Q2-2095', 'Admin Edit', '2095-10-16', '2095-12-21', null, null, 2
  )$$,
  '42501',
  'Forbidden.',
  'admin cannot edit award period configuration'
);
select extensions.ok(
  (select count(*) from public.academic_calendar_days where school_id = '80000000-0000-0000-0000-000000000001') > 0,
  'period setup creates scheduled instructional-day rows'
);

select extensions.finish();
rollback;
