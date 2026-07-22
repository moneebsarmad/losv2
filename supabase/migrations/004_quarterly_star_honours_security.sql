-- Quarterly Star Honours RBAC, RLS and audited workflow functions

-- ---------------------------------------------------------------------------
-- Permissions: extend the existing role_permissions model.
-- ---------------------------------------------------------------------------

insert into public.permissions (permission_name, description, category) values
  ('honours.view', 'Can view Quarterly Star Honours data', 'quarterly_honours'),
  ('honours.refresh', 'Can trigger ordinary Quarterly Star Honours refreshes', 'quarterly_honours'),
  ('honours.review', 'Can review and select Quarterly Star Honours candidates', 'quarterly_honours'),
  ('honours.finalise', 'Can finalise Quarterly Star Honours outcomes', 'quarterly_honours'),
  ('honours.configure', 'Can configure Quarterly Star Honours periods and definitions', 'quarterly_honours'),
  ('honours.reopen', 'Can reopen finalised Quarterly Star Honours periods', 'quarterly_honours'),
  ('honours.revoke', 'Can revoke or correct finalised Quarterly Star Honours', 'quarterly_honours'),
  ('honours.export', 'Can export Quarterly Star Honours summaries', 'quarterly_honours'),
  ('honours.diagnostics', 'Can view Quarterly Star Honours calculation diagnostics', 'quarterly_honours')
on conflict (permission_name) do update set
  description = excluded.description,
  category = excluded.category;

insert into public.role_permissions (role_name, permission_name) values
  ('super_admin', 'honours.view'),
  ('super_admin', 'honours.refresh'),
  ('super_admin', 'honours.review'),
  ('super_admin', 'honours.finalise'),
  ('super_admin', 'honours.configure'),
  ('super_admin', 'honours.reopen'),
  ('super_admin', 'honours.revoke'),
  ('super_admin', 'honours.export'),
  ('super_admin', 'honours.diagnostics'),
  ('admin', 'honours.view'),
  ('admin', 'honours.refresh'),
  ('admin', 'honours.review'),
  ('admin', 'honours.finalise'),
  ('admin', 'honours.export'),
  ('tarbiyah_leadership', 'honours.view'),
  ('tarbiyah_leadership', 'honours.review'),
  ('tarbiyah_leadership', 'honours.finalise'),
  ('tarbiyah_leadership', 'honours.export')
on conflict (role_name, permission_name) do nothing;

-- ---------------------------------------------------------------------------
-- Identity helpers. All client-callable helpers derive identity from auth.uid().
-- ---------------------------------------------------------------------------

create or replace function public.get_current_user_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.role in (
      'super_admin', 'admin', 'tarbiyah_leadership', 'house_mentor',
      'teacher', 'support_staff', 'staff', 'student', 'parent'
    );
$$;

create or replace function public.current_user_school_id()
returns uuid
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.school_id
  from public.profiles p
  where p.id = auth.uid()
    and p.role in (
      'super_admin', 'admin', 'tarbiyah_leadership', 'house_mentor',
      'teacher', 'support_staff', 'staff', 'student', 'parent'
    );
$$;

create or replace function public.has_admin_portal_access()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role in ('super_admin', 'admin', 'tarbiyah_leadership')
  );
$$;

create or replace function public.current_user_has_permission(permission_to_check text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_name = p.role
    where p.id = auth.uid()
      and p.role in (
        'super_admin', 'admin', 'tarbiyah_leadership', 'house_mentor',
        'teacher', 'support_staff', 'staff', 'student', 'parent'
      )
      and rp.permission_name = permission_to_check
  );
$$;

revoke all on function public.get_user_role(uuid) from public, anon, authenticated;
revoke all on function public.has_permission(uuid, text) from public, anon, authenticated;
revoke all on function public.is_admin_user(uuid) from public, anon, authenticated;
revoke all on function public.get_current_user_role() from public;
revoke all on function public.current_user_school_id() from public;
revoke all on function public.has_admin_portal_access() from public;
revoke all on function public.current_user_has_permission(text) from public;
grant execute on function public.get_current_user_role() to authenticated, service_role;
grant execute on function public.current_user_school_id() to authenticated, service_role;
grant execute on function public.has_admin_portal_access() to authenticated, service_role;
grant execute on function public.current_user_has_permission(text) to authenticated, service_role;

-- Prevent self-service changes to role or school scope, even through a permissive profile policy.
create or replace function public.protect_profile_security_fields()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if (new.role is distinct from old.role or new.school_id is distinct from old.school_id)
    and coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Profile role and school scope are administrator-managed.';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_protect_security_fields on public.profiles;
create trigger profiles_protect_security_fields
before update of role, school_id on public.profiles
for each row execute function public.protect_profile_security_fields();

