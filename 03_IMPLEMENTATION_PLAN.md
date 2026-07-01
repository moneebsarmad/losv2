# League of Stars V2 Implementation Plan

## 1. Implementation Principles

- Keep the app name **League of Stars**.
- Keep houses central to motivation and student belonging.
- Build recognition as the core workflow.
- Do not rely on student name matching for new features.
- Use normalized IDs for new recognition data.
- Preserve existing data through migration/backfill.
- Keep the first production version focused: staff recognition, house rollup, student growth, parent view, admin overview.

## 2. Recommended Build Strategy

Build V2 in a new `losv2` folder, but use the current LOS app as the reference implementation for:

- Supabase auth setup.
- Existing RBAC concepts.
- Existing staff/student roster data.
- Existing house configuration.
- Existing dashboard patterns where useful.
- Existing analytics ideas where useful.

Do not copy the old shell directly. Rebuild the shell around V2 routes and V2 data objects.

## 3. Phase 0: Project Setup

### Tasks

1. Create new app workspace in `losv2`.
2. Choose stack:
   - Next.js App Router
   - TypeScript
   - Tailwind CSS
   - Supabase SSR/client
   - Recharts or equivalent for dashboards
3. Add lint/test tooling.
4. Add environment variable structure.
5. Add basic app shell.

### Deliverables

- Running web app.
- Basic login page placeholder.
- Basic dashboard route placeholder.
- Supabase client setup.
- Initial README.

## 4. Phase 1: Database Foundation

### Tasks

1. Create migration for `r_values`.
2. Create migration for `domains`.
3. Create migration for `point_values`.
4. Create migration for `student_user_links`.
5. Create migration for `parent_student_links`.
6. Create migration for `recognition_logs`.
7. Create migration for optional `house_events`.
8. Add indexes.
9. Add seed data.

### Required Seeds

3Rs:

- Righteousness
- Responsibility
- Respect

Domains:

- Washrooms
- Hallways and Transition
- Prayer Space
- Classrooms
- Lunch/Recess

Point values:

- +5 Expected positive behaviour
- +10 Strong positive behaviour
- +20 Significant character moment
- +50 Exceptional moral courage / rare high-impact recognition

### Deliverables

- Supabase migrations.
- Seed script.
- Database can support V2 recognition without old `merit_log`.

## 5. Phase 2: Auth and Role Routing

### Tasks

1. Implement Supabase auth.
2. Add middleware for protected routes.
3. Add role resolution from `profiles`.
4. Add role-to-landing routing.
5. Add app shell with role-aware nav.

### Role Landing

| Role | `/dashboard` renders |
|---|---|
| Staff | Staff dashboard |
| Student | Student growth dashboard |
| Parent | Parent dashboard |
| Admin | Tarbiyah overview |

### Deliverables

- Users can log in.
- Users are redirected to correct dashboard.
- Navigation changes by role.

## 6. Phase 3: Recognition API

### Tasks

1. Build `POST /api/recognitions`.
2. Validate required fields.
3. Validate permissions.
4. Resolve student snapshot data.
5. Resolve staff snapshot data.
6. Convert visibility to booleans.
7. Insert `recognition_logs`.
8. Add audit log entry.
9. Return inserted recognition ID.

### Validation Rules

- Student is required.
- Student must be active.
- 3R is required.
- Domain is required.
- Point value must be one of active `point_values`.
- Behaviour note is required.
- Visibility is required.
- Staff user must have recognition permission.

### Deliverables

- Recognition API.
- Unit/API tests for valid and invalid submissions.

## 7. Phase 4: Staff Recognition Flow

### Tasks

1. Build staff dashboard.
2. Build student search.
3. Build recognition form.
4. Build 3R selector.
5. Build domain selector.
6. Build point value selector.
7. Build behaviour note input.
8. Build visibility selector.
9. Build success state.
10. Build recent recognitions list.

### UX Rules

- One clear primary action: **Recognise Student**.
- Form must be mobile-friendly.
- Default date is current date.
- Avoid long multi-screen wizard if one-page flow is faster.
- Domain and 3R selectors should be large, quick tap targets.
- Submit button should become available only when required fields are filled.

### Deliverables

- Staff can create V2 recognition logs.
- Staff can see recent recognitions.
- Recognition points roll into house totals.

## 8. Phase 5: House Social Engine

### Tasks

1. Build `house_standings_v2` query or API.
2. Build house standings page.
3. Show total house points.
4. Show recognition count by house.
5. Show house breakdown by 3R.
6. Show house breakdown by domain.
7. Show top contributors.
8. Add optional house event support.

### Deliverables

