# League of Stars V2 Todo List

## 0. Planning

- [x] Confirm app name remains League of Stars.
- [x] Confirm houses remain core social engine.
- [x] Confirm 3Rs remain Righteousness, Responsibility, Respect.
- [x] Confirm 5 BHA domains:
  - [x] Washrooms
  - [x] Hallways and Transition
  - [x] Prayer Space
  - [x] Classrooms
  - [x] Lunch/Recess
- [x] Create PRD.
- [x] Create technical blueprint.
- [x] Create implementation plan.
- [ ] Confirm whether parent/student-visible notes need admin moderation.
- [ ] Confirm whether V2 should allow multi-student recognition in MVP.
- [ ] Confirm whether house-only competition points remain in MVP.
- [ ] Confirm legacy migration fallback domain for old `merit_log` rows.

## 1. Project Setup

- [x] Create Next.js app in `losv2/apps/web`.
- [x] Add TypeScript.
- [x] Add CSS design system.
- [x] Add Supabase packages.
- [x] Add dashboard chart/list primitives.
- [x] Add linting placeholder.
- [ ] Add test runner.
- [ ] Add Playwright.
- [x] Create `.env.example`.
- [x] Create root README.
- [x] Create app README.

## 2. App Shell

- [x] Build login page.
- [x] Build auth provider.
- [x] Build Supabase browser client.
- [x] Build Supabase server client.
- [x] Build middleware for protected routes.
- [x] Build role resolution helper.
- [x] Build role-based dashboard router.
- [x] Build desktop sidebar.
- [x] Build mobile responsive nav layout.
- [x] Build topbar.
- [x] Build loading state.
- [x] Build role-missing state.

## 3. Database Migrations

- [x] Create `r_values`.
- [x] Seed Righteousness.
- [x] Seed Responsibility.
- [x] Seed Respect.
- [x] Create `domains`.
- [x] Seed Washrooms.
- [x] Seed Hallways and Transition.
- [x] Seed Prayer Space.
- [x] Seed Classrooms.
- [x] Seed Lunch/Recess.
- [x] Create `point_values`.
- [x] Seed +5.
- [x] Seed +10.
- [x] Seed +20.
- [x] Seed +50.
- [x] Create `student_user_links`.
- [x] Create `parent_student_links`.
- [x] Create `recognition_logs`.
- [x] Create optional `house_events`.
- [x] Add indexes for recognition filtering.
- [x] Add updated_at triggers.

## 4. RLS and Permissions

- [x] Add read policies for `r_values`.
- [x] Add admin manage policies for `r_values`.
- [x] Add read policies for `domains`.
- [x] Add admin manage policies for `domains`.
- [x] Add read policies for `point_values`.
- [x] Add admin manage policies for `point_values`.
- [x] Add staff insert policy for `recognition_logs`.
- [x] Add staff own-log view policy.
- [x] Add admin all-log view policy.
- [x] Add student visible-log policy.
- [x] Add parent linked-child visible-log policy.
- [x] Add student own-link policy.
- [x] Add parent child-link policy.
- [x] Add house event policies.
- [ ] Add RLS tests.

## 5. Recognition API

- [x] Create `POST /api/recognitions`.
- [x] Validate auth.
- [x] Validate staff permission.
- [x] Validate student.
- [x] Validate 3R.
- [x] Validate domain.
- [x] Validate point value.
- [x] Validate behaviour note.
- [x] Validate visibility.
- [x] Resolve staff snapshot.
- [x] Resolve student snapshot.
- [x] Resolve house snapshot.
- [x] Insert recognition log.
- [x] Write audit log.
- [x] Return recognition ID.
- [ ] Add API tests.

## 6. Student Search API

- [x] Create `GET /api/students/search`.
- [x] Require staff/admin permission.
- [x] Search active students.
- [x] Return name, grade, section, house, ID.
- [x] Limit results.
- [ ] Add tests.

## 7. Staff Dashboard

- [x] Build staff dashboard route.
- [x] Add Recognise Student CTA.
- [x] Add recent recognitions.
- [x] Add house impact card.
- [ ] Add students noticed recently.
- [x] Add students not noticed recently if permitted.
- [ ] Add quick class/grade filters.
- [x] Add responsive mobile layout.

## 8. Recognition Form

- [x] Build student search combobox.
- [x] Build selected student summary.
- [x] Build 3R selector.
- [x] Build domain selector.
- [x] Build point value selector.
- [x] Build behaviour note field.
- [x] Build visibility selector.
- [x] Build submit button.
- [x] Build validation state.
- [x] Build success state.
- [x] Build error state.
- [x] Build reset/new recognition action.
- [x] Ensure flow works on mobile.
- [ ] E2E test full recognition flow.

## 9. House Social Engine

