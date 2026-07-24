-- BHA League of Stars Recognition Framework v2
-- RBAC, RLS, invariant guards, audited authoritative mutations, idempotency,
-- exceptional approval, and reversal.

-- ---------------------------------------------------------------------------
-- Existing RBAC extensions
-- ---------------------------------------------------------------------------

insert into public.permissions (permission_name, description, category) values
  ('recognitions.nominate', 'Can submit exceptional recognition nominations', 'recognitions'),
  ('recognitions.nomination_review', 'Can approve or reject exceptional recognition nominations', 'recognitions'),
  ('recognitions.reverse', 'Can reverse recognition awards with an audited reason', 'recognitions'),
  ('recognitions.analytics', 'Can view recognition consistency and anti-inflation analytics', 'recognitions')
on conflict (permission_name) do update set
  description = excluded.description,
  category = excluded.category;

insert into public.role_permissions (role_name, permission_name)
select role_name, permission_name
from (
  values
    ('super_admin', 'recognitions.nominate'),
    ('admin', 'recognitions.nominate'),
    ('tarbiyah_leadership', 'recognitions.nominate'),
    ('house_mentor', 'recognitions.nominate'),
    ('teacher', 'recognitions.nominate'),
    ('support_staff', 'recognitions.nominate'),
    ('staff', 'recognitions.nominate'),
    ('super_admin', 'recognitions.nomination_review'),
    ('admin', 'recognitions.nomination_review'),
    ('tarbiyah_leadership', 'recognitions.nomination_review'),
    ('super_admin', 'recognitions.reverse'),
    ('admin', 'recognitions.reverse'),
    ('tarbiyah_leadership', 'recognitions.reverse'),
    ('super_admin', 'recognitions.analytics'),
    ('admin', 'recognitions.analytics'),
    ('tarbiyah_leadership', 'recognitions.analytics')
) as grants(role_name, permission_name)
where exists (select 1 from public.roles r where r.role_name = grants.role_name)
on conflict (role_name, permission_name) do nothing;

-- ---------------------------------------------------------------------------
-- Database invariants
-- ---------------------------------------------------------------------------

create or replace function public.validate_recognition_definition_value_link()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  definition_row public.recognition_definitions%rowtype;
  value_row public.graduate_values%rowtype;
begin
  select * into definition_row
  from public.recognition_definitions
  where id = new.recognition_definition_id;

  select * into value_row
  from public.graduate_values
  where id = new.graduate_value_id;

  if definition_row.id is null or value_row.id is null
    or definition_row.school_id <> new.school_id
    or value_row.school_id <> new.school_id then
    raise exception 'Recognition definition and Graduate Value must belong to the same school.';
  end if;

  if definition_row.r_value_id <> value_row.parent_r_value_id then
    raise exception 'Graduate Value must belong to the recognition definition''s 3R.';
  end if;

  return new;
end;
$$;

drop trigger if exists recognition_definition_value_validate on public.recognition_definition_graduate_values;
create trigger recognition_definition_value_validate
before insert or update on public.recognition_definition_graduate_values
for each row execute function public.validate_recognition_definition_value_link();

create or replace function public.protect_recognition_definition_identity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.school_id is distinct from old.school_id
    or new.code is distinct from old.code
    or new.r_value_id is distinct from old.r_value_id
    or new.fixed_points is distinct from old.fixed_points
    or new.award_mode is distinct from old.award_mode
    or new.framework_version is distinct from old.framework_version then
    raise exception 'Create a new framework version instead of changing a recognition definition''s identity or point value.';
  end if;
  return new;
end;
$$;

drop trigger if exists recognition_definition_identity_guard on public.recognition_definitions;
create trigger recognition_definition_identity_guard
before update on public.recognition_definitions
for each row execute function public.protect_recognition_definition_identity();

