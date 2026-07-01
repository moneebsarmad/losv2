-- League of Stars V2 foundation schema

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Identity and RBAC
-- ---------------------------------------------------------------------------

create table if not exists public.roles (
  role_name text primary key,
  description text not null,
  priority integer not null,
  created_at timestamptz not null default now()
);

insert into public.roles (role_name, description, priority) values
  ('super_admin', 'Full system access', 1),
  ('admin', 'Administrative access to LOS data and users', 2),
  ('tarbiyah_leadership', 'Tarbiyah leadership dashboard access', 3),
  ('house_mentor', 'House mentor access', 4),
  ('teacher', 'Staff recognition access', 5),
  ('support_staff', 'Support staff recognition access', 6),
  ('staff', 'General staff recognition access', 7),
  ('student', 'Student account access', 8),
  ('parent', 'Parent account access', 9)
on conflict (role_name) do update set
  description = excluded.description,
  priority = excluded.priority;

create table if not exists public.permissions (
  permission_name text primary key,
  description text not null,
  category text not null,
  created_at timestamptz not null default now()
);

insert into public.permissions (permission_name, description, category) values
  ('recognitions.create', 'Can create student recognitions', 'recognitions'),
  ('recognitions.view_all', 'Can view all recognitions', 'recognitions'),
  ('recognitions.review', 'Can review parent/student visible recognitions', 'recognitions'),
  ('students.view_all', 'Can view all students', 'students'),
  ('students.manage', 'Can manage student roster and links', 'students'),
  ('families.manage', 'Can manage parent-child links', 'families'),
  ('analytics.view_all', 'Can view all analytics', 'analytics'),
  ('reports.export_all', 'Can export reports', 'reports'),
  ('system.configure', 'Can configure LOS reference data', 'system'),
  ('audit.view', 'Can view audit logs', 'audit')
on conflict (permission_name) do update set
  description = excluded.description,
  category = excluded.category;

create table if not exists public.role_permissions (
  role_name text not null references public.roles(role_name) on delete cascade,
  permission_name text not null references public.permissions(permission_name) on delete cascade,
  granted_at timestamptz not null default now(),
  primary key (role_name, permission_name)
);

insert into public.role_permissions (role_name, permission_name) values
  ('super_admin', 'recognitions.create'),
  ('super_admin', 'recognitions.view_all'),
  ('super_admin', 'recognitions.review'),
  ('super_admin', 'students.view_all'),
  ('super_admin', 'students.manage'),
  ('super_admin', 'families.manage'),
  ('super_admin', 'analytics.view_all'),
  ('super_admin', 'reports.export_all'),
  ('super_admin', 'system.configure'),
  ('super_admin', 'audit.view'),
  ('admin', 'recognitions.create'),
  ('admin', 'recognitions.view_all'),
  ('admin', 'recognitions.review'),
  ('admin', 'students.view_all'),
  ('admin', 'students.manage'),
  ('admin', 'families.manage'),
  ('admin', 'analytics.view_all'),
  ('admin', 'reports.export_all'),
  ('admin', 'audit.view'),
  ('tarbiyah_leadership', 'recognitions.create'),
  ('tarbiyah_leadership', 'recognitions.view_all'),
  ('tarbiyah_leadership', 'recognitions.review'),
  ('tarbiyah_leadership', 'students.view_all'),
  ('tarbiyah_leadership', 'analytics.view_all'),
  ('tarbiyah_leadership', 'reports.export_all'),
  ('house_mentor', 'recognitions.create'),
  ('house_mentor', 'students.view_all'),
  ('teacher', 'recognitions.create'),
  ('support_staff', 'recognitions.create'),
  ('staff', 'recognitions.create')
on conflict (role_name, permission_name) do nothing;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text references public.roles(role_name),
  full_name text,
  name text,
  staff_name text,
  student_name text,
  assigned_house text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists role text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists staff_name text;
alter table public.profiles add column if not exists student_name text;
alter table public.profiles add column if not exists assigned_house text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(lower(email));

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create or replace function public.get_user_role(user_id uuid)
returns text as $$
  select role from public.profiles where id = user_id;
$$ language sql stable security definer set search_path = public;

create or replace function public.has_permission(user_id uuid, perm text)
returns boolean as $$
  select exists (
    select 1
    from public.profiles p
    join public.role_permissions rp on rp.role_name = p.role
    where p.id = user_id
      and rp.permission_name = perm
  );
$$ language sql stable security definer set search_path = public;

create or replace function public.is_admin_user(user_id uuid)
returns boolean as $$
  select exists (
    select 1
    from public.profiles
    where id = user_id
      and role in ('super_admin', 'admin', 'tarbiyah_leadership')
  );
$$ language sql stable security definer set search_path = public;

-- ---------------------------------------------------------------------------
-- Core formation references
-- ---------------------------------------------------------------------------

