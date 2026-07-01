# League of Stars V2 Technical Blueprint

## 1. System Overview

League of Stars V2 is a Next.js + Supabase application for BHA recognition, house culture, and 3R formation tracking.

The app has four primary role experiences:

- Staff
- Student
- Parent
- Tarbiyah/Admin

The main data object is `recognition_logs`.

Each recognition:

- Awards points to a student.
- Awards points to the student's house.
- Connects to one 3R.
- Connects to one BHA domain.
- Stores a behaviour-specific note.
- Has explicit visibility rules.
- Feeds dashboards, reports, and house standings.

## 2. Proposed App Structure

```text
losv2/
  apps/
    web/
      src/
        app/
          page.tsx
          dashboard/
            page.tsx
            recognize/
              page.tsx
            students/
              page.tsx
              [studentId]/
                page.tsx
            my-growth/
              page.tsx
            my-house/
              page.tsx
            parent/
              page.tsx
              children/
                [studentId]/
                  page.tsx
            houses/
              page.tsx
            admin/
              page.tsx
              reports/
                page.tsx
              audit/
                page.tsx
            settings/
              page.tsx
          api/
            recognitions/
              route.ts
            students/
              search/
                route.ts
            student/
              growth/
                route.ts
            parent/
              children/
                route.ts
            admin/
              formation-overview/
                route.ts
              missed-students/
                route.ts
              export/
                route.ts
        components/
          app-shell/
          recognition/
          dashboards/
          charts/
          students/
          parent/
          houses/
          admin/
          ui/
        lib/
          auth/
          supabase/
          permissions/
          recognition/
          analytics/
          constants/
        types/
  supabase/
    migrations/
    seed/
  docs/
```

## 3. Route Blueprint

| Route | Role | Purpose |
|---|---|---|
| `/` | Public/auth | Login |
| `/dashboard` | All | Role-specific landing |
| `/dashboard/recognize` | Staff/Admin | Fast recognition flow |
| `/dashboard/students` | Staff/Admin | Roster and student lookup |
| `/dashboard/students/[studentId]` | Staff/Admin | Student context and recognition history |
| `/dashboard/my-growth` | Student | Student growth dashboard |
| `/dashboard/my-house` | Student | Student house contribution |
| `/dashboard/parent` | Parent | Parent child selector/overview |
| `/dashboard/parent/children/[studentId]` | Parent | Child growth and recognitions |
| `/dashboard/houses` | All permitted roles | House standings/social engine |
| `/dashboard/admin` | Admin | Tarbiyah overview |
| `/dashboard/admin/reports` | Admin | Reports and exports |
| `/dashboard/admin/audit` | Admin | Audit logs |
| `/dashboard/settings` | All | Account settings |

## 4. Dashboard Landing Logic

`/dashboard` resolves by role:

| Role | Landing Experience |
|---|---|
| Staff | Staff dashboard with Recognise Student CTA, recent recognitions, house impact |
| Student | My Growth dashboard |
| Parent | Parent child dashboard |
| Admin | Tarbiyah formation overview |

## 5. Backend Data Model

### 5.1 `roles`

Existing table can be retained and expanded.

```sql
role_name text primary key
description text not null
priority integer not null
created_at timestamptz default now()
```

Required roles:

- `super_admin`
- `admin`
- `tarbiyah_leadership`
- `house_mentor`
- `teacher`
- `support_staff`
- `student`
- `parent`

### 5.2 `r_values`

```sql
id uuid primary key default gen_random_uuid()
key text not null unique
name text not null unique
description text
locked boolean not null default true
sort_order integer not null
created_at timestamptz default now()
updated_at timestamptz default now()
```

Seed:

| key | name | sort_order |
|---|---|---:|
| `righteousness` | Righteousness | 1 |
| `responsibility` | Responsibility | 2 |
| `respect` | Respect | 3 |

### 5.3 `domains`

```sql
id uuid primary key default gen_random_uuid()
key text not null unique
name text not null unique
description text
locked boolean not null default true
is_active boolean not null default true
sort_order integer not null
created_at timestamptz default now()
updated_at timestamptz default now()
```

Seed:

| key | name | sort_order |
|---|---|---:|
| `washrooms` | Washrooms | 1 |
| `hallways_transition` | Hallways and Transition | 2 |
| `prayer_space` | Prayer Space | 3 |
| `classrooms` | Classrooms | 4 |
| `lunch_recess` | Lunch/Recess | 5 |