create or replace function public.audit_recognition_definition_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new is distinct from old then
    insert into public.audit_logs (
      school_id, user_id, action, table_name, record_id, old_data, new_data
    )
    values (
      new.school_id,
      auth.uid(),
      case
        when new.is_active is distinct from old.is_active then 'recognition.definition_activation_changed'
        else 'recognition.definition_wording_changed'
      end,
      'recognition_definitions',
      new.id::text,
      to_jsonb(old),
      to_jsonb(new)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists recognition_definition_audit on public.recognition_definitions;
create trigger recognition_definition_audit
after update on public.recognition_definitions
for each row execute function public.audit_recognition_definition_change();

create or replace function public.validate_recognition_v2_award()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  definition_row record;
  domain_code text;
  student_school uuid;
begin
  if new.framework_version <> 'recognition_v2' then
    return new;
  end if;

  select
    rd.school_id,
    rd.r_value_id,
    rd.label,
    rd.description,
    rd.fixed_points,
    rd.award_mode,
    rd.requires_note,
    rv.name as r_name
  into definition_row
  from public.recognition_definitions rd
  join public.r_values rv on rv.id = rd.r_value_id
  where rd.id = new.recognition_definition_id;

  select d.key into domain_code from public.domains d where d.id = new.domain_id and d.is_active;
  select s.school_id into student_school from public.students s where s.id = new.student_id;

  if definition_row.school_id is null
    or definition_row.school_id <> new.school_id
    or student_school <> new.school_id then
    raise exception 'Recognition definition, student, and award must belong to the same school.';
  end if;

  if domain_code is null or domain_code not in (
    'prayer_space', 'hallways_transitions', 'classroom_learning', 'lunch_recess', 'bathrooms'
  ) then
    raise exception 'Select one canonical recognition domain.';
  end if;

  if new.r_value_id <> definition_row.r_value_id
    or new.point_value <> definition_row.fixed_points
    or new.points_snapshot <> definition_row.fixed_points
    or new.r_value_snapshot <> definition_row.r_name
    or new.behaviour_label_snapshot <> definition_row.label
    or new.behaviour_description_snapshot <> definition_row.description
    or new.award_mode_snapshot <> definition_row.award_mode then
    raise exception 'Recognition snapshots must match the selected fixed definition.';
  end if;

  if definition_row.fixed_points = 20
    and char_length(btrim(coalesce(new.behaviour_note, ''))) < 15 then
    raise exception 'This recognition requires a short note describing what happened.';
  end if;

  if char_length(coalesce(new.behaviour_note, '')) > 500 then
    raise exception 'Recognition notes cannot exceed 500 characters.';
  end if;

  if definition_row.award_mode = 'nomination' and new.recognition_nomination_id is null then
    raise exception 'Exceptional recognition must be approved from a nomination.';
  end if;

  if definition_row.award_mode = 'direct' and new.recognition_nomination_id is not null then
    raise exception 'Direct recognition cannot be linked to an exceptional nomination.';
  end if;

  return new;
end;
$$;

drop trigger if exists recognition_v2_award_validate on public.recognition_logs;
create trigger recognition_v2_award_validate
before insert or update of
  school_id,
  student_id,
  recognition_definition_id,
  domain_id,
  r_value_id,
  point_value,
  points_snapshot,
  r_value_snapshot,
  behaviour_label_snapshot,
  behaviour_description_snapshot,
  award_mode_snapshot,
  behaviour_note,
  framework_version,
  recognition_nomination_id
on public.recognition_logs
for each row execute function public.validate_recognition_v2_award();

create or replace function public.validate_exceptional_nomination()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  definition_row record;
  student_school uuid;
  domain_code text;
begin
  select school_id, fixed_points, award_mode into definition_row
  from public.recognition_definitions
  where id = new.recognition_definition_id;
  select school_id into student_school from public.students where id = new.student_id;
  select key into domain_code from public.domains where id = new.domain_id and is_active;

  if definition_row.school_id is null
    or definition_row.school_id <> new.school_id
    or student_school <> new.school_id then
    raise exception 'Nomination records must remain within one school.';
  end if;
  if definition_row.fixed_points <> 50 or definition_row.award_mode <> 'nomination' then
    raise exception 'Only exceptional +50 definitions may be nominated.';
  end if;
  if domain_code is null or domain_code not in (
    'prayer_space', 'hallways_transitions', 'classroom_learning', 'lunch_recess', 'bathrooms'
  ) then
    raise exception 'Select one canonical recognition domain.';
  end if;
  return new;
end;
$$;

drop trigger if exists exceptional_nomination_validate on public.recognition_nominations;
create trigger exceptional_nomination_validate
before insert or update of school_id, student_id, recognition_definition_id, domain_id
on public.recognition_nominations
for each row execute function public.validate_exceptional_nomination();

-- ---------------------------------------------------------------------------
-- RLS: reads remain scoped; all mutations go through the functions below.
-- ---------------------------------------------------------------------------

alter table public.graduate_values enable row level security;
alter table public.recognition_definitions enable row level security;
alter table public.recognition_definition_graduate_values enable row level security;
alter table public.recognition_nominations enable row level security;

drop policy if exists "graduate values scoped read" on public.graduate_values;
create policy "graduate values scoped read"
on public.graduate_values for select
to authenticated
using (school_id = public.current_user_school_id());

drop policy if exists "recognition definitions scoped read" on public.recognition_definitions;
create policy "recognition definitions scoped read"
on public.recognition_definitions for select
to authenticated
using (school_id = public.current_user_school_id());

drop policy if exists "recognition definition values scoped read" on public.recognition_definition_graduate_values;
create policy "recognition definition values scoped read"
on public.recognition_definition_graduate_values for select
to authenticated
using (school_id = public.current_user_school_id());

drop policy if exists "recognition nominations own read" on public.recognition_nominations;
create policy "recognition nominations own read"
on public.recognition_nominations for select
to authenticated
using (
  school_id = public.current_user_school_id()
  and (
    nominated_by_profile_id = auth.uid()
    or public.current_user_has_permission('recognitions.nomination_review')
  )
);

drop policy if exists "recognition staff insert" on public.recognition_logs;
drop policy if exists "recognition scoped staff insert" on public.recognition_logs;
drop policy if exists "recognition admin update" on public.recognition_logs;
drop policy if exists "recognition scoped admin update" on public.recognition_logs;
drop policy if exists "audit authenticated insert" on public.audit_logs;

revoke insert, update, delete on public.recognition_logs from anon, authenticated;
revoke insert, update, delete on public.recognition_nominations from anon, authenticated;
revoke insert, update, delete on public.recognition_definitions from anon, authenticated;
revoke insert, update, delete on public.recognition_definition_graduate_values from anon, authenticated;
revoke insert, update, delete on public.graduate_values from anon, authenticated;
revoke insert, update, delete on public.audit_logs from anon, authenticated;

grant select on public.graduate_values to authenticated, service_role;
grant select on public.recognition_definitions to authenticated, service_role;
grant select on public.recognition_definition_graduate_values to authenticated, service_role;
grant select on public.recognition_nominations to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Shared result and snapshot helpers (not client-callable)
-- ---------------------------------------------------------------------------

create or replace function public.recognition_graduate_value_snapshot(
  p_definition_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'code', gv.code,
        'label', gv.display_label,
        'islamic_term', gv.islamic_term,
        'relationship', rdgv.relationship
      )
      order by case rdgv.relationship when 'primary' then 1 else 2 end
    ),
    '[]'::jsonb
  )
  from public.recognition_definition_graduate_values rdgv
  join public.graduate_values gv on gv.id = rdgv.graduate_value_id
  where rdgv.recognition_definition_id = p_definition_id;
