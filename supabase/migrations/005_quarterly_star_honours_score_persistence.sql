-- Atomic, service-only persistence for versioned Quarterly Star Honours runs.

create unique index if not exists idx_quarterly_award_one_active_run
  on public.quarterly_award_score_runs(award_period_id)
  where status in ('queued', 'running');

create or replace function public.persist_quarterly_award_score_snapshots(
  p_score_run_id uuid,
  p_snapshots jsonb,
  p_source_record_count integer,
  p_calculation_metadata jsonb
)
returns integer
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  run_row public.quarterly_award_score_runs;
  inserted_count integer;
begin
  if current_user <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_snapshots) <> 'array' then
    raise exception 'Snapshots must be a JSON array.';
  end if;

  select * into run_row
  from public.quarterly_award_score_runs
  where id = p_score_run_id
  for update;

  if not found or run_row.status <> 'running' then
    raise exception 'Running score run not found.';
  end if;

  update public.quarterly_award_candidate_scores
  set is_current = false
  where award_period_id = run_row.award_period_id
    and school_id = run_row.school_id
    and is_current = true;

  insert into public.quarterly_award_candidate_scores (
    school_id,
    award_period_id,
    award_definition_id,
    score_run_id,
    student_id,
    algorithm_version,
    raw_metrics,
    component_scores,
    total_score,
    eligible,
    eligibility_reasons,
    fairness_flags,
    evidence_summary,
    normalisation_cohort,
    rank_in_cohort,
    rank_in_school,
    is_current
  )
  select
    run_row.school_id,
    run_row.award_period_id,
    (item ->> 'award_definition_id')::uuid,
    run_row.id,
    (item ->> 'student_id')::uuid,
    item ->> 'algorithm_version',
    coalesce(item -> 'raw_metrics', '{}'::jsonb),
    coalesce(item -> 'component_scores', '{}'::jsonb),
    (item ->> 'total_score')::numeric,
    (item ->> 'eligible')::boolean,
    coalesce(array(select jsonb_array_elements_text(item -> 'eligibility_reasons')), '{}'::text[]),
    coalesce(array(select jsonb_array_elements_text(item -> 'fairness_flags')), '{}'::text[]),
    coalesce(item -> 'evidence_summary', '{}'::jsonb),
    coalesce(item -> 'normalisation_cohort', '{}'::jsonb),
    nullif(item ->> 'rank_in_cohort', '')::integer,
    nullif(item ->> 'rank_in_school', '')::integer,
    true
  from jsonb_array_elements(p_snapshots) as payload(item);

  get diagnostics inserted_count = row_count;

  update public.quarterly_award_score_runs
  set status = 'completed',
      completed_at = now(),
      source_record_count = greatest(coalesce(p_source_record_count, 0), 0),
      candidate_count = (
        select count(*)
        from jsonb_array_elements(p_snapshots) candidate(item)
        where (candidate.item ->> 'eligible')::boolean = true
      ),
      calculation_metadata = coalesce(p_calculation_metadata, '{}'::jsonb),
      error_message = null
  where id = run_row.id;

  return inserted_count;
end;
$$;

revoke all on function public.persist_quarterly_award_score_snapshots(uuid, jsonb, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.persist_quarterly_award_score_snapshots(uuid, jsonb, integer, jsonb)
  to service_role;
