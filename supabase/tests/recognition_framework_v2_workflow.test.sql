begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(30);

select extensions.is(
  has_table_privilege('authenticated', 'public.recognition_logs', 'INSERT'),
  false,
  'authenticated clients cannot insert directly into the canonical ledger'
);
select extensions.is(
  has_table_privilege('authenticated', 'public.recognition_nominations', 'INSERT'),
  false,
  'authenticated clients cannot insert nominations outside the authoritative RPC'
);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('70000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'recognition-staff@test.local', now(), now()),
  ('70000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'recognition-admin@test.local', now(), now()),
  ('70000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'recognition-student@test.local', now(), now()),
  ('70000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'recognition-parent@test.local', now(), now());

insert into public.profiles (id, school_id, role, email, staff_name, student_name)
values
  ('70000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'staff', 'recognition-staff@test.local', 'Recognition Staff', null),
  ('70000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'admin', 'recognition-admin@test.local', 'Recognition Admin', null),
  ('70000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'student', 'recognition-student@test.local', null, 'Student Account'),
  ('70000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'parent', 'recognition-parent@test.local', null, null);

insert into public.students (id, school_id, student_id, student_name, grade, section, house)
values
  ('70000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'RECOGNITION-ONE', 'Recognition Student One', 6, 'A', 'House of Aishah'),
  ('70000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'RECOGNITION-TWO', 'Recognition Student Two', 6, 'A', 'House of Aishah');

create temporary table recognition_test_state (
  key text primary key,
  id uuid not null
);
grant select, insert on recognition_test_state to authenticated;

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000001","role":"authenticated"}',
  true
);

select extensions.lives_ok(
  $$select public.create_recognition_awards_v2(
    array['70000000-0000-0000-0000-000000000011'::uuid],
    'respect_included_someone',
    'lunch_recess',
    'recognition-direct-001',
    null,
    '2026-07-24T15:00:00Z',
    'student_parent'
  )$$,
  'award-capable staff can create a direct recognition'
);
select extensions.is(
  (
    select points_snapshot
    from public.recognition_logs
    where submission_idempotency_key = 'recognition-direct-001'
  ),
  10,
  'the database stores the fixed point value'
);
select extensions.is(
  (
    select staff_user_id
    from public.recognition_logs
    where submission_idempotency_key = 'recognition-direct-001'
  ),
  '70000000-0000-0000-0000-000000000001'::uuid,
  'the awarding staff member comes from the authenticated user'
);
select extensions.is(
  (
    select framework_version
    from public.recognition_logs
    where submission_idempotency_key = 'recognition-direct-001'
  ),
  'recognition_v2'::text,
  'new awards are distinguishable from legacy records'
);
select extensions.lives_ok(
  $$select public.create_recognition_awards_v2(
    array['70000000-0000-0000-0000-000000000011'::uuid],
    'respect_included_someone',
    'classroom_learning',
    'recognition-direct-002'
  )$$,
  'the same behaviour can be awarded in another domain'
);
select extensions.is(
  (
    select min(points_snapshot)
    from public.recognition_logs
    where submission_idempotency_key in ('recognition-direct-001', 'recognition-direct-002')
  ),
  (
    select max(points_snapshot)
    from public.recognition_logs
    where submission_idempotency_key in ('recognition-direct-001', 'recognition-direct-002')
  ),
  'domain selection never changes the behaviour point value'
);
select extensions.throws_ok(
  $$select public.create_recognition_awards_v2(
    array['70000000-0000-0000-0000-000000000011'::uuid],
    'respect_repaired_relationship',
    'hallways_transitions',
    'recognition-direct-003'
  )$$,
  'P0001',
  'This recognition requires a short note describing what happened.',
  'a 20-point direct award fails without a note'
);
select extensions.lives_ok(
  $$select public.create_recognition_awards_v2(
    array['70000000-0000-0000-0000-000000000011'::uuid],
    'respect_repaired_relationship',
    'hallways_transitions',
    'recognition-direct-004',
    'The student completed a sincere repair after a difficult conflict.'
  )$$,
  'a 20-point direct award succeeds with a valid note'
);
select extensions.throws_ok(
  $$select public.create_recognition_awards_v2(
    array['70000000-0000-0000-0000-000000000011'::uuid],
    'respect_defended_someone_personal_risk',
    'hallways_transitions',
    'recognition-direct-005'
  )$$,
  'P0001',
  'Exceptional recognition must be submitted as a nomination.',
  'nomination-only recognition is rejected by the direct endpoint'
);
select extensions.throws_ok(
  $$select public.create_recognition_awards_v2(
    array['70000000-0000-0000-0000-000000000011'::uuid],
    'respect_included_someone',
    'custom_domain',
    'recognition-direct-006'
  )$$,
  'P0001',
  'Select where the behaviour occurred.',
  'custom domains are rejected'
);
select extensions.lives_ok(
  $$select public.create_recognition_awards_v2(
    array[
      '70000000-0000-0000-0000-000000000011'::uuid,
      '70000000-0000-0000-0000-000000000012'::uuid
    ],
    'responsibility_came_prepared',
    'classroom_learning',
    'recognition-bulk-001'
  )$$,
  'bulk direct recognition succeeds'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_logs
    where submission_idempotency_key = 'recognition-bulk-001'
  ),
  2::bigint,
  'bulk recognition creates one ledger row per student'
);
select extensions.lives_ok(
  $$select public.create_recognition_awards_v2(
    array[
      '70000000-0000-0000-0000-000000000011'::uuid,
      '70000000-0000-0000-0000-000000000012'::uuid
    ],
    'responsibility_came_prepared',
    'classroom_learning',
    'recognition-bulk-001'
  )$$,
  'an identical idempotent retry succeeds safely'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_logs
    where submission_idempotency_key = 'recognition-bulk-001'
  ),
  2::bigint,
  'an idempotent retry creates no duplicate rows'
);

insert into recognition_test_state (key, id)
select
  'nomination',
  (
    public.submit_recognition_nomination_v2(
      '70000000-0000-0000-0000-000000000011',
      'respect_defended_someone_personal_risk',
      'hallways_transitions',
      'The student defended a targeted peer despite a credible risk of retaliation.',
      'recognition-nomination-001',
      'Observed by two staff members.'
    )->>'id'
  )::uuid;

select extensions.is(
  (
    select status
    from public.recognition_nominations
    where id = (select id from recognition_test_state where key = 'nomination')
  ),
  'pending'::text,
  'award-capable staff can submit a pending exceptional nomination'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_logs
    where recognition_nomination_id = (select id from recognition_test_state where key = 'nomination')
  ),
  0::bigint,
  'a pending nomination contributes no ledger points'
);
select extensions.throws_ok(
  $$select public.review_recognition_nomination_v2(
    (select id from recognition_test_state where key = 'nomination'),
    'approved'
  )$$,
  '42501',
  'You do not have permission to review exceptional nominations.',
  'ordinary staff cannot approve exceptional nominations'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000002","role":"authenticated"}',
  true
);
select extensions.lives_ok(
  $$select public.review_recognition_nomination_v2(
    (select id from recognition_test_state where key = 'nomination'),
    'approved',
    'Approved after review.'
  )$$,
  'an authorised admin can approve an exceptional nomination'
);
select extensions.is(
  (
    select points_snapshot
    from public.recognition_logs
    where recognition_nomination_id = (select id from recognition_test_state where key = 'nomination')
  ),
  50,
  'approval creates one fixed 50-point award'
);
select extensions.lives_ok(
  $$select public.review_recognition_nomination_v2(
    (select id from recognition_test_state where key = 'nomination'),
    'approved',
    'Repeated approval request.'
  )$$,
  'repeated approval is idempotent'
);
select extensions.is(
  (
    select count(*)
    from public.recognition_logs
    where recognition_nomination_id = (select id from recognition_test_state where key = 'nomination')
  ),
  1::bigint,
  'repeated approval cannot create a second award'
);

insert into recognition_test_state (key, id)
select
  'reversal_award',
  id
from public.recognition_logs
where submission_idempotency_key = 'recognition-direct-001';
select extensions.lives_ok(
  $$select public.reverse_recognition_award_v2(
    (select id from recognition_test_state where key = 'reversal_award'),
    'Administrative correction after evidence review.'
  )$$,
  'an authorised admin can reverse an award'
);
select extensions.is(
  (
    select award_status
    from public.recognition_logs
    where id = (select id from recognition_test_state where key = 'reversal_award')
  ),
  'reversed'::text,
  'reversal retains the original ledger row with reversed status'
);
reset role;
select extensions.is(
  (
    select count(*)
    from public.v_active_recognition_awards
    where id = (select id from recognition_test_state where key = 'reversal_award')
  ),
  0::bigint,
  'reversed awards are excluded from active totals'
);
select extensions.is(
  (
    select count(*)
    from public.audit_logs
    where action = 'recognition.reversed'
      and record_id = (select id::text from recognition_test_state where key = 'reversal_award')
  ),
  1::bigint,
  'award reversal is audited'
);

set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000003","role":"authenticated"}',
  true
);
select extensions.throws_ok(
  $$select public.create_recognition_awards_v2(
    array['70000000-0000-0000-0000-000000000011'::uuid],
    'respect_included_someone',
    'lunch_recess',
    'recognition-student-denied'
  )$$,
  '42501',
  'You do not have permission to award points.',
  'students cannot award points'
);

select set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-0000-0000-000000000004","role":"authenticated"}',
  true
);
select extensions.throws_ok(
  $$select public.create_recognition_awards_v2(
    array['70000000-0000-0000-0000-000000000011'::uuid],
    'respect_included_someone',
    'lunch_recess',
    'recognition-parent-denied'
  )$$,
  '42501',
  'You do not have permission to award points.',
  'parents cannot award points'
);

select set_config('request.jwt.claims', '{}', true);
select extensions.throws_ok(
  $$select public.create_recognition_awards_v2(
    array['70000000-0000-0000-0000-000000000011'::uuid],
    'respect_included_someone',
    'lunch_recess',
    'recognition-anonymous-denied'
  )$$,
  '42501',
  'You must be signed in to award points.',
  'unauthenticated requests cannot award points'
);

reset role;
select extensions.finish();
rollback;