$$;

create or replace function public.recognition_submission_result(
  p_school_id uuid,
  p_idempotency_key text
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'awards',
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id', rl.id,
          'student_id', rl.student_id,
          'student_name', rl.student_name_snapshot,
          'house', rl.house_snapshot,
          'points', rl.points_snapshot,
          'framework_version', rl.framework_version
        )
        order by rl.student_name_snapshot
      )
      from public.recognition_logs rl
      where rl.school_id = p_school_id
        and rl.submission_idempotency_key = p_idempotency_key
    ), '[]'::jsonb),
    'student_totals',
    coalesce((
      select jsonb_object_agg(t.student_id::text, t.total_points)
      from (
        select active.student_id, sum(active.points_snapshot)::integer as total_points
        from public.v_active_recognition_awards active
        where active.school_id = p_school_id
          and active.student_id in (
            select rl.student_id
            from public.recognition_logs rl
            where rl.school_id = p_school_id
              and rl.submission_idempotency_key = p_idempotency_key
          )
        group by active.student_id
      ) t
    ), '{}'::jsonb),
    'house_totals',
    coalesce((
      select jsonb_object_agg(t.house_snapshot, t.total_points)
      from (
        select active.house_snapshot, sum(active.points_snapshot)::integer as total_points
        from public.v_active_recognition_awards active
        where active.school_id = p_school_id
        group by active.house_snapshot
      ) t
    ), '{}'::jsonb)
  );