-- ---------------------------------------------------------------------------
-- Tenant-aware revisions to existing RLS policies.
-- ---------------------------------------------------------------------------

drop policy if exists "profiles select admin" on public.profiles;
create policy "profiles select same school admin"
on public.profiles for select
to authenticated
using (
  public.has_admin_portal_access()
  and school_id = public.current_user_school_id()
);

drop policy if exists "students staff admin read" on public.students;
create policy "students scoped read"
on public.students for select
to authenticated
using (
  school_id = public.current_user_school_id()
  and (
    public.current_user_has_permission('students.view_all')
    or public.current_user_has_permission('recognitions.create')
    or exists (
      select 1 from public.student_user_links sul
      where sul.school_id = students.school_id
        and sul.user_id = auth.uid()
        and sul.student_id = students.id
    )
    or exists (
      select 1 from public.parent_student_links psl
      where psl.school_id = students.school_id
        and psl.parent_user_id = auth.uid()
        and psl.student_id = students.id
    )
  )
);

drop policy if exists "students admin manage" on public.students;
create policy "students scoped admin manage"
on public.students for all
to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('students.manage')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('students.manage')
);

drop policy if exists "student links own read" on public.student_user_links;
create policy "student links scoped own read"
on public.student_user_links for select
to authenticated
using (
  school_id = public.current_user_school_id()
  and (user_id = auth.uid() or public.current_user_has_permission('students.manage'))
);

drop policy if exists "student links admin manage" on public.student_user_links;
create policy "student links scoped admin manage"
on public.student_user_links for all
to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('students.manage')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('students.manage')
);

drop policy if exists "parent links own read" on public.parent_student_links;
create policy "parent links scoped own read"
on public.parent_student_links for select
to authenticated
using (
  school_id = public.current_user_school_id()
  and (parent_user_id = auth.uid() or public.current_user_has_permission('families.manage'))
);

drop policy if exists "parent links admin manage" on public.parent_student_links;
create policy "parent links scoped admin manage"
on public.parent_student_links for all
to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('families.manage')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('families.manage')
);

drop policy if exists "recognition staff insert" on public.recognition_logs;
create policy "recognition scoped staff insert"
on public.recognition_logs for insert
to authenticated
with check (
  school_id = public.current_user_school_id()
  and staff_user_id = auth.uid()
  and public.current_user_has_permission('recognitions.create')
);

drop policy if exists "recognition admin read all" on public.recognition_logs;
create policy "recognition scoped admin read all"
on public.recognition_logs for select
to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('recognitions.view_all')
);

drop policy if exists "recognition staff read own" on public.recognition_logs;
create policy "recognition scoped staff read own"
on public.recognition_logs for select
to authenticated
using (school_id = public.current_user_school_id() and staff_user_id = auth.uid());

drop policy if exists "recognition student visible read" on public.recognition_logs;
create policy "recognition scoped student visible read"
on public.recognition_logs for select
to authenticated
using (
  school_id = public.current_user_school_id()
  and student_visible = true
  and record_status = 'active'
  and deleted_at is null
  and admin_review_status in ('approved', 'not_required')
  and exists (
    select 1 from public.student_user_links sul
    where sul.school_id = recognition_logs.school_id
      and sul.user_id = auth.uid()
      and sul.student_id = recognition_logs.student_id
  )
);

drop policy if exists "recognition parent visible read" on public.recognition_logs;
create policy "recognition scoped parent visible read"
on public.recognition_logs for select
to authenticated
using (
  school_id = public.current_user_school_id()
  and parent_visible = true
  and record_status = 'active'
  and deleted_at is null
  and admin_review_status in ('approved', 'not_required')
  and exists (
    select 1 from public.parent_student_links psl
    where psl.school_id = recognition_logs.school_id
      and psl.parent_user_id = auth.uid()
      and psl.student_id = recognition_logs.student_id
  )
);

drop policy if exists "recognition admin update" on public.recognition_logs;
create policy "recognition scoped admin update"
on public.recognition_logs for update
to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('recognitions.review')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('recognitions.review')
);

drop policy if exists "house events read authenticated" on public.house_events;
create policy "house events scoped read authenticated"
on public.house_events for select
to authenticated
using (school_id = public.current_user_school_id());

drop policy if exists "house events admin manage" on public.house_events;
create policy "house events scoped admin manage"
on public.house_events for all
to authenticated
using (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('recognitions.view_all')
)
with check (
  school_id = public.current_user_school_id()
  and public.current_user_has_permission('recognitions.view_all')
);

drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit scoped admin read"
on public.audit_logs for select
to authenticated
using (
  school_id = public.current_user_school_id()
  and (
    public.current_user_has_permission('audit.view')
    or public.current_user_has_permission('honours.view')
  )
);