### 5.4 `point_values`

```sql
value integer primary key
label text not null
description text not null
sort_order integer not null
is_active boolean not null default true
created_at timestamptz default now()
```

Seed:

| value | label | description |
|---:|---|---|
| 5 | Expected positive behaviour | Common positive behaviour worth noticing |
| 10 | Strong positive behaviour | Clear 3R/domain behaviour |
| 20 | Significant character moment | Meaningful formation moment |
| 50 | Exceptional moral courage | Rare high-impact recognition |

### 5.5 `students`

Keep existing roster table if possible, but ensure stable student ID usage.

Required columns:

```sql
id uuid primary key
student_id text unique
student_name text not null
grade integer
section text
house text not null
is_active boolean default true
created_at timestamptz default now()
updated_at timestamptz default now()
```

### 5.6 `student_user_links`

Links auth users to student records.

```sql
user_id uuid references auth.users(id) on delete cascade
student_id uuid references students(id) on delete cascade
created_at timestamptz default now()
primary key (user_id, student_id)
```

### 5.7 `parent_student_links`

Links parent auth users to child student records.

```sql
parent_user_id uuid references auth.users(id) on delete cascade
student_id uuid references students(id) on delete cascade
relationship text
is_primary boolean default false
created_at timestamptz default now()
primary key (parent_user_id, student_id)
```

### 5.8 `recognition_logs`

Canonical V2 event table.

```sql
id uuid primary key default gen_random_uuid()
student_id uuid not null references students(id)
staff_user_id uuid not null references auth.users(id)
staff_name_snapshot text not null
student_name_snapshot text not null
grade_snapshot integer
section_snapshot text
house_snapshot text not null
r_value_id uuid not null references r_values(id)
domain_id uuid not null references domains(id)
point_value integer not null references point_values(value)
behaviour_note text not null
visibility text not null
student_visible boolean not null default false
parent_visible boolean not null default false
admin_review_status text not null default 'approved'
source text not null default 'manual'
legacy_merit_log_id text
created_at timestamptz default now()
updated_at timestamptz default now()
```

Allowed visibility values:

- `staff_only`
- `student`
- `parent`
- `student_parent`

Allowed review values:

- `not_required`
- `pending`
- `approved`
- `rejected`

### 5.9 `house_events`

Optional table for non-student house points or competitions.

```sql
id uuid primary key default gen_random_uuid()
house text not null
point_value integer not null
title text not null
note text
event_date date not null
created_by uuid references auth.users(id)
created_at timestamptz default now()
```

This keeps house-wide competition events separate from student recognition.

### 5.10 `student_reflections`

Phase 2 or optional.

```sql
id uuid primary key default gen_random_uuid()
student_id uuid not null references students(id)
user_id uuid not null references auth.users(id)
recognition_log_id uuid references recognition_logs(id)
prompt text not null
response text not null
created_at timestamptz default now()
updated_at timestamptz default now()
```

### 5.11 `student_goals`

Phase 2 or optional.

```sql
id uuid primary key default gen_random_uuid()
student_id uuid not null references students(id)
created_by_user_id uuid references auth.users(id)
r_value_id uuid references r_values(id)
domain_id uuid references domains(id)
goal_text text not null
status text not null default 'active'
start_date date
end_date date
created_at timestamptz default now()
updated_at timestamptz default now()
```

## 6. Views and Analytics Sources

### 6.1 `house_standings_v2`

Aggregates:

- recognition points by `house_snapshot`
- optional house event points
- date filter can be handled in API or materialized view

### 6.2 `student_recognition_totals_v2`

Aggregates:

- total points
- total recognitions
- strongest 3R
- strongest domain
- latest recognition date

### 6.3 `admin_missed_students_v2`

Students with zero recognitions in selected date range.

### 6.4 `staff_recognition_activity_v2`

Staff participation, recognition count, points awarded, unique students noticed.

## 7. RLS Blueprint

### 7.1 Students

Staff/admin:

- Admin can view all.
- Staff with roster permission can view all or scoped students.
- House mentors can view students in assigned house if desired.

Students:

- Student can view their own linked student row.

Parents:

- Parent can view linked child rows only.

### 7.2 Recognition Logs

Admin:

- Can view all recognition logs.

Staff:

- Can insert recognition logs.
- Can view their own submitted logs.
- Can view broader logs only if permitted.

Student:

- Can view recognition logs where:
  - student is linked to user
  - `student_visible = true`
  - `admin_review_status = approved` or moderation disabled

