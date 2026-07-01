-- League of Stars V2 RLS policies

alter table public.profiles enable row level security;
alter table public.r_values enable row level security;
alter table public.domains enable row level security;
alter table public.point_values enable row level security;
alter table public.students enable row level security;
alter table public.student_user_links enable row level security;
alter table public.parent_student_links enable row level security;
alter table public.recognition_logs enable row level security;
alter table public.house_events enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own"
on public.profiles for select
to authenticated
using (id = auth.uid());

drop policy if exists "profiles select admin" on public.profiles;
create policy "profiles select admin"
on public.profiles for select
to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own"
on public.profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

-- Reference data
drop policy if exists "r_values read authenticated" on public.r_values;
create policy "r_values read authenticated"
on public.r_values for select
to authenticated
using (true);

drop policy if exists "r_values admin manage" on public.r_values;
create policy "r_values admin manage"
on public.r_values for all
to authenticated
using (public.has_permission(auth.uid(), 'system.configure'))
with check (public.has_permission(auth.uid(), 'system.configure'));

drop policy if exists "domains read authenticated" on public.domains;
create policy "domains read authenticated"
on public.domains for select
to authenticated
using (true);

drop policy if exists "domains admin manage" on public.domains;
create policy "domains admin manage"
on public.domains for all
to authenticated
using (public.has_permission(auth.uid(), 'system.configure'))
with check (public.has_permission(auth.uid(), 'system.configure'));

drop policy if exists "point_values read authenticated" on public.point_values;
create policy "point_values read authenticated"
on public.point_values for select
to authenticated
using (true);

drop policy if exists "point_values admin manage" on public.point_values;
create policy "point_values admin manage"
on public.point_values for all
to authenticated
using (public.has_permission(auth.uid(), 'system.configure'))
with check (public.has_permission(auth.uid(), 'system.configure'));

-- Students
drop policy if exists "students staff admin read" on public.students;
create policy "students staff admin read"
on public.students for select
to authenticated
using (
  public.has_permission(auth.uid(), 'students.view_all')
  or public.has_permission(auth.uid(), 'recognitions.create')
  or exists (
    select 1 from public.student_user_links sul
    where sul.user_id = auth.uid() and sul.student_id = students.id
  )
  or exists (
    select 1 from public.parent_student_links psl
    where psl.parent_user_id = auth.uid() and psl.student_id = students.id
  )
);

drop policy if exists "students admin manage" on public.students;
create policy "students admin manage"
on public.students for all
to authenticated
using (public.has_permission(auth.uid(), 'students.manage'))
with check (public.has_permission(auth.uid(), 'students.manage'));

-- Student links
drop policy if exists "student links own read" on public.student_user_links;
create policy "student links own read"
on public.student_user_links for select
to authenticated
using (user_id = auth.uid() or public.has_permission(auth.uid(), 'students.manage'));

drop policy if exists "student links admin manage" on public.student_user_links;
create policy "student links admin manage"
on public.student_user_links for all
to authenticated
using (public.has_permission(auth.uid(), 'students.manage'))
with check (public.has_permission(auth.uid(), 'students.manage'));

-- Parent links
drop policy if exists "parent links own read" on public.parent_student_links;
create policy "parent links own read"
on public.parent_student_links for select
to authenticated
using (parent_user_id = auth.uid() or public.has_permission(auth.uid(), 'families.manage'));

drop policy if exists "parent links admin manage" on public.parent_student_links;
create policy "parent links admin manage"
on public.parent_student_links for all
to authenticated
using (public.has_permission(auth.uid(), 'families.manage'))
with check (public.has_permission(auth.uid(), 'families.manage'));

-- Recognition logs
drop policy if exists "recognition staff insert" on public.recognition_logs;
create policy "recognition staff insert"
on public.recognition_logs for insert
to authenticated
with check (
  staff_user_id = auth.uid()
  and public.has_permission(auth.uid(), 'recognitions.create')
);

drop policy if exists "recognition admin read all" on public.recognition_logs;
create policy "recognition admin read all"
on public.recognition_logs for select
to authenticated
using (public.has_permission(auth.uid(), 'recognitions.view_all'));

drop policy if exists "recognition staff read own" on public.recognition_logs;
create policy "recognition staff read own"
on public.recognition_logs for select
to authenticated
using (staff_user_id = auth.uid());

drop policy if exists "recognition student visible read" on public.recognition_logs;
create policy "recognition student visible read"
on public.recognition_logs for select
to authenticated
using (
  student_visible = true
  and admin_review_status in ('approved', 'not_required')
  and exists (
    select 1 from public.student_user_links sul
    where sul.user_id = auth.uid() and sul.student_id = recognition_logs.student_id
  )
);

drop policy if exists "recognition parent visible read" on public.recognition_logs;
create policy "recognition parent visible read"
on public.recognition_logs for select
to authenticated
using (
  parent_visible = true
  and admin_review_status in ('approved', 'not_required')
  and exists (
    select 1 from public.parent_student_links psl
    where psl.parent_user_id = auth.uid() and psl.student_id = recognition_logs.student_id
  )
);

drop policy if exists "recognition admin update" on public.recognition_logs;
create policy "recognition admin update"
on public.recognition_logs for update
to authenticated
using (public.has_permission(auth.uid(), 'recognitions.review'))
with check (public.has_permission(auth.uid(), 'recognitions.review'));

-- House events
drop policy if exists "house events read authenticated" on public.house_events;
create policy "house events read authenticated"
on public.house_events for select
to authenticated
using (true);

drop policy if exists "house events admin manage" on public.house_events;
create policy "house events admin manage"
on public.house_events for all
to authenticated
using (public.has_permission(auth.uid(), 'recognitions.view_all'))
with check (public.has_permission(auth.uid(), 'recognitions.view_all'));

-- Audit
drop policy if exists "audit admin read" on public.audit_logs;
create policy "audit admin read"
on public.audit_logs for select
to authenticated
using (public.has_permission(auth.uid(), 'audit.view'));

drop policy if exists "audit authenticated insert" on public.audit_logs;
create policy "audit authenticated insert"
on public.audit_logs for insert
to authenticated
with check (true);