drop policy if exists "audit authenticated insert" on public.audit_logs;
create policy "audit scoped authenticated insert"
on public.audit_logs for insert
to authenticated
with check (school_id = public.current_user_school_id() and user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Honours RLS. No non-admin role receives a qualifying policy.
-- ---------------------------------------------------------------------------

alter table public.schools enable row level security;
alter table public.academic_years enable row level security;
alter table public.academic_calendar_days enable row level security;
alter table public.student_enrolments enable row level security;
alter table public.quarterly_award_definitions enable row level security;
alter table public.quarterly_award_periods enable row level security;
alter table public.quarterly_award_score_runs enable row level security;
alter table public.quarterly_award_candidate_scores enable row level security;
alter table public.quarterly_award_candidate_reviews enable row level security;
alter table public.quarterly_award_recipients enable row level security;
alter table public.quarterly_award_signal_mappings enable row level security;
alter table public.quarterly_award_notifications enable row level security;

create policy "schools own admin read" on public.schools for select to authenticated
using (public.has_admin_portal_access() and id = public.current_user_school_id());

create policy "academic years own admin read" on public.academic_years for select to authenticated
using (public.has_admin_portal_access() and school_id = public.current_user_school_id());

create policy "calendar own admin read" on public.academic_calendar_days for select to authenticated
using (public.has_admin_portal_access() and school_id = public.current_user_school_id());

create policy "enrolments own admin read" on public.student_enrolments for select to authenticated
using (public.has_admin_portal_access() and school_id = public.current_user_school_id());

create policy "award definitions own admin read" on public.quarterly_award_definitions for select to authenticated
using (
  public.has_admin_portal_access()
  and (school_id is null or school_id = public.current_user_school_id())
);

create policy "award periods own admin read" on public.quarterly_award_periods for select to authenticated
using (public.has_admin_portal_access() and school_id = public.current_user_school_id());

create policy "award runs own admin read" on public.quarterly_award_score_runs for select to authenticated
using (public.has_admin_portal_access() and school_id = public.current_user_school_id());

create policy "award scores own admin read" on public.quarterly_award_candidate_scores for select to authenticated
using (public.has_admin_portal_access() and school_id = public.current_user_school_id());

create policy "award reviews own admin read" on public.quarterly_award_candidate_reviews for select to authenticated
using (public.has_admin_portal_access() and school_id = public.current_user_school_id());

create policy "award recipients own admin read" on public.quarterly_award_recipients for select to authenticated
using (public.has_admin_portal_access() and school_id = public.current_user_school_id());

create policy "award mappings own admin read" on public.quarterly_award_signal_mappings for select to authenticated
using (public.has_admin_portal_access() and school_id = public.current_user_school_id());

create policy "award notifications recipient read" on public.quarterly_award_notifications for select to authenticated
using (
  public.has_admin_portal_access()
  and school_id = public.current_user_school_id()
  and recipient_user_id = auth.uid()
);

revoke all on public.schools from anon;
revoke all on public.academic_years from anon;
revoke all on public.academic_calendar_days from anon;
revoke all on public.student_enrolments from anon;
revoke all on public.quarterly_award_definitions from anon;
revoke all on public.quarterly_award_periods from anon;
revoke all on public.quarterly_award_score_runs from anon;
revoke all on public.quarterly_award_candidate_scores from anon;
revoke all on public.quarterly_award_candidate_reviews from anon;
revoke all on public.quarterly_award_recipients from anon;
revoke all on public.quarterly_award_signal_mappings from anon;
revoke all on public.quarterly_award_notifications from anon;

revoke insert, update, delete on public.quarterly_award_definitions from authenticated;
revoke insert, update, delete on public.quarterly_award_periods from authenticated;
revoke insert, update, delete on public.quarterly_award_score_runs from authenticated;
revoke insert, update, delete on public.quarterly_award_candidate_scores from authenticated;
revoke insert, update, delete on public.quarterly_award_candidate_reviews from authenticated;
revoke insert, update, delete on public.quarterly_award_recipients from authenticated;
revoke insert, update, delete on public.quarterly_award_signal_mappings from authenticated;
revoke insert, update, delete on public.quarterly_award_notifications from authenticated;

grant select on public.schools to authenticated;
grant select on public.academic_years to authenticated;
grant select on public.academic_calendar_days to authenticated;
grant select on public.student_enrolments to authenticated;
grant select on public.quarterly_award_definitions to authenticated;
grant select on public.quarterly_award_periods to authenticated;
grant select on public.quarterly_award_score_runs to authenticated;
grant select on public.quarterly_award_candidate_scores to authenticated;
grant select on public.quarterly_award_candidate_reviews to authenticated;
grant select on public.quarterly_award_recipients to authenticated;
grant select on public.quarterly_award_signal_mappings to authenticated;
grant select on public.quarterly_award_notifications to authenticated;

-- Ensure honours tables are never added to realtime accidentally by this migration.
do $$
declare
  table_name_to_remove text;
begin
  foreach table_name_to_remove in array array[
    'quarterly_award_definitions',
    'quarterly_award_periods',
    'quarterly_award_score_runs',
    'quarterly_award_candidate_scores',
    'quarterly_award_candidate_reviews',
    'quarterly_award_recipients',
    'quarterly_award_signal_mappings',
    'quarterly_award_notifications'
  ]
  loop
    if exists (
      select 1 from pg_catalog.pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name_to_remove
    ) then
      execute format('alter publication supabase_realtime drop table public.%I', table_name_to_remove);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Internal audit helper (not granted to clients).
-- ---------------------------------------------------------------------------

create or replace function public.write_honours_audit(
  p_school_id uuid,
  p_action text,
  p_table_name text,
  p_record_id text,
  p_old_data jsonb,
  p_new_data jsonb
)
returns void
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  insert into public.audit_logs (
    school_id, user_id, action, table_name, record_id, old_data, new_data
  ) values (
    p_school_id, auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data
  );
end;
$$;

revoke all on function public.write_honours_audit(uuid, text, text, text, jsonb, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Period configuration.
-- ---------------------------------------------------------------------------

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
  period_row public.quarterly_award_periods;
begin
  if actor_id is null or not public.current_user_has_permission('honours.configure') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  actor_school := public.current_user_school_id();
  if actor_school is null then
    raise exception 'School scope is required.';
  end if;
  if p_starts_on is null or p_ends_on is null or p_starts_on > p_ends_on then
    raise exception 'Valid period dates are required.';
  end if;

  select ay.id into year_id
  from public.academic_years ay
  where ay.school_id = actor_school
    and ay.starts_on <= p_starts_on
    and ay.ends_on >= p_ends_on
  order by ay.starts_on desc
  limit 1;

  if year_id is null then
    insert into public.academic_years (
      school_id, code, name, starts_on, ends_on, created_by
    ) values (
      actor_school,
      extract(year from p_starts_on)::text || '-' || extract(year from p_ends_on)::text,
      extract(year from p_starts_on)::text || '-' || extract(year from p_ends_on)::text || ' Academic Year',
      p_starts_on,
      p_ends_on,
      actor_id
    )
    returning id into year_id;
  end if;

  insert into public.academic_calendar_days (
    school_id, academic_year_id, calendar_date, is_instructional, label
  )
  select
    actor_school,
    year_id,
    day_value::date,
    true,
    'Scheduled instructional day'
  from generate_series(p_starts_on, p_ends_on, interval '1 day') day_value
  where extract(isodow from day_value) between 1 and 5
  on conflict (school_id, calendar_date) do nothing;

  insert into public.quarterly_award_periods (
    school_id,
    academic_year_id,
    code,
    name,
    starts_on,
    ends_on,
    review_opens_at,
    status,
    baseline_period_id,
    recipient_limit_per_award,
    created_by
  ) values (
    actor_school,
    year_id,
    trim(p_code),
    trim(p_name),
    p_starts_on,
    p_ends_on,
    p_review_opens_at,
    case
      when current_date < p_starts_on then 'upcoming'
      when current_date > p_ends_on then 'review_open'
      else 'active'
    end,
    p_baseline_period_id,
    p_recipient_limit,
    actor_id
  ) returning * into period_row;

  perform public.write_honours_audit(
    actor_school,
    'quarterly_honours.period_created',
    'quarterly_award_periods',
    period_row.id::text,
    null,
    to_jsonb(period_row)
  );

  return to_jsonb(period_row);
end;
$$;

-- ---------------------------------------------------------------------------
-- Candidate review and recipient workflow.
-- ---------------------------------------------------------------------------

create or replace function public.update_quarterly_award_review(
  p_candidate_score_id uuid,
  p_review_status text,
  p_internal_notes text default null,
  p_dismissal_reason text default null,
  p_public_citation_draft text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  candidate_row public.quarterly_award_candidate_scores;
  old_row public.quarterly_award_candidate_reviews;
  review_row public.quarterly_award_candidate_reviews;
begin
  if actor_id is null or not public.current_user_has_permission('honours.review') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  if p_review_status not in ('unreviewed', 'shortlisted', 'dismissed') then
    raise exception 'Invalid review status.';
  end if;
  if p_review_status = 'dismissed' and nullif(trim(coalesce(p_dismissal_reason, '')), '') is null then
    raise exception 'A dismissal reason is required.';
  end if;

  actor_school := public.current_user_school_id();
  select * into candidate_row
  from public.quarterly_award_candidate_scores cs
  where cs.id = p_candidate_score_id
    and cs.school_id = actor_school
    and cs.is_current = true;
  if not found then
    raise exception 'Current candidate score not found.';
  end if;
  if not exists (
    select 1 from public.quarterly_award_periods p
    where p.id = candidate_row.award_period_id
      and p.school_id = actor_school
      and p.status in ('active', 'review_open')
  ) then
    raise exception 'This award period is not open for review.';
  end if;

  select * into old_row
  from public.quarterly_award_candidate_reviews cr
  where cr.award_period_id = candidate_row.award_period_id
    and cr.award_definition_id = candidate_row.award_definition_id
    and cr.student_id = candidate_row.student_id;

  insert into public.quarterly_award_candidate_reviews (
    school_id,
    award_period_id,
    award_definition_id,
    student_id,
    candidate_score_id,
    review_status,
    internal_notes,
    dismissal_reason,
    public_citation_draft,
    reviewed_by,
    reviewed_at
  ) values (
    actor_school,
    candidate_row.award_period_id,
    candidate_row.award_definition_id,
    candidate_row.student_id,
    candidate_row.id,
    p_review_status,
    nullif(trim(coalesce(p_internal_notes, '')), ''),
    case when p_review_status = 'dismissed' then trim(p_dismissal_reason) else null end,
    nullif(trim(coalesce(p_public_citation_draft, '')), ''),
    actor_id,
    now()
  )
  on conflict (award_period_id, award_definition_id, student_id)
  do update set
    candidate_score_id = excluded.candidate_score_id,
    review_status = excluded.review_status,
    internal_notes = excluded.internal_notes,
    dismissal_reason = excluded.dismissal_reason,
    public_citation_draft = excluded.public_citation_draft,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at,
    updated_at = now()
  returning * into review_row;

  perform public.write_honours_audit(
    actor_school,
    case
      when p_review_status = 'unreviewed' then 'quarterly_honours.candidate_restored'
      else 'quarterly_honours.candidate_' || p_review_status
    end,
    'quarterly_award_candidate_reviews',
    review_row.id::text,
    case when old_row.id is null then null else to_jsonb(old_row) end,
    to_jsonb(review_row)
  );
  return to_jsonb(review_row);
end;
$$;

create or replace function public.select_quarterly_award_recipient(
  p_candidate_score_id uuid,
  p_internal_selection_note text default null,
  p_public_citation text default null,
  p_override_reason text default null,
  p_scope_type text default 'school',
  p_scope_key text default 'school',
  p_recipient_slot integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  actor_role text;
  candidate_row public.quarterly_award_candidate_scores;
  recipient_row public.quarterly_award_recipients;
  overlap_record jsonb;
begin
  if actor_id is null or not public.current_user_has_permission('honours.review') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  actor_school := public.current_user_school_id();
  actor_role := public.get_current_user_role();

  select * into candidate_row
  from public.quarterly_award_candidate_scores cs
  where cs.id = p_candidate_score_id
    and cs.school_id = actor_school
    and cs.is_current = true;
  if not found then
    raise exception 'Current candidate score not found.';
  end if;
  if not exists (
    select 1 from public.quarterly_award_periods p
    where p.id = candidate_row.award_period_id
      and p.school_id = actor_school
      and p.status in ('active', 'review_open')
  ) then
    raise exception 'This award period is not open for selection.';
  end if;
  if not candidate_row.eligible and (
    actor_role <> 'super_admin'
    or nullif(trim(coalesce(p_override_reason, '')), '') is null
  ) then
    raise exception 'An ineligible candidate requires a super-admin override reason.';
  end if;

  if exists (
    select 1 from public.quarterly_award_recipients qr
    where qr.award_period_id = candidate_row.award_period_id
      and qr.award_definition_id = candidate_row.award_definition_id
      and qr.scope_type = p_scope_type
      and qr.scope_key = p_scope_key
      and qr.recipient_slot = p_recipient_slot
      and qr.status = 'finalised'
  ) then
    raise exception 'This award slot is already finalised.';
  end if;

  update public.quarterly_award_recipients
  set status = 'revoked',
      revoked_at = now(),
      revoked_by = actor_id,
      revocation_reason = 'Replaced before finalisation',
      updated_at = now()
  where award_period_id = candidate_row.award_period_id
    and award_definition_id = candidate_row.award_definition_id
    and scope_type = p_scope_type
    and scope_key = p_scope_key
    and recipient_slot = p_recipient_slot
    and status = 'selected';

  insert into public.quarterly_award_recipients (
    school_id,
    award_period_id,
    award_definition_id,
    student_id,
    candidate_score_id,
    scope_type,
    scope_key,
    recipient_slot,
    selected_by,
    selected_at,
    public_citation,
    internal_selection_note,
    status,
    override_reason
  ) values (
    actor_school,
    candidate_row.award_period_id,
    candidate_row.award_definition_id,
    candidate_row.student_id,
    candidate_row.id,
    p_scope_type,
    p_scope_key,
    p_recipient_slot,
    actor_id,
    now(),
    nullif(trim(coalesce(p_public_citation, '')), ''),
    nullif(trim(coalesce(p_internal_selection_note, '')), ''),
    'selected',
    nullif(trim(coalesce(p_override_reason, '')), '')
  ) returning * into recipient_row;

  insert into public.quarterly_award_candidate_reviews (
    school_id,
    award_period_id,
    award_definition_id,
    student_id,
    candidate_score_id,
    review_status,
    internal_notes,
    public_citation_draft,
    reviewed_by,
    reviewed_at
  ) values (
    actor_school,
    candidate_row.award_period_id,
    candidate_row.award_definition_id,
    candidate_row.student_id,
    candidate_row.id,
    'selected',
    nullif(trim(coalesce(p_internal_selection_note, '')), ''),
    nullif(trim(coalesce(p_public_citation, '')), ''),
    actor_id,
    now()
  )
  on conflict (award_period_id, award_definition_id, student_id)
  do update set
    candidate_score_id = excluded.candidate_score_id,
    review_status = 'selected',
    internal_notes = excluded.internal_notes,
    public_citation_draft = excluded.public_citation_draft,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at,
    updated_at = now();

  select jsonb_build_object(
    'recipient_id', other_recipient.id,
    'award_name', other_definition.name,
    'status', other_recipient.status
  ) into overlap_record
  from public.quarterly_award_recipients other_recipient
  join public.quarterly_award_definitions other_definition
    on other_definition.id = other_recipient.award_definition_id
  where other_recipient.award_period_id = candidate_row.award_period_id
    and other_recipient.student_id = candidate_row.student_id
    and other_recipient.award_definition_id <> candidate_row.award_definition_id
    and other_recipient.status in ('selected', 'finalised')
  order by other_recipient.created_at
  limit 1;

  perform public.write_honours_audit(
    actor_school,
    'quarterly_honours.recipient_selected',
    'quarterly_award_recipients',
    recipient_row.id::text,
    null,
    to_jsonb(recipient_row) || jsonb_build_object('overlap', overlap_record)
  );

  return jsonb_build_object('recipient', to_jsonb(recipient_row), 'overlap', overlap_record);
end;
$$;

create or replace function public.finalise_quarterly_award_recipient(
  p_recipient_id uuid,
  p_public_citation text,
  p_override_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  actor_role text;
  old_row public.quarterly_award_recipients;
  recipient_row public.quarterly_award_recipients;
  candidate_row public.quarterly_award_candidate_scores;
  award_count integer;
  completed_count integer;
  recipient_limit integer;
  overlap_exists boolean;
begin
  if actor_id is null or not public.current_user_has_permission('honours.finalise') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_public_citation, '')), '') is null then
    raise exception 'A public citation is required before finalisation.';
  end if;

  actor_school := public.current_user_school_id();
  actor_role := public.get_current_user_role();
  select * into old_row
  from public.quarterly_award_recipients qr
  where qr.id = p_recipient_id
    and qr.school_id = actor_school
    and qr.status = 'selected';
  if not found then
    raise exception 'Selected recipient not found.';
  end if;
  if not exists (
    select 1 from public.quarterly_award_periods p
    where p.id = old_row.award_period_id
      and p.school_id = actor_school
      and p.status = 'review_open'
  ) then
    raise exception 'The award period must be open for final review.';
  end if;

  select * into candidate_row
  from public.quarterly_award_candidate_scores cs
  where cs.id = old_row.candidate_score_id;

  if not candidate_row.eligible and (
    actor_role <> 'super_admin'
    or nullif(trim(coalesce(p_override_reason, old_row.override_reason, '')), '') is null
  ) then
    raise exception 'An ineligible candidate requires a super-admin override reason.';
  end if;

  select exists (
    select 1
    from public.quarterly_award_recipients other_recipient
    where other_recipient.award_period_id = old_row.award_period_id
      and other_recipient.student_id = old_row.student_id
      and other_recipient.id <> old_row.id
      and other_recipient.status in ('selected', 'finalised')
  ) into overlap_exists;

  if overlap_exists and (
    actor_role <> 'super_admin'
    or nullif(trim(coalesce(p_override_reason, '')), '') is null
  ) then
    raise exception 'Student is already selected for another award. A super-admin override reason is required.';
  end if;

  update public.quarterly_award_recipients
  set status = 'finalised',
      public_citation = trim(p_public_citation),
      finalised_by = actor_id,
      finalised_at = now(),
      override_reason = coalesce(nullif(trim(coalesce(p_override_reason, '')), ''), override_reason),
      updated_at = now()
  where id = old_row.id
  returning * into recipient_row;

  perform public.write_honours_audit(
    actor_school,
    'quarterly_honours.award_finalised',
    'quarterly_award_recipients',
    recipient_row.id::text,
    to_jsonb(old_row),
    to_jsonb(recipient_row) || jsonb_build_object(
      'algorithm_version', candidate_row.algorithm_version,
      'candidate_snapshot_id', candidate_row.id
    )
  );

  if overlap_exists then
    perform public.write_honours_audit(
      actor_school,
      'quarterly_honours.duplicate_award_override_used',
      'quarterly_award_recipients',
      recipient_row.id::text,
      null,
      jsonb_build_object(
        'period_id', recipient_row.award_period_id,
        'student_id', recipient_row.student_id,
        'award_definition_id', recipient_row.award_definition_id,
        'reason', trim(p_override_reason)
      )
    );
  end if;

  select recipient_limit_per_award into recipient_limit
  from public.quarterly_award_periods
  where id = recipient_row.award_period_id;

  select count(distinct ad.code) * recipient_limit into award_count
  from public.quarterly_award_definitions ad
  where ad.active = true
    and (ad.school_id is null or ad.school_id = actor_school);

  select count(*) into completed_count
  from public.quarterly_award_recipients qr
  where qr.award_period_id = recipient_row.award_period_id
    and qr.status in ('finalised', 'not_issued');

  if completed_count >= award_count then
    update public.quarterly_award_periods
    set status = 'finalised', finalised_at = now(), finalised_by = actor_id
    where id = recipient_row.award_period_id;
  end if;

  return to_jsonb(recipient_row);
end;
$$;

create or replace function public.finalise_quarterly_award_without_recipient(
  p_award_period_id uuid,
  p_award_definition_id uuid,
  p_reason text,
  p_scope_type text default 'school',
  p_scope_key text default 'school',
  p_recipient_slot integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  outcome_row public.quarterly_award_recipients;
  award_count integer;
  completed_count integer;
  recipient_limit integer;
begin
  if actor_id is null or not public.current_user_has_permission('honours.finalise') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reason is required when no recipient is selected.';
  end if;
  actor_school := public.current_user_school_id();
  if not exists (
    select 1 from public.quarterly_award_periods p
    where p.id = p_award_period_id
      and p.school_id = actor_school
      and p.status = 'review_open'
  ) then
    raise exception 'Award period is not open for final review.';
  end if;
  if not exists (
    select 1 from public.quarterly_award_definitions d
    where d.id = p_award_definition_id
      and d.active = true
      and (d.school_id is null or d.school_id = actor_school)
  ) then
    raise exception 'Award definition not found.';
  end if;

  insert into public.quarterly_award_recipients (
    school_id, award_period_id, award_definition_id, student_id,
    candidate_score_id, scope_type, scope_key, recipient_slot,
    selected_by, selected_at, finalised_by, finalised_at,
    internal_selection_note, status
  ) values (
    actor_school, p_award_period_id, p_award_definition_id, null,
    null, p_scope_type, p_scope_key, p_recipient_slot,
    actor_id, now(), actor_id, now(), trim(p_reason), 'not_issued'
  ) returning * into outcome_row;

  perform public.write_honours_audit(
    actor_school,
    'quarterly_honours.no_recipient_finalised',
    'quarterly_award_recipients',
    outcome_row.id::text,
    null,
    to_jsonb(outcome_row)
  );

  select recipient_limit_per_award into recipient_limit
  from public.quarterly_award_periods
  where id = p_award_period_id;

  select count(distinct ad.code) * recipient_limit into award_count
  from public.quarterly_award_definitions ad
  where ad.active = true
    and (ad.school_id is null or ad.school_id = actor_school);

  select count(*) into completed_count
  from public.quarterly_award_recipients qr
  where qr.award_period_id = p_award_period_id
    and qr.status in ('finalised', 'not_issued');

  if completed_count >= award_count then
    update public.quarterly_award_periods
    set status = 'finalised', finalised_at = now(), finalised_by = actor_id
    where id = p_award_period_id;
  end if;
  return to_jsonb(outcome_row);
end;
$$;

create or replace function public.reopen_quarterly_award_period(
  p_award_period_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  old_row public.quarterly_award_periods;
  period_row public.quarterly_award_periods;
begin
  if actor_id is null or not public.current_user_has_permission('honours.reopen') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A reopen reason is required.';
  end if;
  actor_school := public.current_user_school_id();
  select * into old_row from public.quarterly_award_periods
  where id = p_award_period_id and school_id = actor_school and status = 'finalised';
  if not found then raise exception 'Finalised award period not found.'; end if;

  update public.quarterly_award_periods
  set status = 'review_open', reopened_at = now(), reopened_by = actor_id,
      finalised_at = null, finalised_by = null, updated_at = now()
  where id = old_row.id returning * into period_row;

  perform public.write_honours_audit(
    actor_school,
    'quarterly_honours.period_reopened',
    'quarterly_award_periods',
    period_row.id::text,
    to_jsonb(old_row),
    to_jsonb(period_row) || jsonb_build_object('reason', trim(p_reason))
  );
  return to_jsonb(period_row);
end;
$$;

create or replace function public.revoke_quarterly_award_recipient(
  p_recipient_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  actor_school uuid;
  old_row public.quarterly_award_recipients;
  recipient_row public.quarterly_award_recipients;
begin
  if actor_id is null or not public.current_user_has_permission('honours.revoke') then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  if nullif(trim(coalesce(p_reason, '')), '') is null then
    raise exception 'A revocation reason is required.';
  end if;
  actor_school := public.current_user_school_id();
  select * into old_row from public.quarterly_award_recipients
  where id = p_recipient_id
    and school_id = actor_school
    and status in ('selected', 'finalised');
  if not found then raise exception 'Active recipient not found.'; end if;

  update public.quarterly_award_recipients
  set status = 'revoked', revoked_at = now(), revoked_by = actor_id,
      revocation_reason = trim(p_reason), updated_at = now()
  where id = old_row.id returning * into recipient_row;

  update public.quarterly_award_candidate_reviews
  set review_status = 'unreviewed', reviewed_by = actor_id, reviewed_at = now(), updated_at = now()
  where candidate_score_id = old_row.candidate_score_id;

  perform public.write_honours_audit(
    actor_school,
    'quarterly_honours.recipient_revoked',
    'quarterly_award_recipients',
    recipient_row.id::text,
    to_jsonb(old_row),
    to_jsonb(recipient_row)
  );
  return to_jsonb(recipient_row);
end;
$$;

create or replace function public.mark_quarterly_award_notification(
  p_notification_id uuid,
  p_dismiss boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  notification_row public.quarterly_award_notifications;
begin
  if actor_id is null or not public.has_admin_portal_access() then
    raise exception 'Forbidden.' using errcode = '42501';
  end if;
  update public.quarterly_award_notifications
  set read_at = coalesce(read_at, now()),
      dismissed_at = case when p_dismiss then now() else dismissed_at end
  where id = p_notification_id
    and recipient_user_id = actor_id
    and school_id = public.current_user_school_id()
  returning * into notification_row;
  if not found then raise exception 'Notification not found.'; end if;
  return to_jsonb(notification_row);
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC grants. Mutations are available only to authenticated users and still
-- perform an auth.uid(), effective-role, permission and school check internally.
-- ---------------------------------------------------------------------------

revoke all on function public.create_quarterly_award_period(text, text, date, date, timestamptz, uuid, integer) from public;
revoke all on function public.update_quarterly_award_review(uuid, text, text, text, text) from public;
revoke all on function public.select_quarterly_award_recipient(uuid, text, text, text, text, text, integer) from public;
revoke all on function public.finalise_quarterly_award_recipient(uuid, text, text) from public;
revoke all on function public.finalise_quarterly_award_without_recipient(uuid, uuid, text, text, text, integer) from public;
revoke all on function public.reopen_quarterly_award_period(uuid, text) from public;
revoke all on function public.revoke_quarterly_award_recipient(uuid, text) from public;
revoke all on function public.mark_quarterly_award_notification(uuid, boolean) from public;

grant execute on function public.create_quarterly_award_period(text, text, date, date, timestamptz, uuid, integer) to authenticated;
grant execute on function public.update_quarterly_award_review(uuid, text, text, text, text) to authenticated;
grant execute on function public.select_quarterly_award_recipient(uuid, text, text, text, text, text, integer) to authenticated;
grant execute on function public.finalise_quarterly_award_recipient(uuid, text, text) to authenticated;
grant execute on function public.finalise_quarterly_award_without_recipient(uuid, uuid, text, text, text, integer) to authenticated;
grant execute on function public.reopen_quarterly_award_period(uuid, text) to authenticated;
grant execute on function public.revoke_quarterly_award_recipient(uuid, text) to authenticated;
grant execute on function public.mark_quarterly_award_notification(uuid, boolean) to authenticated;
