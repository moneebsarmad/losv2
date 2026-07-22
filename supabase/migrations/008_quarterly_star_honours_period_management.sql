-- Reuse/expand inferred academic years and support audited edits to upcoming periods.

create or replace function public.resolve_quarterly_award_academic_year(
  p_school_id uuid,
  p_starts_on date,
  p_ends_on date,
  p_actor_id uuid
)
returns uuid
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  year_id uuid;
  year_code text := extract(year from p_starts_on)::text || '-' || extract(year from p_ends_on)::text;
begin
  select ay.id into year_id
  from public.academic_years ay
  where ay.school_id = p_school_id
    and ay.starts_on <= p_starts_on
    and ay.ends_on >= p_ends_on
  order by ay.starts_on desc
  limit 1;
  if year_id is not null then return year_id; end if;

  select ay.id into year_id
  from public.academic_years ay
  where ay.school_id = p_school_id and ay.code = year_code
  for update;

  if year_id is not null then
    update public.academic_years
    set starts_on = least(starts_on, p_starts_on),
        ends_on = greatest(ends_on, p_ends_on),
        updated_at = now()
    where id = year_id;
    return year_id;
  end if;

  insert into public.academic_years (
    school_id, code, name, starts_on, ends_on, created_by
  ) values (
    p_school_id,
    year_code,
    year_code || ' Academic Year',
    p_starts_on,
    p_ends_on,
    p_actor_id
  ) returning id into year_id;
  return year_id;
end;
$$;

revoke all on function public.resolve_quarterly_award_academic_year(uuid, date, date, uuid)
  from public, anon, authenticated;

create or replace function public.create_quarterly_award_period(
  p_code text,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_review_opens_at timestamptz default null,
  p_baseline_period_id uuid default null,
  p_recipient_limit integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  year_id uuid;
  local_today date;
  period_row public.quarterly_award_periods;
begin
  if actor_id is null or not public.current_user_has_permission('honours.configure') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  actor_school := public.current_user_school_id();
  if actor_school is null then raise exception 'School scope is required.'; end if;
  if nullif(trim(coalesce(p_code, '')), '') is null
    or nullif(trim(coalesce(p_name, '')), '') is null
    or p_starts_on is null or p_ends_on is null or p_starts_on > p_ends_on then
    raise exception 'Valid period code, name and dates are required.';
  end if;
  if p_recipient_limit not between 1 and 20 then
    raise exception 'Recipient limit must be between 1 and 20.';
  end if;
  if p_baseline_period_id is not null and not exists (
    select 1 from public.quarterly_award_periods baseline
    where baseline.id = p_baseline_period_id
      and baseline.school_id = actor_school
      and baseline.ends_on < p_starts_on
      and baseline.status in ('finalised', 'archived')
  ) then
    raise exception 'Baseline period must be an earlier finalised period in the same school.';
  end if;

  year_id := public.resolve_quarterly_award_academic_year(
    actor_school, p_starts_on, p_ends_on, actor_id
  );

  insert into public.academic_calendar_days (
    school_id, academic_year_id, calendar_date, is_instructional, label
  )
  select actor_school, year_id, day_value::date, true, 'Scheduled instructional day'
  from generate_series(p_starts_on, p_ends_on, interval '1 day') day_value
  where extract(isodow from day_value) between 1 and 5
  on conflict (school_id, calendar_date) do nothing;

  select (now() at time zone s.timezone)::date into local_today
  from public.schools s where s.id = actor_school;

  insert into public.quarterly_award_periods (
    school_id, academic_year_id, code, name, starts_on, ends_on,
    review_opens_at, status, baseline_period_id,
    recipient_limit_per_award, created_by
  ) values (
    actor_school, year_id, trim(p_code), trim(p_name), p_starts_on, p_ends_on,
    p_review_opens_at,
    case when local_today < p_starts_on then 'upcoming'
         when local_today > p_ends_on then 'review_open'
         else 'active' end,
    p_baseline_period_id, p_recipient_limit, actor_id
  ) returning * into period_row;

  perform public.write_honours_audit(
    actor_school, 'quarterly_honours.period_created',
    'quarterly_award_periods', period_row.id::text, null, to_jsonb(period_row)
  );
  return to_jsonb(period_row);
end;
$$;

create or replace function public.update_quarterly_award_period(
  p_award_period_id uuid,
  p_code text,
  p_name text,
  p_starts_on date,
  p_ends_on date,
  p_review_opens_at timestamptz default null,
  p_baseline_period_id uuid default null,
  p_recipient_limit integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  year_id uuid;
  local_today date;
  old_row public.quarterly_award_periods;
  period_row public.quarterly_award_periods;
begin
  if actor_id is null or not public.current_user_has_permission('honours.configure') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  actor_school := public.current_user_school_id();
  if nullif(trim(coalesce(p_code, '')), '') is null
    or nullif(trim(coalesce(p_name, '')), '') is null
    or p_starts_on is null or p_ends_on is null or p_starts_on > p_ends_on then
    raise exception 'Valid period code, name and dates are required.';
  end if;
  if p_recipient_limit not between 1 and 20 then
    raise exception 'Recipient limit must be between 1 and 20.';
  end if;

  select * into old_row
  from public.quarterly_award_periods p
  where p.id = p_award_period_id
    and p.school_id = actor_school
    and p.status = 'upcoming'
  for update;
  if not found then raise exception 'Only an upcoming award period can be edited.'; end if;

  if p_baseline_period_id is not null and not exists (
    select 1 from public.quarterly_award_periods baseline
    where baseline.id = p_baseline_period_id
      and baseline.id <> old_row.id
      and baseline.school_id = actor_school
      and baseline.ends_on < p_starts_on
      and baseline.status in ('finalised', 'archived')
  ) then
    raise exception 'Baseline period must be an earlier finalised period in the same school.';
  end if;

  year_id := public.resolve_quarterly_award_academic_year(
    actor_school, p_starts_on, p_ends_on, actor_id
  );
  insert into public.academic_calendar_days (
    school_id, academic_year_id, calendar_date, is_instructional, label
  )
  select actor_school, year_id, day_value::date, true, 'Scheduled instructional day'
  from generate_series(p_starts_on, p_ends_on, interval '1 day') day_value
  where extract(isodow from day_value) between 1 and 5
  on conflict (school_id, calendar_date) do nothing;

  select (now() at time zone s.timezone)::date into local_today
  from public.schools s where s.id = actor_school;

  update public.quarterly_award_periods
  set academic_year_id = year_id,
      code = trim(p_code),
      name = trim(p_name),
      starts_on = p_starts_on,
      ends_on = p_ends_on,
      review_opens_at = p_review_opens_at,
      baseline_period_id = p_baseline_period_id,
      recipient_limit_per_award = p_recipient_limit,
      status = case when local_today < p_starts_on then 'upcoming'
                    when local_today > p_ends_on then 'review_open'
                    else 'active' end,
      updated_at = now()
  where id = old_row.id
  returning * into period_row;

  perform public.write_honours_audit(
    actor_school, 'quarterly_honours.period_updated',
    'quarterly_award_periods', period_row.id::text,
    to_jsonb(old_row), to_jsonb(period_row)
  );
  return to_jsonb(period_row);
end;
$$;

revoke all on function public.update_quarterly_award_period(uuid, text, text, date, date, timestamptz, uuid, integer)
  from public;
grant execute on function public.update_quarterly_award_period(uuid, text, text, date, date, timestamptz, uuid, integer)
  to authenticated;
