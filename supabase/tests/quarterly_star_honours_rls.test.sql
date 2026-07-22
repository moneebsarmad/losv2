begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(28);

insert into public.schools (id, code, name, timezone)
values ('00000000-0000-0000-0000-000000000002', 'other-school-test', 'Other School', 'America/Chicago');

insert into auth.users (id, aud, role, email, created_at, updated_at)
select id, 'authenticated', 'authenticated', email, now(), now()
from (values
  ('00000000-0000-0000-0000-000000000011'::uuid, 'super@test.local'),
  ('00000000-0000-0000-0000-000000000012'::uuid, 'admin@test.local'),
  ('00000000-0000-0000-0000-000000000013'::uuid, 'tarbiyah@test.local'),
  ('00000000-0000-0000-0000-000000000014'::uuid, 'mentor@test.local'),
  ('00000000-0000-0000-0000-000000000015'::uuid, 'teacher@test.local'),
  ('00000000-0000-0000-0000-000000000016'::uuid, 'support@test.local'),
  ('00000000-0000-0000-0000-000000000017'::uuid, 'staff@test.local'),
  ('00000000-0000-0000-0000-000000000018'::uuid, 'student@test.local'),
  ('00000000-0000-0000-0000-000000000019'::uuid, 'parent@test.local'),
  ('00000000-0000-0000-0000-000000000020'::uuid, 'other-admin@test.local')
) users(id, email);

insert into public.profiles (id, school_id, role, email, full_name)
values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'super_admin', 'super@test.local', 'Super Admin'),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'admin', 'admin@test.local', 'Admin'),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'tarbiyah_leadership', 'tarbiyah@test.local', 'Tarbiyah'),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-000000000001', 'house_mentor', 'mentor@test.local', 'Mentor'),
  ('00000000-0000-0000-0000-000000000015', '00000000-0000-0000-0000-000000000001', 'teacher', 'teacher@test.local', 'Teacher'),
  ('00000000-0000-0000-0000-000000000016', '00000000-0000-0000-0000-000000000001', 'support_staff', 'support@test.local', 'Support'),
  ('00000000-0000-0000-0000-000000000017', '00000000-0000-0000-0000-000000000001', 'staff', 'staff@test.local', 'Staff'),
  ('00000000-0000-0000-0000-000000000018', '00000000-0000-0000-0000-000000000001', 'student', 'student@test.local', 'Student'),
  ('00000000-0000-0000-0000-000000000019', '00000000-0000-0000-0000-000000000001', 'parent', 'parent@test.local', 'Parent'),
  ('00000000-0000-0000-0000-000000000020', '00000000-0000-0000-0000-000000000002', 'admin', 'other-admin@test.local', 'Other Admin');

insert into public.students (id, school_id, student_id, student_name, grade, section, house)
values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'BHA-TEST-1', 'BHA Test Student', 8, 'A', 'House of Khadijah'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'OTHER-TEST-1', 'Other Test Student', 8, 'A', 'Other House');

insert into public.quarterly_award_periods (
  id, school_id, code, name, starts_on, ends_on, status
)
values
  ('20000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'RLS-Q1', 'RLS Quarter', '2026-01-01', '2026-03-31', 'review_open'),
  ('20000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'RLS-Q1', 'Other RLS Quarter', '2026-01-01', '2026-03-31', 'review_open');

insert into public.quarterly_award_score_runs (
  id, school_id, award_period_id, algorithm_version, trigger_type, status, completed_at
)
values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'quarterly-star-honours-v1', 'test', 'completed', now()),
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 'quarterly-star-honours-v1', 'test', 'completed', now());

insert into public.quarterly_award_candidate_scores (
  id, school_id, award_period_id, award_definition_id, score_run_id, student_id,
  algorithm_version, raw_metrics, component_scores, total_score, eligible,
  evidence_summary, normalisation_cohort
)
values
  (
    '40000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    (select id from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'quarterly-star-honours-v1', '{}', '{}', 80, true, '{}', '{"type":"school"}'
  ),
  (
    '40000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    (select id from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'quarterly-star-honours-v1', '{}', '{}', 80, true, '{}', '{"type":"school"}'
  );

