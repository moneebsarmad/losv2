begin;

create extension if not exists pgtap with schema extensions;
select extensions.plan(9);

insert into public.schools (id, code, name, timezone)
values ('90000000-0000-0000-0000-000000000001', 'persistence-test', 'Persistence Test School', 'America/Chicago');

insert into public.students (id, school_id, student_id, student_name, grade, section, house)
values ('90000000-0000-0000-0000-000000000002', '90000000-0000-0000-0000-000000000001', 'PERSIST-1', 'Persistence Student', 8, 'A', 'House of Aishah');

insert into public.quarterly_award_periods (
  id, school_id, code, name, starts_on, ends_on, status
) values (
  '90000000-0000-0000-0000-000000000003', '90000000-0000-0000-0000-000000000001',
  'PERSIST-Q', 'Persistence Quarter', '2096-01-01', '2096-03-31', 'active'
);

insert into public.quarterly_award_score_runs (
  id, school_id, award_period_id, algorithm_version, trigger_type, status
) values (
  '90000000-0000-0000-0000-000000000004', '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000003', 'quarterly-star-honours-v1', 'test', 'running'
);

set local role service_role;
select public.persist_quarterly_award_score_snapshots(
  '90000000-0000-0000-0000-000000000004',
  jsonb_build_array(jsonb_build_object(
    'award_definition_id', (select id from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
    'student_id', '90000000-0000-0000-0000-000000000002',
    'algorithm_version', 'quarterly-star-honours-v1',
    'raw_metrics', '{"eligible_days":40}'::jsonb,
    'component_scores', '{"balanced_three_r":{"normalisedScore":80}}'::jsonb,
    'total_score', 80,
    'eligible', true,
    'eligibility_reasons', '[]'::jsonb,
    'fairness_flags', '[]'::jsonb,
    'evidence_summary', '{}'::jsonb,
    'normalisation_cohort', '{"type":"school"}'::jsonb,
    'rank_in_cohort', 1,
    'rank_in_school', 1
  )),
  12,
  '{"attendance_method":"scheduled_eligible_days"}'::jsonb
);
reset role;

select extensions.is(
  (select status from public.quarterly_award_score_runs where id = '90000000-0000-0000-0000-000000000004'),
  'completed'::text,
  'atomic persistence completes the first score run'
);
select extensions.is(
  (select total_score from public.quarterly_award_candidate_scores where score_run_id = '90000000-0000-0000-0000-000000000004' and is_current),
  80.000::numeric,
  'first score snapshot becomes current'
);

insert into public.quarterly_award_recipients (
  id, school_id, award_period_id, award_definition_id, student_id,
  candidate_score_id, selected_at, finalised_at, public_citation, status
)
select
  '90000000-0000-0000-0000-000000000005', school_id, award_period_id,
  award_definition_id, student_id, id, now(), now(), 'Frozen evidence citation', 'finalised'
from public.quarterly_award_candidate_scores
where score_run_id = '90000000-0000-0000-0000-000000000004';

insert into public.quarterly_award_score_runs (
  id, school_id, award_period_id, algorithm_version, trigger_type, status
) values (
  '90000000-0000-0000-0000-000000000006', '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000003', 'quarterly-star-honours-v1', 'test', 'running'
);

set local role service_role;
select public.persist_quarterly_award_score_snapshots(
  '90000000-0000-0000-0000-000000000006',
  jsonb_build_array(jsonb_build_object(
    'award_definition_id', (select id from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
    'student_id', '90000000-0000-0000-0000-000000000002',
    'algorithm_version', 'quarterly-star-honours-v1',
    'raw_metrics', '{"eligible_days":45}'::jsonb,
    'component_scores', '{"balanced_three_r":{"normalisedScore":90}}'::jsonb,
    'total_score', 90,
    'eligible', true,
    'eligibility_reasons', '[]'::jsonb,
    'fairness_flags', '[]'::jsonb,
    'evidence_summary', '{}'::jsonb,
    'normalisation_cohort', '{"type":"school"}'::jsonb,
    'rank_in_cohort', 1,
    'rank_in_school', 1
  )),
  14,
  '{"attendance_method":"scheduled_eligible_days"}'::jsonb
);
reset role;

select extensions.is(
  (select total_score from public.quarterly_award_candidate_scores where award_period_id = '90000000-0000-0000-0000-000000000003' and is_current),
  90.000::numeric,
  'new refresh creates a new current snapshot'
);
select extensions.is(
  (select total_score from public.quarterly_award_candidate_scores where score_run_id = '90000000-0000-0000-0000-000000000004'),
  80.000::numeric,
  'historical score value remains unchanged after refresh'
);
select extensions.ok(
  (select not is_current from public.quarterly_award_candidate_scores where score_run_id = '90000000-0000-0000-0000-000000000004'),
  'historical score remains stored as a non-current snapshot'
);
select extensions.is(
  (select cs.total_score from public.quarterly_award_recipients recipient join public.quarterly_award_candidate_scores cs on cs.id = recipient.candidate_score_id where recipient.id = '90000000-0000-0000-0000-000000000005'),
  80.000::numeric,
  'final recipient continues to reference the frozen first snapshot'
);
select extensions.is(
  (select count(*) from public.quarterly_award_candidate_scores where award_period_id = '90000000-0000-0000-0000-000000000003'),
  2::bigint,
  'both score-run snapshots are retained'
);

insert into public.quarterly_award_score_runs (
  id, school_id, award_period_id, algorithm_version, trigger_type, status
) values (
  '90000000-0000-0000-0000-000000000007', '90000000-0000-0000-0000-000000000001',
  '90000000-0000-0000-0000-000000000003', 'quarterly-star-honours-v1', 'test', 'running'
);
set local role service_role;
select extensions.throws_ok(
  $$select public.persist_quarterly_award_score_snapshots(
    '90000000-0000-0000-0000-000000000007',
    jsonb_build_array(jsonb_build_object(
      'award_definition_id', (select id from public.quarterly_award_definitions where school_id is null and code = 'north_star'),
      'student_id', '90000000-0000-0000-0000-000000000002',
      'algorithm_version', 'quarterly-star-honours-v1',
      'raw_metrics', '{}'::jsonb, 'component_scores', '{}'::jsonb,
      'total_score', 101, 'eligible', true,
      'eligibility_reasons', '[]'::jsonb, 'fairness_flags', '[]'::jsonb,
      'evidence_summary', '{}'::jsonb, 'normalisation_cohort', '{}'::jsonb
    )), 0, '{}'::jsonb
  )$$,
  '23514',
  null,
  'invalid replacement snapshot fails atomically'
);
reset role;
select extensions.is(
  (select total_score from public.quarterly_award_candidate_scores where award_period_id = '90000000-0000-0000-0000-000000000003' and is_current),
  90.000::numeric,
  'failed replacement leaves the previous current snapshot intact'
);

select extensions.finish();
rollback;