- [x] Build house standings API.
- [x] Build house standings page.
- [x] Show total points by house.
- [ ] Show recognition count by house.
- [ ] Show top contributors.
- [x] Show 3R distribution by house.
- [x] Show domain distribution by house.
- [ ] Show recent house recognitions.
- [x] Add optional house event support.
- [ ] Add house rollup tests.

## 10. Student Growth

- [x] Create `GET /api/student/growth`.
- [x] Resolve linked student.
- [x] Return student profile.
- [x] Return total points.
- [ ] Return house contribution.
- [x] Return recent student-visible recognitions.
- [x] Return 3R breakdown.
- [x] Return domain breakdown.
- [x] Return strongest 3R.
- [x] Return strongest domain.
- [x] Return area to grow.
- [x] Build student dashboard page.
- [x] Build recognition feed.
- [x] Build 3R chart.
- [x] Build domain chart.
- [x] Build reflection prompt card.
- [x] Build goal card placeholder.
- [ ] Add student access tests.

## 11. Parent Dashboard

- [x] Create `GET /api/parent/children`.
- [x] Create `GET /api/parent/children/[studentId]/growth`.
- [x] Enforce parent-child links.
- [x] Return child profile.
- [x] Return parent-visible recognitions.
- [x] Return 3R breakdown.
- [x] Return domain breakdown.
- [ ] Return house contribution.
- [x] Return conversation prompt.
- [x] Build parent dashboard page.
- [x] Build child selector.
- [x] Build child recognition feed.
- [x] Build parent trend cards.
- [ ] Add parent isolation tests.

## 12. Admin/Tarbiyah Dashboard

- [x] Create `GET /api/admin/formation-overview`.
- [x] Add date range filters.
- [x] Add grade filter.
- [ ] Add section filter.
- [x] Add house filter.
- [x] Add staff filter.
- [ ] Add student filter.
- [x] Add 3R filter.
- [x] Add domain filter.
- [x] Return total recognitions.
- [x] Return total points.
- [x] Return house standings.
- [x] Return 3R distribution.
- [x] Return domain distribution.
- [ ] Return grade distribution.
- [x] Return staff participation.
- [x] Return zero-recognition students.
- [x] Return high-volume students.
- [x] Build admin dashboard page.
- [x] Build missed students table.
- [x] Build high-volume students table.
- [x] Build export button.
- [ ] Add admin API tests.

## 13. Reports and Export

- [x] Create CSV export helper.
- [x] Export recognition logs.
- [ ] Export house standings.
- [ ] Export student growth.
- [ ] Export 3R distribution.
- [ ] Export domain distribution.
- [ ] Export missed students.
- [ ] Export staff participation.
- [ ] Add export permission checks.

## 14. Legacy Migration

- [ ] Inspect existing `merit_log` schema.
- [ ] Inspect existing `students` schema.
- [ ] Inspect existing `staff` schema.
- [ ] Map old `r` values to `r_values`.
- [ ] Resolve old student names to student IDs.
- [ ] Resolve old staff names to staff users where possible.
- [ ] Decide fallback domain.
- [ ] Decide default legacy visibility.
- [ ] Write migration script.
- [ ] Dry-run migration.
- [ ] Verify row counts.
- [ ] Verify house totals.
- [ ] Verify student totals.
- [ ] Mark migrated rows.

## 15. Tests

- [ ] Unit test visibility mapping.
- [ ] Unit test dashboard aggregation helpers.
- [ ] Unit test point value validation.
- [ ] Unit test role landing helper.
- [ ] API test recognition submit success.
- [ ] API test recognition missing fields.
- [ ] API test recognition forbidden user.
- [ ] RLS test student can see own visible logs.
- [ ] RLS test student cannot see staff-only logs.
- [ ] RLS test parent can see linked child parent-visible logs.
- [ ] RLS test parent cannot see unlinked child.
- [ ] RLS test parent cannot see student-only logs.
- [ ] E2E login by role.
- [ ] E2E staff recognition flow.
- [ ] E2E student dashboard.
- [ ] E2E parent dashboard.
- [ ] E2E admin dashboard.

## 16. Polish

- [ ] Replace game-heavy wording where inappropriate.
- [ ] Keep house pride visible and central.
- [ ] Make UI mobile-friendly.
- [ ] Make staff recognition flow fast.
- [ ] Ensure buttons and text fit on mobile.
- [ ] Add empty states.
- [ ] Add loading states.
- [ ] Add error states.
- [ ] Add accessible labels.

## 17. Launch

- [ ] Confirm production Supabase project.
- [ ] Run migrations.
- [ ] Seed reference data.
- [ ] Create/link staff users.
- [ ] Create/link student users.
- [ ] Create/link parent users.
- [ ] Backfill legacy data.
- [ ] Run test suite.
- [ ] Run smoke tests.
- [ ] Review admin dashboard with BHA leadership.
- [ ] Prepare staff quick-start guide.
- [ ] Prepare parent/student explanation if needed.
- [ ] Deploy.