insert into public.quarterly_award_notifications (
  id, school_id, recipient_user_id, award_period_id, notification_type,
  title, message, deduplication_key
)
values (
  '41000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000012',
  '20000000-0000-0000-0000-000000000001',
  'award_review_opening',
  'Honours review',
  'Review is approaching.',
  'rls-review-opening'
);

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000011","role":"authenticated"}', true);
select extensions.ok(public.has_admin_portal_access(), 'super_admin has admin portal access');
select extensions.is((select count(*) from public.quarterly_award_candidate_scores), 1::bigint, 'super_admin sees only own-school candidate');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000012","role":"authenticated"}', true);
select extensions.ok(public.has_admin_portal_access(), 'admin has admin portal access');
select extensions.is(public.current_user_school_id(), '00000000-0000-0000-0000-000000000001'::uuid, 'school scope is resolved from auth.uid');
select extensions.is((select count(*) from public.quarterly_award_candidate_scores), 1::bigint, 'admin sees only own-school candidate');
select extensions.is((select count(*) from public.quarterly_award_notifications), 1::bigint, 'admin sees an own-recipient notification');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000013","role":"authenticated"}', true);
select extensions.ok(public.has_admin_portal_access(), 'tarbiyah leadership has admin portal access');
select extensions.is((select count(*) from public.quarterly_award_candidate_scores), 1::bigint, 'tarbiyah leadership sees only own-school candidate');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000014","role":"authenticated"}', true);
select extensions.ok(not public.has_admin_portal_access(), 'house mentor has no admin portal access');
select extensions.is((select count(*) from public.quarterly_award_candidate_scores), 0::bigint, 'house mentor sees no candidate rows');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000015","role":"authenticated"}', true);
select extensions.ok(not public.has_admin_portal_access(), 'teacher has no admin portal access');
select extensions.is((select count(*) from public.quarterly_award_candidate_scores), 0::bigint, 'teacher sees no candidate rows');
select extensions.is((select count(*) from public.quarterly_award_notifications), 0::bigint, 'teacher sees no honours notifications');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000016","role":"authenticated"}', true);
select extensions.ok(not public.has_admin_portal_access(), 'support staff has no admin portal access');
select extensions.is((select count(*) from public.quarterly_award_candidate_scores), 0::bigint, 'support staff sees no candidate rows');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000017","role":"authenticated"}', true);
select extensions.ok(not public.has_admin_portal_access(), 'staff has no admin portal access');
select extensions.is((select count(*) from public.quarterly_award_candidate_scores), 0::bigint, 'staff sees no candidate rows');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000018","role":"authenticated"}', true);
select extensions.ok(not public.has_admin_portal_access(), 'student has no admin portal access');
select extensions.is((select count(*) from public.quarterly_award_candidate_scores), 0::bigint, 'student sees no candidate rows');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000019","role":"authenticated"}', true);
select extensions.ok(not public.has_admin_portal_access(), 'parent has no admin portal access');
select extensions.is((select count(*) from public.quarterly_award_candidate_scores), 0::bigint, 'parent sees no candidate rows');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000020","role":"authenticated"}', true);
select extensions.is((select count(*) from public.quarterly_award_candidate_scores), 1::bigint, 'other-school admin sees one own-school row');
select extensions.is((select count(*) from public.quarterly_award_candidate_scores where id = '40000000-0000-0000-0000-000000000001'), 0::bigint, 'cross-school candidate is hidden');
select extensions.is((select count(*) from public.quarterly_award_notifications), 0::bigint, 'other-school admin cannot see BHA notifications');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000012","role":"authenticated"}', true);
select extensions.throws_ok(
  $$select public.update_quarterly_award_review('40000000-0000-0000-0000-000000000002', 'shortlisted', null, null, null)$$,
  'P0001',
  'Current candidate score not found.',
  'client-supplied cross-school candidate id cannot bypass RPC scope'
);

reset role;

select extensions.ok(
  not has_table_privilege('authenticated', 'public.quarterly_award_candidate_scores', 'INSERT'),
  'authenticated clients cannot insert candidate scores directly'
);
select extensions.ok(
  not has_function_privilege('authenticated', 'public.get_user_role(uuid)', 'EXECUTE'),
  'legacy user-id role RPC is not executable by authenticated clients'
);
select extensions.is(
  (select count(*) from pg_catalog.pg_publication_tables where pubname = 'supabase_realtime' and tablename like 'quarterly_award%'),
  0::bigint,
  'honours tables are absent from Realtime publication'
);

select extensions.finish();
rollback;