create table if not exists public.r_values (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null unique,
  description text,
  locked boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.r_values (key, name, description, locked, sort_order) values
  ('righteousness', 'Righteousness', 'Living with moral courage and Islamic character', true, 1),
  ('responsibility', 'Responsibility', 'Taking ownership, initiative, and care', true, 2),
  ('respect', 'Respect', 'Honoring people, places, and community expectations', true, 3)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  locked = excluded.locked,
  sort_order = excluded.sort_order;

drop trigger if exists r_values_set_updated_at on public.r_values;
create trigger r_values_set_updated_at
before update on public.r_values
for each row execute function public.set_updated_at();

create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  name text not null unique,
  description text,
  locked boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.domains (key, name, description, locked, is_active, sort_order) values
  ('washrooms', 'Washrooms', 'Adab, privacy, cleanliness, and safe use of washroom spaces', true, true, 1),
  ('hallways_transition', 'Hallways and Transition', 'Movement, line culture, quiet voices, and safe transitions', true, true, 2),
  ('prayer_space', 'Prayer Space', 'Salah adab, wudu readiness, stillness, and sacred space respect', true, true, 3),
  ('classrooms', 'Classrooms', 'Learning behaviours, responsibility, participation, and peer respect', true, true, 4),
  ('lunch_recess', 'Lunch/Recess', 'Inclusion, conflict resolution, play, and care for shared spaces', true, true, 5)
on conflict (key) do update set
  name = excluded.name,
  description = excluded.description,
  locked = excluded.locked,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

drop trigger if exists domains_set_updated_at on public.domains;
create trigger domains_set_updated_at
before update on public.domains
for each row execute function public.set_updated_at();

create table if not exists public.point_values (
  value integer primary key,
  label text not null,
  description text not null,
  sort_order integer not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.point_values (value, label, description, sort_order, is_active) values
  (5, '+5', 'Expected positive behaviour', 1, true),
  (10, '+10', 'Strong positive behaviour', 2, true),
  (20, '+20', 'Significant character moment', 3, true),
  (50, '+50', 'Exceptional moral courage / rare high-impact recognition', 4, true)
on conflict (value) do update set
  label = excluded.label,
  description = excluded.description,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- ---------------------------------------------------------------------------
-- Roster and relationships
-- ---------------------------------------------------------------------------

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_id text unique,
  student_name text not null,
  grade integer,
  section text,
  house text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.students add column if not exists student_id text;
alter table public.students add column if not exists student_name text;
alter table public.students add column if not exists grade integer;
alter table public.students add column if not exists section text;
alter table public.students add column if not exists house text;
alter table public.students add column if not exists is_active boolean not null default true;
alter table public.students add column if not exists created_at timestamptz not null default now();
alter table public.students add column if not exists updated_at timestamptz not null default now();

create unique index if not exists idx_students_student_id_unique on public.students(student_id) where student_id is not null;
create index if not exists idx_students_name on public.students(lower(student_name));
create index if not exists idx_students_house on public.students(house);
create index if not exists idx_students_grade_section on public.students(grade, section);

drop trigger if exists students_set_updated_at on public.students;
create trigger students_set_updated_at
before update on public.students
for each row execute function public.set_updated_at();

create table if not exists public.student_user_links (
  user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, student_id)
);

create table if not exists public.parent_student_links (
  parent_user_id uuid not null references auth.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relationship text,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (parent_user_id, student_id)
);

-- ---------------------------------------------------------------------------
-- Recognition logs and house events
-- ---------------------------------------------------------------------------

create table if not exists public.recognition_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  staff_user_id uuid not null references auth.users(id) on delete restrict,
  staff_name_snapshot text not null,
  student_name_snapshot text not null,
  grade_snapshot integer,
  section_snapshot text,
  house_snapshot text not null,
  r_value_id uuid not null references public.r_values(id),
  domain_id uuid not null references public.domains(id),
  point_value integer not null references public.point_values(value),
  behaviour_note text not null,
  visibility text not null check (visibility in ('staff_only', 'student', 'parent', 'student_parent')),
  student_visible boolean not null default false,
  parent_visible boolean not null default false,
  admin_review_status text not null default 'approved' check (admin_review_status in ('not_required', 'pending', 'approved', 'rejected')),
  source text not null default 'manual',
  legacy_merit_log_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_recognition_student_created on public.recognition_logs(student_id, created_at desc);
create index if not exists idx_recognition_staff_created on public.recognition_logs(staff_user_id, created_at desc);
create index if not exists idx_recognition_house_created on public.recognition_logs(house_snapshot, created_at desc);
create index if not exists idx_recognition_r_value on public.recognition_logs(r_value_id);
create index if not exists idx_recognition_domain on public.recognition_logs(domain_id);
create index if not exists idx_recognition_visibility on public.recognition_logs(student_visible, parent_visible, admin_review_status);

drop trigger if exists recognition_logs_set_updated_at on public.recognition_logs;
create trigger recognition_logs_set_updated_at
before update on public.recognition_logs
for each row execute function public.set_updated_at();

create table if not exists public.house_events (
  id uuid primary key default gen_random_uuid(),
  house text not null,
  point_value integer not null,
  title text not null,
  note text,
  event_date date not null default current_date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_house_events_house_date on public.house_events(house, event_date desc);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  table_name text,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

create index if not exists idx_audit_logs_user_id on public.audit_logs(user_id);
create index if not exists idx_audit_logs_created_at on public.audit_logs(created_at desc);
