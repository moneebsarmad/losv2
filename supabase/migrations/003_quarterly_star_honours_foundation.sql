-- Quarterly Star Honours foundation
-- Adds tenant-aware school/calendar/enrolment primitives and immutable award snapshots.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- School scope and source-data lifecycle
-- ---------------------------------------------------------------------------

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  timezone text not null default 'America/Chicago',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.schools (id, code, name, timezone)
values (
  '00000000-0000-0000-0000-000000000001',
  'bha',
  'Brighter Horizons Academy',
  'America/Chicago'
)
on conflict (code) do update set
  name = excluded.name,
  timezone = excluded.timezone,
  active = true;

alter table public.profiles add column if not exists school_id uuid references public.schools(id);
alter table public.students add column if not exists school_id uuid references public.schools(id);
alter table public.student_user_links add column if not exists school_id uuid references public.schools(id);
alter table public.parent_student_links add column if not exists school_id uuid references public.schools(id);
alter table public.recognition_logs add column if not exists school_id uuid references public.schools(id);
alter table public.recognition_logs add column if not exists recognition_date date;
alter table public.recognition_logs add column if not exists record_status text not null default 'active';
alter table public.recognition_logs add column if not exists deleted_at timestamptz;
alter table public.recognition_logs add column if not exists deduplication_key text;
alter table public.house_events add column if not exists school_id uuid references public.schools(id);
alter table public.audit_logs add column if not exists school_id uuid references public.schools(id);

update public.profiles
set school_id = '00000000-0000-0000-0000-000000000001'
where school_id is null;

update public.students
set school_id = '00000000-0000-0000-0000-000000000001'
where school_id is null;

update public.student_user_links sul
set school_id = s.school_id
from public.students s
where sul.student_id = s.id and sul.school_id is null;

update public.parent_student_links psl
set school_id = s.school_id
from public.students s
where psl.student_id = s.id and psl.school_id is null;

update public.recognition_logs rl
set school_id = s.school_id,
    recognition_date = coalesce(rl.recognition_date, (rl.created_at at time zone 'America/Chicago')::date)
from public.students s
where rl.student_id = s.id
  and (rl.school_id is null or rl.recognition_date is null);

update public.house_events
set school_id = '00000000-0000-0000-0000-000000000001'
where school_id is null;

update public.audit_logs
set school_id = '00000000-0000-0000-0000-000000000001'
where school_id is null;

alter table public.profiles alter column school_id set not null;
alter table public.students alter column school_id set not null;
alter table public.student_user_links alter column school_id set not null;
alter table public.parent_student_links alter column school_id set not null;
alter table public.recognition_logs alter column school_id set not null;
alter table public.recognition_logs alter column recognition_date set not null;
alter table public.house_events alter column school_id set not null;
alter table public.audit_logs alter column school_id set not null;

alter table public.recognition_logs drop constraint if exists recognition_logs_record_status_check;
alter table public.recognition_logs add constraint recognition_logs_record_status_check
  check (record_status in ('active', 'draft', 'voided', 'reversed', 'test', 'duplicate'));

alter table public.students drop constraint if exists students_student_id_key;
drop index if exists public.idx_students_student_id_unique;
create unique index if not exists idx_students_school_student_id_unique
  on public.students(school_id, student_id)
  where student_id is not null;

create index if not exists idx_profiles_school_role on public.profiles(school_id, role);
create index if not exists idx_students_school_active_grade on public.students(school_id, is_active, grade);
create index if not exists idx_student_links_school_user on public.student_user_links(school_id, user_id);
create index if not exists idx_parent_links_school_user on public.parent_student_links(school_id, parent_user_id);
create index if not exists idx_recognition_school_date on public.recognition_logs(school_id, recognition_date);
create index if not exists idx_recognition_school_student_date on public.recognition_logs(school_id, student_id, recognition_date);
create index if not exists idx_recognition_school_r_date on public.recognition_logs(school_id, r_value_id, recognition_date);
create index if not exists idx_recognition_school_domain_date on public.recognition_logs(school_id, domain_id, recognition_date);
create index if not exists idx_recognition_school_staff_date on public.recognition_logs(school_id, staff_user_id, recognition_date);
create index if not exists idx_recognition_school_status_date on public.recognition_logs(school_id, record_status, recognition_date);
create unique index if not exists idx_recognition_school_deduplication_key
  on public.recognition_logs(school_id, deduplication_key)
  where deduplication_key is not null;