- Houses remain a core app experience.
- House points are sourced from recognition logs.
- House dashboards explain what kind of formation is powering points.

## 9. Phase 6: Student Growth Dashboard

### Tasks

1. Build `GET /api/student/growth`.
2. Link logged-in user to student via `student_user_links`.
3. Return student-visible recognitions only.
4. Calculate total points.
5. Calculate house contribution.
6. Calculate 3R breakdown.
7. Calculate domain breakdown.
8. Calculate strongest 3R.
9. Calculate strongest domain.
10. Calculate suggested area to grow.
11. Add reflection prompt UI.
12. Add goal UI if enabled.

### Deliverables

- Student sees growth-oriented dashboard.
- Student still sees points and house contribution.
- Student cannot see staff-only or parent-only recognition notes.

## 10. Phase 7: Parent Dashboard

### Tasks

1. Build `GET /api/parent/children`.
2. Build child selector.
3. Build `GET /api/parent/children/[studentId]/growth`.
4. Enforce `parent_student_links`.
5. Return parent-visible recognitions only.
6. Show 3R/domain trends.
7. Show house contribution.
8. Show conversation prompt based on latest parent-visible note.

### Deliverables

- Parent sees only linked children.
- Parent sees approved parent-visible recognition data.
- Parent cannot see other children or staff-only notes.

## 11. Phase 8: Admin/Tarbiyah Dashboard

### Tasks

1. Build `GET /api/admin/formation-overview`.
2. Add dashboard filters:
   - Date range
   - Grade
   - Section
   - House
   - Staff
   - Student
   - 3R
   - Domain
3. Show total recognitions.
4. Show total points.
5. Show house standings.
6. Show 3R distribution.
7. Show domain distribution.
8. Show zero-recognition students.
9. Show high-volume students.
10. Show staff participation.
11. Add CSV export.

### Deliverables

- Admin can answer: who is noticed, missed, over-logged, and growing?
- Admin can export useful data.

## 12. Phase 9: RLS and Security Hardening

### Tasks

1. Add RLS to all V2 tables.
2. Add student visibility policies.
3. Add parent linked-child policies.
4. Add staff insert policies.
5. Add admin view/manage policies.
6. Test negative access cases.

### Required Negative Tests

- Student cannot see another student's recognitions.
- Student cannot see staff-only recognition.
- Parent cannot see unlinked child.
- Parent cannot see staff-only recognition.
- Parent cannot see student-only recognition unless parent-visible too.
- Staff without permission cannot insert recognition.
- Non-admin cannot export admin reports.

## 13. Phase 10: Data Migration

### Tasks

1. Audit current `merit_log` rows.
2. Map old `r` values to `r_values`.
3. Map old subcategories to behaviour note or legacy reason.
4. Infer domain where possible, otherwise use a fallback migration domain if approved.
5. Resolve students by stable ID where possible.
6. Resolve staff user by email/name where possible.
7. Backfill `recognition_logs`.
8. Mark migrated rows with `legacy_merit_log_id` or equivalent.

### Migration Caution

Old rows may not have domain or visibility. Proposed defaults:

- Domain: `classrooms` or `unknown_legacy` only if approved.
- Visibility: `staff_only`.
- Review status: `approved`.
- Source: `legacy_migration`.

Because the V2 domain field is required for new recognitions, legacy imports need an agreed fallback.

## 14. Phase 11: Notifications and Digests

Phase 2 feature unless required for initial launch.

### Tasks

1. Parent weekly digest.
2. Student weekly summary.
3. Staff participation reminders.
4. Admin missed-student digest.

## 15. Phase 12: QA and Launch

### Smoke Tests

- Staff can submit recognition.
- House totals update.
- Student sees student-visible recognition.
- Parent sees parent-visible recognition.
- Parent cannot see staff-only recognition.
- Admin sees formation dashboard.
- Admin export works.
- RLS tests pass.

### Launch Readiness

- Data migration tested.
- Staff training notes prepared.
- Admin confirms 3Rs/domains.
- House standings match expected totals.
- Parent visibility rules confirmed.

## 16. Suggested Milestones

### Milestone 1: Foundation

- Project setup
- Database migrations
- Auth/role routing

### Milestone 2: Recognition MVP

- Recognition API
- Staff recognition form
- Recent recognitions
- House rollup

### Milestone 3: Student/Parent MVP

- Student growth dashboard
- Parent child dashboard
- Visibility enforcement

### Milestone 4: Admin MVP

- Tarbiyah dashboard
- Filters
- Missed students
- CSV export

### Milestone 5: Migration and Launch

- Backfill old data
- Tests
- Polish
- Deployment

