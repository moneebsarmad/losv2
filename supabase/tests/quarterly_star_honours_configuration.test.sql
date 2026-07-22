begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(19);

insert into public.schools (id, code, name, timezone)
values ('70000000-0000-0000-0000-000000000001', 'honours-config-test', 'Honours Configuration Test School', 'America/Chicago');

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('70000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'config-admin@test.local', now(), now()),
  ('70000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'config-super@test.local', now(), now());

insert into public.profiles (id, school_id, role, email)
values
  ('70000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000001', 'admin', 'config-admin@test.local'),
  ('70000000-0000-0000-0000-000000000003', '70000000-0000-0000-0000-000000000001', 'super_admin', 'config-super@test.local');

select extensions.is(
  (select array_agg(code order by display_order) from public.quarterly_award_definitions where school_id is null and active),
  array['north_star', 'righteousness_beacon', 'responsibility_anchor', 'respect_ambassador', 'rising_star', 'steadfast_star']::text[],
  'the database seeds exactly the six intended award definitions in display order'
);
select extensions.is(
  (select count(*) from public.quarterly_award_definitions where lower(code) like '%house%catalyst%' or lower(name) like '%house%catalyst%'),
  0::bigint,
  'House Catalyst is not an award definition'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select extensions.ok(
  not public.current_user_has_permission('honours.configure'),
  'admin does not receive algorithm configuration permission'
);
select extensions.throws_ok(
  $$select public.update_quarterly_award_definition(
    (select id from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
    (select configuration from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
    'quarterly-star-honours-v2'
  )$$,
  '42501',
  'Forbidden.',
  'admin cannot change an award definition through the RPC'
);

select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select extensions.ok(
  public.current_user_has_permission('honours.configure'),
  'super admin receives algorithm configuration permission'
);
select extensions.throws_ok(
  $$select public.update_quarterly_award_definition(
    (select id from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
    jsonb_set(
      (select configuration from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
      '{weights,balanced_three_r}',
      '0.50'::jsonb
    ),
    'quarterly-star-honours-v2'
  )$$,
  'P0001',
  'Component weights must total 1.0.',
  'definition weights must total one'
);
select extensions.lives_ok(
  $$select public.update_quarterly_award_definition(
    (select id from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
    jsonb_set(
      (select configuration from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
      '{minimums,min_events}',
      '9'::jsonb
    ),
    'quarterly-star-honours-v2'
  )$$,
  'super admin can create a school-scoped versioned definition'
);
select extensions.is(
  (select algorithm_version from public.quarterly_award_definitions where school_id = '70000000-0000-0000-0000-000000000001' and code = 'north_star'),
  'quarterly-star-honours-v2'::text,
  'school override stores the new algorithm version'
);
select extensions.is(
  (select count(*) from public.audit_logs where user_id = '70000000-0000-0000-0000-000000000003' and action = 'quarterly_honours.algorithm_configuration_changed'),
  1::bigint,
  'algorithm configuration change is audited'
);
select extensions.throws_ok(
  $$select public.update_quarterly_award_definition(
    (select id from public.quarterly_award_definitions where school_id = '70000000-0000-0000-0000-000000000001' and code = 'north_star'),
    jsonb_set(
      (select configuration from public.quarterly_award_definitions where school_id = '70000000-0000-0000-0000-000000000001' and code = 'north_star'),
      '{minimums,min_events}',
      '10'::jsonb
    ),
    'quarterly-star-honours-v2'
  )$$,
  'P0001',
  'A configuration change requires a new algorithm version.',
  'formula changes cannot silently reuse an algorithm version'
);
select extensions.lives_ok(
  $$select public.upsert_quarterly_award_signal_mapping(
    (select id from public.quarterly_award_definitions where school_id = '70000000-0000-0000-0000-000000000001' and code = 'north_star'),
    'r_value', 'respect', 'peer_inclusion', 1, true, true
  )$$,
  'super admin can configure a recognition signal mapping'
);
select extensions.ok(
  (select active and qualifies_as_significant and qualifies_as_peer_impact
   from public.quarterly_award_signal_mappings
   where school_id = '70000000-0000-0000-0000-000000000001' and source_key = 'respect'),
  'signal mapping stores its active evidence flags'
);
select extensions.is(
  (select count(*) from public.audit_logs where user_id = '70000000-0000-0000-0000-000000000003' and action = 'quarterly_honours.signal_mapping_changed'),
  1::bigint,
  'signal mapping change is audited'
);
select extensions.throws_ok(
  $$select public.deactivate_quarterly_award_signal_mapping(
    (select id from public.quarterly_award_signal_mappings where school_id = '70000000-0000-0000-0000-000000000001' and source_key = 'respect'),
    ''
  )$$,
  'P0001',
  'A reason is required.',
  'signal mapping deactivation requires a reason'
);
select extensions.lives_ok(
  $$select public.deactivate_quarterly_award_signal_mapping(
    (select id from public.quarterly_award_signal_mappings where school_id = '70000000-0000-0000-0000-000000000001' and source_key = 'respect'),
    'Taxonomy mapping corrected'
  )$$,
  'super admin can deactivate a mapping with a reason'
);
select extensions.ok(
  (select not active from public.quarterly_award_signal_mappings where school_id = '70000000-0000-0000-0000-000000000001' and source_key = 'respect')
  and (select count(*) from public.audit_logs where user_id = '70000000-0000-0000-0000-000000000003' and action = 'quarterly_honours.signal_mapping_deactivated') = 1,
  'mapping deactivation is retained and audited'
);

reset role;
insert into public.quarterly_award_periods (
  id, school_id, code, name, starts_on, ends_on, status
)
values (
  '70000000-0000-0000-0000-000000000004',
  '70000000-0000-0000-0000-000000000001',
  'CONFIG-Q',
  'Configuration Test Quarter',
  '2097-01-01',
  '2097-03-31',
  'active'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"70000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select extensions.throws_ok(
  $$select public.update_quarterly_award_definition(
    (select id from public.quarterly_award_definitions where school_id = '70000000-0000-0000-0000-000000000001' and code = 'north_star'),
    (select configuration from public.quarterly_award_definitions where school_id = '70000000-0000-0000-0000-000000000001' and code = 'north_star'),
    'quarterly-star-honours-v3'
  )$$,
  'P0001',
  'Algorithm configuration cannot change during an active or review-open period.',
  'active award periods lock algorithm configuration'
);

reset role;
insert into public.quarterly_award_notifications (
  school_id, recipient_user_id, award_period_id, notification_type,
  title, message, deduplication_key
)
values (
  '70000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000004',
  'award_period_ending_soon',
  'Review candidates',
  'The period is ending.',
  'config-period:ending-soon:7'
)
on conflict (recipient_user_id, deduplication_key) do nothing;
insert into public.quarterly_award_notifications (
  school_id, recipient_user_id, award_period_id, notification_type,
  title, message, deduplication_key
)
values (
  '70000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000002',
  '70000000-0000-0000-0000-000000000004',
  'award_period_ending_soon',
  'Review candidates',
  'The period is ending.',
  'config-period:ending-soon:7'
)
on conflict (recipient_user_id, deduplication_key) do nothing;
select extensions.is(
  (select count(*) from public.quarterly_award_notifications where recipient_user_id = '70000000-0000-0000-0000-000000000002'),
  1::bigint,
  'notification deduplication key prevents repeated scheduled notices'
);

insert into public.quarterly_award_score_runs (
  school_id, award_period_id, algorithm_version, trigger_type, status
)
values (
  '70000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000004',
  'quarterly-star-honours-v2',
  'test',
  'running'
)
on conflict do nothing;
insert into public.quarterly_award_score_runs (
  school_id, award_period_id, algorithm_version, trigger_type, status
)
values (
  '70000000-0000-0000-0000-000000000001',
  '70000000-0000-0000-0000-000000000004',
  'quarterly-star-honours-v2',
  'test',
  'running'
)
on conflict do nothing;
select extensions.is(
  (select count(*) from public.quarterly_award_score_runs where award_period_id = '70000000-0000-0000-0000-000000000004' and status = 'running'),
  1::bigint,
  'only one queued or running refresh can exist for a period'
);

select extensions.finish();
rollback;