-- ---------------------------------------------------------------------------
-- Academic calendar and enrolment
-- ---------------------------------------------------------------------------

create table if not exists public.academic_years (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  code text not null,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_year_dates_valid check (starts_on <= ends_on),
  constraint academic_year_school_code_unique unique (school_id, code)
);

create table if not exists public.academic_calendar_days (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid not null references public.academic_years(id) on delete cascade,
  calendar_date date not null,
  is_instructional boolean not null default true,
  is_short_official_week boolean not null default false,
  label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint academic_calendar_school_date_unique unique (school_id, calendar_date)
);

create table if not exists public.student_enrolments (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  starts_on date not null,
  ends_on date,
  status text not null default 'active',
  dates_inferred boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint student_enrolment_dates_valid check (ends_on is null or starts_on <= ends_on),
  constraint student_enrolment_status_valid check (status in ('active', 'completed', 'withdrawn')),
  constraint student_enrolment_unique_start unique (school_id, student_id, starts_on)
);

insert into public.student_enrolments (
  school_id,
  student_id,
  starts_on,
  ends_on,
  status,
  dates_inferred
)
select
  s.school_id,
  s.id,
  least(s.created_at::date, current_date),
  case when s.is_active then null else current_date end,
  case when s.is_active then 'active' else 'completed' end,
  true
from public.students s
where not exists (
  select 1 from public.student_enrolments se
  where se.school_id = s.school_id and se.student_id = s.id
);

create index if not exists idx_academic_year_school_dates on public.academic_years(school_id, starts_on, ends_on);
create index if not exists idx_calendar_school_instructional_date on public.academic_calendar_days(school_id, is_instructional, calendar_date);
create index if not exists idx_enrolment_school_student_dates on public.student_enrolments(school_id, student_id, starts_on, ends_on);

-- ---------------------------------------------------------------------------
-- Award configuration and immutable score history
-- ---------------------------------------------------------------------------

create table if not exists public.quarterly_award_definitions (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade,
  code text not null,
  name text not null,
  short_description text not null,
  detailed_description text not null,
  display_order integer not null,
  active boolean not null default true,
  algorithm_version text not null default 'quarterly-star-honours-v1',
  configuration jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quarterly_award_code_valid check (
    code in (
      'north_star',
      'righteousness_beacon',
      'responsibility_anchor',
      'respect_ambassador',
      'rising_star',
      'steadfast_star'
    )
  )
);

