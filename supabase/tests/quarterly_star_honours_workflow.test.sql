begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(25);

insert into auth.users (id, aud, role, email, created_at, updated_at)
values
  ('60000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'workflow-admin@test.local', now(), now()),
  ('60000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'workflow-super@test.local', now(), now());

insert into public.profiles (id, school_id, role, email)
values
  ('60000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin', 'workflow-admin@test.local'),
  ('60000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'super_admin', 'workflow-super@test.local');

insert into public.students (id, school_id, student_id, student_name, grade, section, house)
values ('60000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'WORKFLOW-TEST', 'Workflow Test Student', 8, 'A', 'House of Aishah');

insert into public.quarterly_award_periods (
  id, school_id, code, name, starts_on, ends_on, status
)
values ('60000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000001', 'WORKFLOW-Q', 'Workflow Quarter', '2026-01-01', '2026-03-31', 'review_open');

insert into public.quarterly_award_score_runs (
  id, school_id, award_period_id, algorithm_version, trigger_type, status, completed_at
)
values ('60000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000001', '60000000-0000-0000-0000-000000000004', 'quarterly-star-honours-v1', 'test', 'completed', now());

insert into public.quarterly_award_candidate_scores (
  id, school_id, award_period_id, award_definition_id, score_run_id, student_id,
  algorithm_version, raw_metrics, component_scores, total_score, eligible,
  evidence_summary, normalisation_cohort, rank_in_school
)
values
  (
    '60000000-0000-0000-0000-000000000006',
    '00000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000004',
    (select id from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
    '60000000-0000-0000-0000-000000000005',
    '60000000-0000-0000-0000-000000000003',
    'quarterly-star-honours-v1', '{}', '{}', 88, true, '{}', '{"type":"school"}', 1
  ),
  (
    '60000000-0000-0000-0000-000000000007',
    '00000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000004',
    (select id from public.quarterly_award_definitions where school_id is null and code = 'responsibility_anchor'),
    '60000000-0000-0000-0000-000000000005',
    '60000000-0000-0000-0000-000000000003',
    'quarterly-star-honours-v1', '{}', '{}', 84, true, '{}', '{"type":"school"}', 1
  ),
  (
    '60000000-0000-0000-0000-000000000008',
    '00000000-0000-0000-0000-000000000001',
    '60000000-0000-0000-0000-000000000004',
    (select id from public.quarterly_award_definitions where school_id is null and code = 'respect_ambassador'),
    '60000000-0000-0000-0000-000000000005',
    '60000000-0000-0000-0000-000000000003',
    'quarterly-star-honours-v1', '{}', '{}', 82, true, '{}', '{"type":"school"}', 1
  );

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

select extensions.lives_ok(
  $$select public.update_quarterly_award_review('60000000-0000-0000-0000-000000000006', 'shortlisted', 'Strong evidence', null, 'A balanced example')$$,
  'admin can shortlist a candidate'
);
select extensions.is(
  (select review_status from public.quarterly_award_candidate_reviews where candidate_score_id = '60000000-0000-0000-0000-000000000006'),
  'shortlisted'::text,
  'shortlist state is stored'
);
select extensions.throws_ok(
  $$select public.update_quarterly_award_review('60000000-0000-0000-0000-000000000006', 'dismissed', null, null, null)$$,
  'P0001',
  'A dismissal reason is required.',
  'dismissal requires a reason'
);
select extensions.lives_ok(
  $$select public.update_quarterly_award_review('60000000-0000-0000-0000-000000000006', 'dismissed', null, 'Evidence needs wider review', null)$$,
  'admin can dismiss with a reason'
);
select extensions.lives_ok(
  $$select public.update_quarterly_award_review('60000000-0000-0000-0000-000000000006', 'unreviewed', null, null, null)$$,
  'admin can restore a candidate to unreviewed'
);
select extensions.lives_ok(
  $$select public.select_quarterly_award_recipient('60000000-0000-0000-0000-000000000006', 'Reviewed by committee', 'A balanced example', null, 'school', 'school', 1)$$,
  'admin can select a recipient'
);
select extensions.is(
  (select status from public.quarterly_award_recipients where candidate_score_id = '60000000-0000-0000-0000-000000000006'),
  'selected'::text,
  'recipient remains selected until finalisation'
);
select extensions.throws_ok(
  $$select public.finalise_quarterly_award_recipient((select id from public.quarterly_award_recipients where candidate_score_id = '60000000-0000-0000-0000-000000000006'), '', null)$$,
  'P0001',
  'A public citation is required before finalisation.',
  'finalisation requires a public citation'
);
select extensions.lives_ok(
  $$select public.finalise_quarterly_award_recipient((select id from public.quarterly_award_recipients where candidate_score_id = '60000000-0000-0000-0000-000000000006'), 'Recognised for balanced character across the quarter.', null)$$,
  'admin can finalise a selected eligible recipient'
);
select extensions.is(
  (select candidate_score_id from public.quarterly_award_recipients where candidate_score_id = '60000000-0000-0000-0000-000000000006'),
  '60000000-0000-0000-0000-000000000006'::uuid,
  'final recipient references the frozen candidate snapshot'
);
select extensions.lives_ok(
  $$select public.select_quarterly_award_recipient('60000000-0000-0000-0000-000000000007', null, 'A dependable example', null, 'school', 'school', 1)$$,
  'overlap remains visible at selection time'
);
select extensions.throws_ok(
  $$select public.finalise_quarterly_award_recipient((select id from public.quarterly_award_recipients where candidate_score_id = '60000000-0000-0000-0000-000000000007'), 'Recognised for dependable responsibility.', null)$$,
  'P0001',
  'Student is already selected for another award. A super-admin override reason is required.',
  'admin cannot finalise a duplicate-period recipient'
);

select set_config('request.jwt.claims', '{"sub":"60000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select extensions.lives_ok(
  $$select public.finalise_quarterly_award_recipient((select id from public.quarterly_award_recipients where candidate_score_id = '60000000-0000-0000-0000-000000000007'), 'Recognised for dependable responsibility.', 'Committee-approved exceptional overlap')$$,
  'super admin can finalise an overlap with a reason'
);
select extensions.is(
  (select count(*) from public.audit_logs where action = 'quarterly_honours.duplicate_award_override_used'),
  1::bigint,
  'duplicate-award override is audited separately'
);
select extensions.lives_ok(
  $$select public.revoke_quarterly_award_recipient((select id from public.quarterly_award_recipients where candidate_score_id = '60000000-0000-0000-0000-000000000007'), 'Correction required after review')$$,
  'super admin can revoke with a reason'
);
select extensions.is(
  (select status from public.quarterly_award_recipients where candidate_score_id = '60000000-0000-0000-0000-000000000007'),
  'revoked'::text,
  'revocation changes status without deletion'
);
select extensions.is(
  (select count(*) from public.quarterly_award_recipients),
  2::bigint,
  'recipient history is preserved'
);

reset role;
update public.quarterly_award_periods
set status = 'finalised', finalised_at = now()
where id = '60000000-0000-0000-0000-000000000004';

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"60000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select extensions.throws_ok(
  $$select public.reopen_quarterly_award_period('60000000-0000-0000-0000-000000000004', 'Correction review')$$,
  '42501',
  'Forbidden.',
  'admin cannot reopen a finalised period'
);

select set_config('request.jwt.claims', '{"sub":"60000000-0000-0000-0000-000000000002","role":"authenticated"}', true);
select extensions.lives_ok(
  $$select public.reopen_quarterly_award_period('60000000-0000-0000-0000-000000000004', 'Correction review')$$,
  'super admin can reopen a finalised period with a reason'
);
select extensions.is(
  (select status from public.quarterly_award_periods where id = '60000000-0000-0000-0000-000000000004'),
  'review_open'::text,
  'reopened period returns to review state'
);
select extensions.is(
  (select count(*) from public.audit_logs where action = 'quarterly_honours.period_reopened'),
  1::bigint,
  'period reopening is audited'
);
select extensions.lives_ok(
  $$select public.finalise_quarterly_award_without_recipient(
    '60000000-0000-0000-0000-000000000004',
    (select id from public.quarterly_award_definitions where school_id is null and code = 'respect_ambassador'),
    'No candidate met the evidence threshold', 'school', 'school', 1
  )$$,
  'admin workflow can retain a no-recipient decision'
);
select extensions.lives_ok(
  $$select public.select_quarterly_award_recipient(
    '60000000-0000-0000-0000-000000000008', null, 'A respectful example', null, 'school', 'school', 1
  )$$,
  'a reopened no-recipient slot can be replaced by a selected candidate'
);
select extensions.is(
  (select count(*) from public.quarterly_award_recipients where award_definition_id = (select id from public.quarterly_award_definitions where school_id is null and code = 'respect_ambassador') and status = 'revoked' and student_id is null),
  1::bigint,
  'replaced no-recipient outcome remains in history as revoked'
);
select extensions.is(
  (select count(*) from public.audit_logs where action = 'quarterly_honours.no_recipient_replaced'),
  1::bigint,
  'replacement of a no-recipient decision is audited'
);

reset role;
select extensions.finish();
rollback;