$$;

revoke all on function public.recognition_graduate_value_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.recognition_submission_result(uuid, text) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Authoritative direct/bulk award operation
-- ---------------------------------------------------------------------------

create or replace function public.create_recognition_awards_v2(
  p_student_ids uuid[],
  p_recognition_definition_code text,
  p_domain_code text,
  p_idempotency_key text,
  p_note text default null,
  p_observed_at timestamptz default now(),
  p_visibility text default 'student_parent'
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school_id uuid := public.current_user_school_id();
  student_ids uuid[];
  definition_row record;
  domain_row public.domains%rowtype;
  actor_name text;
  school_timezone text;
  note_value text := nullif(btrim(coalesce(p_note, '')), '');
  expected_count integer;
  existing_count integer;
  inserted_count integer;
  graduate_snapshot jsonb;
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'You must be signed in to award points.';
  end if;
  if actor_school_id is null or not public.current_user_has_permission('recognitions.create') then
    raise exception using errcode = '42501', message = 'You do not have permission to award points.';
  end if;

  select array_agg(distinct student_id order by student_id)
  into student_ids
  from unnest(coalesce(p_student_ids, '{}'::uuid[])) as requested(student_id)
  where student_id is not null;

  expected_count := coalesce(cardinality(student_ids), 0);
  if expected_count = 0 then raise exception 'Select at least one student.'; end if;
  if expected_count > 100 then raise exception 'A bulk recognition may include at most 100 students.'; end if;
  if char_length(btrim(coalesce(p_idempotency_key, ''))) not between 8 and 200 then
    raise exception 'A valid idempotency key is required.';
  end if;
  if p_visibility not in ('staff_only', 'student', 'parent', 'student_parent') then
    raise exception 'Valid visibility is required.';
  end if;

  select
    rd.*,
    rv.name as r_name
  into definition_row
  from public.recognition_definitions rd
  join public.r_values rv on rv.id = rd.r_value_id
  where rd.school_id = actor_school_id
    and rd.code = btrim(p_recognition_definition_code)
    and rd.is_active;

  if definition_row.id is null then
    raise exception 'The selected recognition is no longer active. Refresh and choose another.';
  end if;
  if definition_row.award_mode <> 'direct' or definition_row.fixed_points = 50 then
    raise exception 'Exceptional recognition must be submitted as a nomination.';
  end if;
  if definition_row.fixed_points = 20 and char_length(coalesce(note_value, '')) < 15 then
    raise exception 'This recognition requires a short note describing what happened.';
  end if;
  if char_length(coalesce(note_value, '')) > 500 then
    raise exception 'Recognition notes cannot exceed 500 characters.';
  end if;

  select * into domain_row
  from public.domains
  where key = btrim(p_domain_code)
    and is_active
    and key in ('prayer_space', 'hallways_transitions', 'classroom_learning', 'lunch_recess', 'bathrooms');
  if domain_row.id is null then raise exception 'Select where the behaviour occurred.'; end if;

  if (
    select count(*)
    from public.students s
    where s.school_id = actor_school_id
      and s.is_active
      and s.id = any(student_ids)
  ) <> expected_count then
    raise exception 'One or more selected students are unavailable.';
  end if;

  select count(*) into existing_count
  from public.recognition_logs rl
  where rl.school_id = actor_school_id
    and rl.submission_idempotency_key = btrim(p_idempotency_key);

  if existing_count > 0 then
    if existing_count <> expected_count or exists (
      select 1
      from public.recognition_logs rl
      where rl.school_id = actor_school_id
        and rl.submission_idempotency_key = btrim(p_idempotency_key)
        and (
          rl.student_id <> all(student_ids)
          or rl.recognition_definition_id <> definition_row.id
          or rl.domain_id <> domain_row.id
        )
    ) then
      raise exception 'This idempotency key was already used for another recognition.';
    end if;
    return public.recognition_submission_result(actor_school_id, btrim(p_idempotency_key));
  end if;

  select coalesce(p.staff_name, p.full_name, p.name, p.email, 'Staff')
  into actor_name
  from public.profiles p
  where p.id = actor_id and p.school_id = actor_school_id;
  select coalesce(s.timezone, 'UTC') into school_timezone
  from public.schools s where s.id = actor_school_id;
  graduate_snapshot := public.recognition_graduate_value_snapshot(definition_row.id);

  insert into public.recognition_logs (
    school_id,
    student_id,
    staff_user_id,
    staff_name_snapshot,
    student_name_snapshot,
    grade_snapshot,
    section_snapshot,
    house_snapshot,
    r_value_id,
    domain_id,
    point_value,
    behaviour_note,
    visibility,
    student_visible,
    parent_visible,
    admin_review_status,
    source,
    recognition_date,
    record_status,
    recognition_definition_id,
    framework_version,
    points_snapshot,
    r_value_snapshot,
    behaviour_label_snapshot,
    behaviour_description_snapshot,
    graduate_values_snapshot,
    award_mode_snapshot,
    observed_at,
    submission_idempotency_key,
    award_status
  )
  select
    actor_school_id,
    s.id,
    actor_id,
    actor_name,
    s.student_name,
    s.grade,
    s.section,
    s.house,
    definition_row.r_value_id,
    domain_row.id,
    definition_row.fixed_points,
    coalesce(note_value, ''),
    p_visibility,
    p_visibility in ('student', 'student_parent'),
    p_visibility in ('parent', 'student_parent'),
    'approved',
    'recognition_v2',
    (coalesce(p_observed_at, now()) at time zone school_timezone)::date,
    'active',
    definition_row.id,
    definition_row.framework_version,
    definition_row.fixed_points,
    definition_row.r_name,
    definition_row.label,
    definition_row.description,
    graduate_snapshot,
    definition_row.award_mode,
    coalesce(p_observed_at, now()),
    btrim(p_idempotency_key),
    'approved'
  from public.students s
  where s.school_id = actor_school_id
    and s.is_active
    and s.id = any(student_ids)
  on conflict (school_id, submission_idempotency_key, student_id)
    where submission_idempotency_key is not null
    do nothing;

  get diagnostics inserted_count = row_count;
  if inserted_count <> expected_count then
    raise exception 'This award has already been submitted.';
  end if;

  insert into public.audit_logs (
    school_id, user_id, action, table_name, record_id, new_data
  )
  select
    rl.school_id,
    actor_id,
    'recognition.created',
    'recognition_logs',
    rl.id::text,
    jsonb_build_object(
      'student_id', rl.student_id,
      'definition_code', definition_row.code,
      'domain_code', domain_row.key,
      'points', rl.points_snapshot,
      'framework_version', rl.framework_version,
      'submission_idempotency_key', rl.submission_idempotency_key
    )
  from public.recognition_logs rl
  where rl.school_id = actor_school_id
    and rl.submission_idempotency_key = btrim(p_idempotency_key);

  return public.recognition_submission_result(actor_school_id, btrim(p_idempotency_key));
end;
$$;

-- ---------------------------------------------------------------------------
-- Exceptional nomination submission and review
-- ---------------------------------------------------------------------------

create or replace function public.submit_recognition_nomination_v2(
  p_student_id uuid,
  p_recognition_definition_code text,
  p_domain_code text,
  p_explanation text,
  p_idempotency_key text,
  p_witness_information text default null,
  p_observed_at timestamptz default now()
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school_id uuid := public.current_user_school_id();
  definition_row public.recognition_definitions%rowtype;
  domain_row public.domains%rowtype;
  nomination_row public.recognition_nominations%rowtype;
  explanation_value text := btrim(coalesce(p_explanation, ''));
  witness_value text := nullif(btrim(coalesce(p_witness_information, '')), '');
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'You must be signed in to submit a nomination.';
  end if;
  if actor_school_id is null or not public.current_user_has_permission('recognitions.nominate') then
    raise exception using errcode = '42501', message = 'You do not have permission to submit exceptional nominations.';
  end if;
  if char_length(explanation_value) not between 20 and 500 then
    raise exception 'A nomination explanation between 20 and 500 characters is required.';
  end if;
  if char_length(coalesce(witness_value, '')) > 500 then
    raise exception 'Witness information cannot exceed 500 characters.';
  end if;
  if char_length(btrim(coalesce(p_idempotency_key, ''))) not between 8 and 200 then
    raise exception 'A valid idempotency key is required.';
  end if;

  select * into definition_row
  from public.recognition_definitions
  where school_id = actor_school_id
    and code = btrim(p_recognition_definition_code)
    and is_active;
  if definition_row.id is null then
    raise exception 'The selected recognition is no longer active. Refresh and choose another.';
  end if;
  if definition_row.award_mode <> 'nomination' or definition_row.fixed_points <> 50 then
    raise exception 'This behaviour is awarded directly and does not use nomination.';
  end if;

  select * into domain_row from public.domains
  where key = btrim(p_domain_code)
    and is_active
    and key in ('prayer_space', 'hallways_transitions', 'classroom_learning', 'lunch_recess', 'bathrooms');
  if domain_row.id is null then raise exception 'Select where the behaviour occurred.'; end if;

  if not exists (
    select 1 from public.students
    where id = p_student_id and school_id = actor_school_id and is_active
  ) then raise exception 'Student not found.'; end if;

  select * into nomination_row
  from public.recognition_nominations
  where school_id = actor_school_id
    and idempotency_key = btrim(p_idempotency_key);
  if nomination_row.id is not null then
    if nomination_row.student_id <> p_student_id
      or nomination_row.recognition_definition_id <> definition_row.id
      or nomination_row.domain_id <> domain_row.id then
      raise exception 'This idempotency key was already used for another nomination.';
    end if;
    return to_jsonb(nomination_row);
  end if;

  insert into public.recognition_nominations (
    school_id,
    student_id,
    recognition_definition_id,
    domain_id,
    nominated_by_profile_id,
    explanation,
    witness_information,
    observed_at,
    idempotency_key
  )
  values (
    actor_school_id,
    p_student_id,
    definition_row.id,
    domain_row.id,
    actor_id,
    explanation_value,
    witness_value,
    coalesce(p_observed_at, now()),
    btrim(p_idempotency_key)
  )
  returning * into nomination_row;

  insert into public.audit_logs (
    school_id, user_id, action, table_name, record_id, new_data
  )
  values (
    actor_school_id,
    actor_id,
    'recognition.nomination_submitted',
    'recognition_nominations',
    nomination_row.id::text,
    jsonb_build_object(
      'student_id', p_student_id,
      'definition_code', definition_row.code,
      'domain_code', domain_row.key,
      'status', 'pending'
    )
  );

  return to_jsonb(nomination_row);
end;
$$;

create or replace function public.review_recognition_nomination_v2(
  p_nomination_id uuid,
  p_decision text,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school_id uuid := public.current_user_school_id();
  nomination_row public.recognition_nominations%rowtype;
  definition_row record;
  domain_row public.domains%rowtype;
  student_row public.students%rowtype;
  nominator_name text;
  school_timezone text;
  graduate_snapshot jsonb;
  award_id uuid;
  review_note_value text := nullif(btrim(coalesce(p_review_note, '')), '');
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'You must be signed in to review nominations.';
  end if;
  if actor_school_id is null or not public.current_user_has_permission('recognitions.nomination_review') then
    raise exception using errcode = '42501', message = 'You do not have permission to review exceptional nominations.';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;
  if p_decision = 'rejected' and char_length(coalesce(review_note_value, '')) < 5 then
    raise exception 'Add a brief review note when rejecting a nomination.';
  end if;
  if char_length(coalesce(review_note_value, '')) > 500 then
    raise exception 'Review notes cannot exceed 500 characters.';
  end if;

  select * into nomination_row
  from public.recognition_nominations
  where id = p_nomination_id and school_id = actor_school_id
  for update;
  if nomination_row.id is null then raise exception 'Nomination not found.'; end if;

  if nomination_row.status <> 'pending' then
    if nomination_row.status = p_decision then return to_jsonb(nomination_row); end if;
    raise exception 'This nomination has already been reviewed.';
  end if;

  if p_decision = 'rejected' then
    update public.recognition_nominations
    set status = 'rejected',
        reviewed_by_profile_id = actor_id,
        review_note = review_note_value,
        reviewed_at = now()
    where id = nomination_row.id
    returning * into nomination_row;

    insert into public.audit_logs (
      school_id, user_id, action, table_name, record_id, old_data, new_data
    )
    values (
      actor_school_id,
      actor_id,
      'recognition.nomination_rejected',
      'recognition_nominations',
      nomination_row.id::text,
      jsonb_build_object('status', 'pending'),
      jsonb_build_object('status', 'rejected', 'review_note', review_note_value)
    );
    return to_jsonb(nomination_row);
  end if;

  select rd.*, rv.name as r_name into definition_row
  from public.recognition_definitions rd
  join public.r_values rv on rv.id = rd.r_value_id
  where rd.id = nomination_row.recognition_definition_id
    and rd.school_id = actor_school_id
    and rd.is_active
    and rd.award_mode = 'nomination'
    and rd.fixed_points = 50;
  if definition_row.id is null then
    raise exception 'The exceptional recognition definition is no longer active.';
  end if;

  select * into domain_row from public.domains
  where id = nomination_row.domain_id
    and is_active
    and key in ('prayer_space', 'hallways_transitions', 'classroom_learning', 'lunch_recess', 'bathrooms');
  if domain_row.id is null then raise exception 'The selected domain is no longer active.'; end if;

  select * into student_row from public.students
  where id = nomination_row.student_id and school_id = actor_school_id and is_active
  for share;
  if student_row.id is null then raise exception 'The nominated student is unavailable.'; end if;

  select coalesce(p.staff_name, p.full_name, p.name, p.email, 'Staff')
  into nominator_name
  from public.profiles p
  where p.id = nomination_row.nominated_by_profile_id and p.school_id = actor_school_id;
  select coalesce(s.timezone, 'UTC') into school_timezone
  from public.schools s where s.id = actor_school_id;
  graduate_snapshot := public.recognition_graduate_value_snapshot(definition_row.id);

  insert into public.recognition_logs (
    school_id,
    student_id,
    staff_user_id,
    staff_name_snapshot,
    student_name_snapshot,
    grade_snapshot,
    section_snapshot,
    house_snapshot,
    r_value_id,
    domain_id,
    point_value,
    behaviour_note,
    visibility,
    student_visible,
    parent_visible,
    admin_review_status,
    source,
    recognition_date,
    record_status,
    recognition_definition_id,
    framework_version,
    points_snapshot,
    r_value_snapshot,
    behaviour_label_snapshot,
    behaviour_description_snapshot,
    graduate_values_snapshot,
    award_mode_snapshot,
    observed_at,
    submission_idempotency_key,
    award_status,
    recognition_nomination_id
  )
  values (
    actor_school_id,
    student_row.id,
    nomination_row.nominated_by_profile_id,
    coalesce(nominator_name, 'Staff'),
    student_row.student_name,
    student_row.grade,
    student_row.section,
    student_row.house,
    definition_row.r_value_id,
    domain_row.id,
    definition_row.fixed_points,
    nomination_row.explanation,
    'student_parent',
    true,
    true,
    'approved',
    'recognition_v2_nomination',
    (nomination_row.observed_at at time zone school_timezone)::date,
    'active',
    definition_row.id,
    definition_row.framework_version,
    definition_row.fixed_points,
    definition_row.r_name,
    definition_row.label,
    definition_row.description,
    graduate_snapshot,
    definition_row.award_mode,
    nomination_row.observed_at,
    'nomination:' || nomination_row.id::text,
    'approved',
    nomination_row.id
  )
  returning id into award_id;

  update public.recognition_nominations
  set status = 'approved',
      reviewed_by_profile_id = actor_id,
      review_note = review_note_value,
      reviewed_at = now(),
      approved_award_id = award_id
  where id = nomination_row.id
  returning * into nomination_row;

  insert into public.audit_logs (
    school_id, user_id, action, table_name, record_id, old_data, new_data
  )
  values
    (
      actor_school_id,
      actor_id,
      'recognition.nomination_approved',
      'recognition_nominations',
      nomination_row.id::text,
      jsonb_build_object('status', 'pending'),
      jsonb_build_object('status', 'approved', 'approved_award_id', award_id, 'review_note', review_note_value)
    ),
    (
      actor_school_id,
      actor_id,
      'recognition.created_from_nomination',
      'recognition_logs',
      award_id::text,
      null,
      jsonb_build_object('nomination_id', nomination_row.id, 'points', 50)
    );

  return to_jsonb(nomination_row);
end;
$$;

create or replace function public.withdraw_recognition_nomination_v2(
  p_nomination_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school_id uuid := public.current_user_school_id();
  nomination_row public.recognition_nominations%rowtype;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'You must be signed in.'; end if;
  update public.recognition_nominations
  set status = 'withdrawn'
  where id = p_nomination_id
    and school_id = actor_school_id
    and nominated_by_profile_id = actor_id
    and status = 'pending'
  returning * into nomination_row;
  if nomination_row.id is null then raise exception 'Only your own pending nomination can be withdrawn.'; end if;

  insert into public.audit_logs (school_id, user_id, action, table_name, record_id, new_data)
  values (
    actor_school_id,
    actor_id,
    'recognition.nomination_withdrawn',
    'recognition_nominations',
    nomination_row.id::text,
    jsonb_build_object('status', 'withdrawn')
  );
  return to_jsonb(nomination_row);
end;
$$;

-- ---------------------------------------------------------------------------
-- Audited reversal and controlled definition activation
-- ---------------------------------------------------------------------------

create or replace function public.reverse_recognition_award_v2(
  p_award_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school_id uuid := public.current_user_school_id();
  award_row public.recognition_logs%rowtype;
  reason_value text := btrim(coalesce(p_reason, ''));
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'You must be signed in.'; end if;
  if actor_school_id is null or not public.current_user_has_permission('recognitions.reverse') then
    raise exception using errcode = '42501', message = 'You do not have permission to reverse awards.';
  end if;
  if char_length(reason_value) not between 10 and 500 then
    raise exception 'A reversal reason between 10 and 500 characters is required.';
  end if;

  select * into award_row from public.recognition_logs
  where id = p_award_id and school_id = actor_school_id
  for update;
  if award_row.id is null then raise exception 'Recognition award not found.'; end if;
  if award_row.award_status = 'reversed' or award_row.record_status in ('reversed', 'voided') then
    return to_jsonb(award_row);
  end if;

  update public.recognition_logs
  set award_status = 'reversed',
      record_status = 'reversed',
      reversed_by_profile_id = actor_id,
      reversed_at = now(),
      reversal_reason = reason_value
  where id = award_row.id
  returning * into award_row;

  insert into public.audit_logs (
    school_id, user_id, action, table_name, record_id, old_data, new_data
  )
  values (
    actor_school_id,
    actor_id,
    'recognition.reversed',
    'recognition_logs',
    award_row.id::text,
    jsonb_build_object('award_status', 'approved', 'record_status', 'active'),
    jsonb_build_object('award_status', 'reversed', 'record_status', 'reversed', 'reason', reason_value)
  );
  return to_jsonb(award_row);
end;
$$;

create or replace function public.set_recognition_definition_active_v2(
  p_definition_code text,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school_id uuid := public.current_user_school_id();
  definition_row public.recognition_definitions%rowtype;
begin
  if actor_id is null then raise exception using errcode = '42501', message = 'You must be signed in.'; end if;
  if actor_school_id is null or not public.current_user_has_permission('system.configure') then
    raise exception using errcode = '42501', message = 'You do not have permission to configure recognition definitions.';
  end if;

  update public.recognition_definitions
  set is_active = p_is_active
  where school_id = actor_school_id and code = btrim(p_definition_code)
  returning * into definition_row;
  if definition_row.id is null then raise exception 'Recognition definition not found.'; end if;
  return to_jsonb(definition_row);
end;
$$;

-- ---------------------------------------------------------------------------
-- Function access
-- ---------------------------------------------------------------------------

revoke all on function public.create_recognition_awards_v2(uuid[], text, text, text, text, timestamptz, text) from public, anon;
revoke all on function public.submit_recognition_nomination_v2(uuid, text, text, text, text, text, timestamptz) from public, anon;
revoke all on function public.review_recognition_nomination_v2(uuid, text, text) from public, anon;
revoke all on function public.withdraw_recognition_nomination_v2(uuid) from public, anon;
revoke all on function public.reverse_recognition_award_v2(uuid, text) from public, anon;
revoke all on function public.set_recognition_definition_active_v2(text, boolean) from public, anon;

grant execute on function public.create_recognition_awards_v2(uuid[], text, text, text, text, timestamptz, text) to authenticated, service_role;
grant execute on function public.submit_recognition_nomination_v2(uuid, text, text, text, text, text, timestamptz) to authenticated, service_role;
grant execute on function public.review_recognition_nomination_v2(uuid, text, text) to authenticated, service_role;
grant execute on function public.withdraw_recognition_nomination_v2(uuid) to authenticated, service_role;
grant execute on function public.reverse_recognition_award_v2(uuid, text) to authenticated, service_role;
grant execute on function public.set_recognition_definition_active_v2(text, boolean) to authenticated, service_role;