create unique index if not exists idx_quarterly_award_definition_scope_code
  on public.quarterly_award_definitions(coalesce(school_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

insert into public.quarterly_award_definitions (
  school_id,
  code,
  name,
  short_description,
  detailed_description,
  display_order,
  algorithm_version,
  configuration
)
values
  (
    null,
    'north_star',
    'North Star Award',
    'All-round strength across the three Rs, domains, weeks and staff observers.',
    'Recognises balanced character evidence across the full League of Stars framework rather than raw volume.',
    1,
    'quarterly-star-honours-v1',
    '{"weights":{"balanced_three_r":0.45,"domain_breadth":0.20,"weekly_consistency":0.15,"staff_breadth":0.10,"significant_evidence":0.10},"minimums":{"events":8,"eligible_days":20,"eligible_week_percentage":70,"distinct_rs":3,"distinct_domains":4,"distinct_staff":4,"significant_events":2,"maximum_staff_concentration":0.40,"maximum_r_share":0.55,"minimum_r_share":0.15}}'::jsonb
  ),
  (
    null,
    'righteousness_beacon',
    'Righteousness Beacon',
    'Sustained moral courage, worship, honesty and principled choice.',
    'Recognises meaningful Righteousness evidence across domains, weeks and multiple staff observers.',
    2,
    'quarterly-star-honours-v1',
    '{"r_key":"righteousness","weights":{"recognition_rate":0.45,"weekly_consistency":0.20,"domain_breadth":0.15,"staff_breadth":0.10,"significant_evidence":0.10},"minimums":{"events":6,"eligible_days":20,"eligible_week_percentage":50,"distinct_domains":3,"distinct_staff":3,"significant_events":1,"maximum_staff_concentration":0.40}}'::jsonb
  ),
  (
    null,
    'responsibility_anchor',
    'Responsibility Anchor',
    'Reliability, ownership, perseverance, initiative and follow-through.',
    'Recognises sustained Responsibility without reducing character to simple compliance.',
    3,
    'quarterly-star-honours-v1',
    '{"r_key":"responsibility","weights":{"recognition_rate":0.45,"weekly_consistency":0.20,"domain_breadth":0.15,"staff_breadth":0.10,"significant_evidence":0.10},"minimums":{"events":6,"eligible_days":20,"eligible_week_percentage":50,"distinct_domains":3,"distinct_staff":3,"significant_events":1,"maximum_staff_concentration":0.40}}'::jsonb
  ),
  (
    null,
    'respect_ambassador',
    'Respect Ambassador',
    'Dignity, inclusion, justice, listening and relationship-building.',
    'Recognises Respect that strengthens peers and community, not silence or adult-facing politeness alone.',
    4,
    'quarterly-star-honours-v1',
    '{"r_key":"respect","weights":{"recognition_rate":0.45,"weekly_consistency":0.20,"domain_breadth":0.15,"staff_breadth":0.10,"significant_evidence":0.10},"minimums":{"events":6,"eligible_days":20,"eligible_week_percentage":50,"distinct_domains":3,"distinct_staff":3,"significant_events":1,"maximum_staff_concentration":0.40}}'::jsonb
  ),
  (
    null,
    'rising_star',
    'Rising Star Award',
    'Credible, sustained personal growth against the student''s own baseline.',
    'Recognises smoothed improvement in rate, consistency and breadth without exposing negative baseline language.',
    5,
    'quarterly-star-honours-v1',
    '{"weights":{"recognition_rate_improvement":0.45,"consistency_improvement":0.25,"r_breadth_improvement":0.15,"domain_breadth_improvement":0.15},"minimums":{"events":6,"eligible_days":20,"active_weeks":3,"consistency_percentage":50,"positive_components":3,"maximum_staff_concentration":0.50,"minimum_elapsed_weeks_for_split":6}}'::jsonb
  ),
  (
    null,
    'steadfast_star',
    'Steadfast Star Award',
    'Quiet, dependable character demonstrated week after week.',
    'Recognises regularity and even distribution over time without requiring dramatic or high-point events.',
    6,
    'quarterly-star-honours-v1',
    '{"weights":{"weekly_consistency":0.65,"distribution_gap":0.20,"staff_breadth":0.10,"framework_breadth":0.05},"minimums":{"events":8,"eligible_days":20,"eligible_week_percentage":80,"maximum_gap_weeks":2,"distinct_rs":2,"distinct_domains":3,"distinct_staff":3,"maximum_staff_concentration":0.40}}'::jsonb
  )
on conflict do nothing;

create table if not exists public.quarterly_award_periods (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  academic_year_id uuid references public.academic_years(id) on delete restrict,
  linked_academic_period_id uuid,
  code text not null,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  review_opens_at timestamptz,
  status text not null default 'upcoming',
  scoring_algorithm_version text not null default 'quarterly-star-honours-v1',
  baseline_period_id uuid references public.quarterly_award_periods(id) on delete set null,
  recipient_limit_per_award integer not null default 1,
  created_by uuid references auth.users(id) on delete set null,
  finalised_at timestamptz,
  finalised_by uuid references auth.users(id) on delete set null,
  reopened_at timestamptz,
  reopened_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quarterly_award_period_dates_valid check (starts_on <= ends_on),
  constraint quarterly_award_period_status_valid check (status in ('upcoming', 'active', 'review_open', 'finalised', 'archived')),
  constraint quarterly_award_period_recipient_limit_valid check (recipient_limit_per_award between 1 and 20),
  constraint quarterly_award_period_school_code_unique unique (school_id, code)
);

create table if not exists public.quarterly_award_score_runs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  award_period_id uuid not null references public.quarterly_award_periods(id) on delete cascade,
  algorithm_version text not null,
  trigger_type text not null,
  triggered_by uuid references auth.users(id) on delete set null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'queued',
  source_record_count integer not null default 0,
  candidate_count integer not null default 0,
  error_message text,
  calculation_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint quarterly_award_run_trigger_valid check (trigger_type in ('manual', 'scheduled', 'review_open', 'period_end', 'test')),
  constraint quarterly_award_run_status_valid check (status in ('queued', 'running', 'completed', 'failed'))
);

create table if not exists public.quarterly_award_candidate_scores (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  award_period_id uuid not null references public.quarterly_award_periods(id) on delete cascade,
  award_definition_id uuid not null references public.quarterly_award_definitions(id) on delete restrict,
  score_run_id uuid not null references public.quarterly_award_score_runs(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  algorithm_version text not null,
  calculated_at timestamptz not null default now(),
  raw_metrics jsonb not null,
  component_scores jsonb not null,
  total_score numeric(7,3) not null,
  eligible boolean not null,
  eligibility_reasons text[] not null default '{}',
  fairness_flags text[] not null default '{}',
  evidence_summary jsonb not null default '{}'::jsonb,
  normalisation_cohort jsonb not null default '{}'::jsonb,
  rank_in_cohort integer,
  rank_in_school integer,
  is_current boolean not null default true,
  created_at timestamptz not null default now(),
  constraint quarterly_award_score_range check (total_score between 0 and 100),
  constraint quarterly_award_candidate_run_unique unique (score_run_id, award_definition_id, student_id)
);

create unique index if not exists idx_quarterly_award_candidate_current_unique
  on public.quarterly_award_candidate_scores(award_period_id, award_definition_id, student_id)
  where is_current;

create table if not exists public.quarterly_award_candidate_reviews (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  award_period_id uuid not null references public.quarterly_award_periods(id) on delete cascade,
  award_definition_id uuid not null references public.quarterly_award_definitions(id) on delete restrict,
  student_id uuid not null references public.students(id) on delete restrict,
  candidate_score_id uuid not null references public.quarterly_award_candidate_scores(id) on delete restrict,
  review_status text not null default 'unreviewed',
  internal_notes text,
  dismissal_reason text,
  public_citation_draft text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quarterly_award_review_status_valid check (review_status in ('unreviewed', 'shortlisted', 'dismissed', 'selected')),
  constraint quarterly_award_review_student_unique unique (award_period_id, award_definition_id, student_id)
);

create table if not exists public.quarterly_award_recipients (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  award_period_id uuid not null references public.quarterly_award_periods(id) on delete cascade,
  award_definition_id uuid not null references public.quarterly_award_definitions(id) on delete restrict,
  student_id uuid references public.students(id) on delete restrict,
  candidate_score_id uuid references public.quarterly_award_candidate_scores(id) on delete restrict,
  scope_type text not null default 'school',
  scope_key text not null default 'school',
  recipient_slot integer not null default 1,
  selected_by uuid references auth.users(id) on delete set null,
  selected_at timestamptz,
  finalised_by uuid references auth.users(id) on delete set null,
  finalised_at timestamptz,
  public_citation text,
  internal_selection_note text,
  status text not null default 'selected',
  override_reason text,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  revocation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quarterly_award_recipient_status_valid check (status in ('selected', 'finalised', 'revoked', 'not_issued')),
  constraint quarterly_award_recipient_scope_valid check (scope_type in ('school', 'division', 'grade')),
  constraint quarterly_award_recipient_slot_valid check (recipient_slot > 0),
  constraint quarterly_award_recipient_student_required check (
    (status = 'not_issued' and student_id is null and candidate_score_id is null)
    or (status <> 'not_issued' and student_id is not null and candidate_score_id is not null)
  )
);

create unique index if not exists idx_quarterly_award_recipient_active_slot
  on public.quarterly_award_recipients(award_period_id, award_definition_id, scope_type, scope_key, recipient_slot)
  where status in ('selected', 'finalised', 'not_issued');

create table if not exists public.quarterly_award_signal_mappings (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  award_definition_id uuid not null references public.quarterly_award_definitions(id) on delete cascade,
  source_type text not null,
  source_key text not null,
  signal_type text not null,
  weight numeric(7,3) not null default 1,
  qualifies_as_significant boolean not null default false,
  qualifies_as_peer_impact boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quarterly_award_signal_source_valid check (source_type in ('tag', 'subcategory', 'reason_code', 'domain', 'r_value')),
  constraint quarterly_award_signal_unique unique (school_id, award_definition_id, source_type, source_key, signal_type)
);

create table if not exists public.quarterly_award_notifications (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  recipient_user_id uuid not null references auth.users(id) on delete cascade,
  award_period_id uuid not null references public.quarterly_award_periods(id) on delete cascade,
  notification_type text not null,
  title text not null,
  message text not null,
  action_url text not null default '/dashboard/admin/quarterly-honours',
  deduplication_key text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz,
  dismissed_at timestamptz,
  constraint quarterly_award_notification_type_valid check (
    notification_type in (
      'award_review_opening',
      'award_period_ending_soon',
      'award_period_ended',
      'awards_not_finalised',
      'score_run_failed'
    )
  ),
  constraint quarterly_award_notification_dedupe unique (recipient_user_id, deduplication_key)
);

create index if not exists idx_quarterly_award_period_school_status_dates
  on public.quarterly_award_periods(school_id, status, starts_on, ends_on);
create index if not exists idx_quarterly_award_run_period_created
  on public.quarterly_award_score_runs(award_period_id, created_at desc);
create index if not exists idx_quarterly_award_run_status
  on public.quarterly_award_score_runs(school_id, status, started_at desc);
create index if not exists idx_quarterly_award_score_list
  on public.quarterly_award_candidate_scores(award_period_id, award_definition_id, eligible, total_score desc)
  where is_current;
create index if not exists idx_quarterly_award_score_student_period
  on public.quarterly_award_candidate_scores(student_id, award_period_id, calculated_at desc);
create index if not exists idx_quarterly_award_review_list
  on public.quarterly_award_candidate_reviews(award_period_id, award_definition_id, review_status);
create index if not exists idx_quarterly_award_recipient_student_period
  on public.quarterly_award_recipients(student_id, award_period_id)
  where status in ('selected', 'finalised');
create index if not exists idx_quarterly_award_notification_inbox
  on public.quarterly_award_notifications(recipient_user_id, read_at, created_at desc)
  where dismissed_at is null;

-- ---------------------------------------------------------------------------
-- Update timestamps and period-overlap protection
-- ---------------------------------------------------------------------------

drop trigger if exists schools_set_updated_at on public.schools;
create trigger schools_set_updated_at before update on public.schools
for each row execute function public.set_updated_at();

drop trigger if exists academic_years_set_updated_at on public.academic_years;
create trigger academic_years_set_updated_at before update on public.academic_years
for each row execute function public.set_updated_at();

drop trigger if exists academic_calendar_days_set_updated_at on public.academic_calendar_days;
create trigger academic_calendar_days_set_updated_at before update on public.academic_calendar_days
for each row execute function public.set_updated_at();

drop trigger if exists student_enrolments_set_updated_at on public.student_enrolments;
create trigger student_enrolments_set_updated_at before update on public.student_enrolments
for each row execute function public.set_updated_at();

drop trigger if exists quarterly_award_definitions_set_updated_at on public.quarterly_award_definitions;
create trigger quarterly_award_definitions_set_updated_at before update on public.quarterly_award_definitions
for each row execute function public.set_updated_at();

drop trigger if exists quarterly_award_periods_set_updated_at on public.quarterly_award_periods;
create trigger quarterly_award_periods_set_updated_at before update on public.quarterly_award_periods
for each row execute function public.set_updated_at();

drop trigger if exists quarterly_award_reviews_set_updated_at on public.quarterly_award_candidate_reviews;
create trigger quarterly_award_reviews_set_updated_at before update on public.quarterly_award_candidate_reviews
for each row execute function public.set_updated_at();

drop trigger if exists quarterly_award_recipients_set_updated_at on public.quarterly_award_recipients;
create trigger quarterly_award_recipients_set_updated_at before update on public.quarterly_award_recipients
for each row execute function public.set_updated_at();

drop trigger if exists quarterly_award_signal_mappings_set_updated_at on public.quarterly_award_signal_mappings;
create trigger quarterly_award_signal_mappings_set_updated_at before update on public.quarterly_award_signal_mappings
for each row execute function public.set_updated_at();

create or replace function public.prevent_overlapping_quarterly_award_periods()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status <> 'archived' and exists (
    select 1
    from public.quarterly_award_periods p
    where p.school_id = new.school_id
      and p.id <> new.id
      and p.status <> 'archived'
      and daterange(p.starts_on, p.ends_on, '[]') && daterange(new.starts_on, new.ends_on, '[]')
  ) then
    raise exception 'Quarterly award periods may not overlap for the same school.';
  end if;
  return new;
end;
$$;

drop trigger if exists quarterly_award_period_overlap_guard on public.quarterly_award_periods;
create trigger quarterly_award_period_overlap_guard
before insert or update of school_id, starts_on, ends_on, status
on public.quarterly_award_periods
for each row execute function public.prevent_overlapping_quarterly_award_periods();

-- ---------------------------------------------------------------------------
-- Private, composable views. Client access is granted only in the security migration.
-- ---------------------------------------------------------------------------

create or replace view public.v_award_eligible_recognitions
with (security_invoker = true)
as
select
  rl.id,
  rl.school_id,
  rl.student_id,
  rl.staff_user_id,
  rl.staff_name_snapshot,
  rl.r_value_id,
  rv.key as r_key,
  rv.name as r_name,
  rl.domain_id,
  d.key as domain_key,
  d.name as domain_name,
  rl.point_value,
  rl.behaviour_note,
  rl.recognition_date,
  rl.source,
  rl.created_at
from public.recognition_logs rl
join public.students s on s.id = rl.student_id and s.school_id = rl.school_id
join public.r_values rv on rv.id = rl.r_value_id
join public.domains d on d.id = rl.domain_id
where rl.record_status = 'active'
  and rl.deleted_at is null
  and rl.point_value > 0
  and rl.admin_review_status in ('approved', 'not_required')
  and lower(coalesce(rl.source, '')) not in ('test', 'duplicate', 'draft', 'voided', 'reversed');

create or replace view public.v_current_award_candidate_scores
with (security_invoker = true)
as
select
  cs.*,
  ad.code as award_code,
  ad.name as award_name,
  ad.display_order,
  s.student_name,
  s.grade,
  s.section,
  s.house,
  coalesce(cr.review_status, 'unreviewed') as review_status,
  cr.internal_notes,
  cr.dismissal_reason,
  cr.public_citation_draft,
  qr.id as recipient_id,
  qr.status as recipient_status,
  qr.public_citation
from public.quarterly_award_candidate_scores cs
join public.quarterly_award_definitions ad on ad.id = cs.award_definition_id
join public.students s on s.id = cs.student_id and s.school_id = cs.school_id
left join public.quarterly_award_candidate_reviews cr
  on cr.award_period_id = cs.award_period_id
  and cr.award_definition_id = cs.award_definition_id
  and cr.student_id = cs.student_id
left join public.quarterly_award_recipients qr
  on qr.candidate_score_id = cs.id
  and qr.status in ('selected', 'finalised')
where cs.is_current = true;

revoke all on public.v_award_eligible_recognitions from anon, authenticated;
revoke all on public.v_current_award_candidate_scores from anon, authenticated;
grant select on public.v_award_eligible_recognitions to service_role;
grant select on public.v_current_award_candidate_scores to service_role;