Parent:

- Can view recognition logs where:
  - student is linked to parent through `parent_student_links`
  - `parent_visible = true`
  - `admin_review_status = approved` or moderation disabled

### 7.3 Reference Tables

Authenticated users can read:

- `r_values`
- `domains`
- `point_values`

Only admin/system roles can edit them.

## 8. API Blueprint

### 8.1 `POST /api/recognitions`

Request:

```json
{
  "studentId": "uuid",
  "rValueId": "uuid",
  "domainId": "uuid",
  "pointValue": 10,
  "behaviourNote": "Helped younger students transition calmly.",
  "visibility": "student_parent"
}
```

Response:

```json
{
  "recognition": {
    "id": "uuid"
  }
}
```

Server responsibilities:

- Verify auth.
- Verify `points.award` permission or equivalent.
- Validate student exists and active.
- Validate 3R/domain/point value.
- Resolve staff name snapshot.
- Resolve student name/grade/section/house snapshot.
- Derive visibility booleans.
- Insert recognition log.
- Write audit log.

### 8.2 `GET /api/students/search?q=ali`

Returns active students available to staff.

### 8.3 `GET /api/staff/dashboard`

Returns:

- recent recognitions submitted by current staff
- students staff has recognised recently
- students not recognised recently, if permission allows
- house impact summary

### 8.4 `GET /api/student/growth`

Returns current student's:

- profile
- total points
- house contribution
- recent recognitions visible to student
- 3R breakdown
- domain breakdown
- strongest 3R/domain
- area to grow
- reflection prompt
- active goal

### 8.5 `GET /api/parent/children`

Returns linked children.

### 8.6 `GET /api/parent/children/[studentId]/growth`

Returns parent-safe child view.

### 8.7 `GET /api/admin/formation-overview`

Filters:

- start date
- end date
- grade
- section
- house
- staff
- student
- 3R
- domain

Returns:

- recognition count
- total points
- house standings
- 3R distribution
- domain distribution
- grade distribution
- staff participation
- zero-recognition students
- high-volume students

## 9. Frontend Component Blueprint

### 9.1 App Shell

Components:

- `AppShell`
- `Sidebar`
- `MobileNav`
- `Topbar`
- `RoleLandingRouter`

Navigation should be role-aware.

### 9.2 Staff Components

- `StaffDashboard`
- `RecognizeStudentButton`
- `RecentRecognitionList`
- `StaffHouseImpactCard`
- `MissedStudentsCard`
- `RecognitionForm`
- `StudentSearchCombobox`
- `RValueSelector`
- `DomainSelector`
- `PointValueSelector`
- `VisibilitySelector`

### 9.3 Student Components

- `StudentGrowthDashboard`
- `StudentPointsSummary`
- `HouseContributionCard`
- `RecognitionFeed`
- `RBreakdownChart`
- `DomainBreakdownChart`
- `ReflectionPromptCard`
- `GrowthGoalCard`

### 9.4 Parent Components

- `ParentDashboard`
- `ChildSelector`
- `ChildGrowthSummary`
- `ParentRecognitionFeed`
- `ConversationPromptCard`
- `ParentTrendCharts`

### 9.5 Admin Components

- `TarbiyahOverviewDashboard`
- `FormationFilters`
- `HouseStandingsPanel`
- `RDistributionPanel`
- `DomainDistributionPanel`
- `MissedStudentsTable`
- `HighVolumeStudentsTable`
- `StaffParticipationTable`
- `VisibilityReviewQueue`
- `ExportButton`

## 10. Compatibility Strategy

The existing LOS app uses `merit_log`. V2 should avoid breaking old data.

Migration strategy:

1. Create V2 tables.
2. Backfill old `merit_log` rows into `recognition_logs`.
3. Keep `merit_log` read-only during transition if needed.
4. Rebuild dashboards against `recognition_logs`.
5. Optionally create a compatibility view that exposes `recognition_logs` in old `merit_log` shape.
6. Retire old `merit_log` writes after V2 recognition flow is live.

## 11. Testing Blueprint

Required test groups:

- Auth routing tests.
- Role landing tests.
- Recognition submission tests.
- RLS tests for student visibility.
- RLS tests for parent linked-child visibility.
- RLS tests blocking parent access to other children.
- Admin dashboard API tests.
- House standings rollup tests.
- Backfill migration tests.
- E2E staff recognition flow.
- E2E student growth view.
- E2E parent child view.

