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

- [ ] Create Next.js app in `losv2/apps/web`.
- [ ] Add TypeScript.
- [ ] Add Tailwind CSS.
- [ ] Add Supabase packages.
- [ ] Add Recharts or dashboard chart library.
- [ ] Add linting.
- [ ] Add test runner.
- [ ] Add Playwright.
- [ ] Create `.env.example`.
- [ ] Create root README.
- [ ] Create app README.

## 2. App Shell

- [ ] Build login page.
- [ ] Build auth provider.
- [ ] Build Supabase browser client.
- [ ] Build Supabase server client.
- [ ] Build middleware for protected routes.
- [ ] Build role resolution helper.
- [ ] Build role-based dashboard router.
- [ ] Build desktop sidebar.
- [ ] Build mobile nav.
- [ ] Build topbar.
- [ ] Build loading state.
- [ ] Build access denied state.

## 3. Database Migrations

- [ ] Create `r_values`.
- [ ] Seed Righteousness.
- [ ] Seed Responsibility.
- [ ] Seed Respect.
- [ ] Create `domains`.
- [ ] Seed Washrooms.
- [ ] Seed Hallways and Transition.
- [ ] Seed Prayer Space.
- [ ] Seed Classrooms.
- [ ] Seed Lunch/Recess.
- [ ] Create `point_values`.
- [ ] Seed +5.
- [ ] Seed +10.
- [ ] Seed +20.
- [ ] Seed +50.
- [ ] Create `student_user_links`.
- [ ] Create `parent_student_links`.
- [ ] Create `recognition_logs`.
- [ ] Create optional `house_events`.
- [ ] Add indexes for recognition filtering.
- [ ] Add updated_at triggers.

## 4. RLS and Permissions

- [ ] Add read policies for `r_values`.
- [ ] Add admin manage policies for `r_values`.
- [ ] Add read policies for `domains`.
- [ ] Add admin manage policies for `domains`.
- [ ] Add read policies for `point_values`.
- [ ] Add admin manage policies for `point_values`.
- [ ] Add staff insert policy for `recognition_logs`.
- [ ] Add staff own-log view policy.
- [ ] Add admin all-log view policy.
- [ ] Add student visible-log policy.
- [ ] Add parent linked-child visible-log policy.
- [ ] Add student own-link policy.
- [ ] Add parent child-link policy.
- [ ] Add house event policies.
- [ ] Add RLS tests.

## 5. Recognition API

- [ ] Create `POST /api/recognitions`.
- [ ] Validate auth.
- [ ] Validate staff permission.
- [ ] Validate student.
- [ ] Validate 3R.
- [ ] Validate domain.
- [ ] Validate point value.
- [ ] Validate behaviour note.
- [ ] Validate visibility.
- [ ] Resolve staff snapshot.
- [ ] Resolve student snapshot.
- [ ] Resolve house snapshot.
- [ ] Insert recognition log.
- [ ] Write audit log.
- [ ] Return recognition ID.
- [ ] Add API tests.

## 6. Student Search API

- [ ] Create `GET /api/students/search`.
- [ ] Require staff/admin permission.
- [ ] Search active students.
- [ ] Return name, grade, section, house, ID.
- [ ] Limit results.
- [ ] Add tests.

## 7. Staff Dashboard

- [ ] Build staff dashboard route.
- [ ] Add Recognise Student CTA.
- [ ] Add recent recognitions.
- [ ] Add house impact card.
- [ ] Add students noticed recently.
- [ ] Add students not noticed recently if permitted.
- [ ] Add quick class/grade filters.
- [ ] Add responsive mobile layout.

## 8. Recognition Form

- [ ] Build student search combobox.
- [ ] Build selected student summary.
- [ ] Build 3R selector.
- [ ] Build domain selector.
- [ ] Build point value selector.
- [ ] Build behaviour note field.
- [ ] Build visibility selector.
- [ ] Build submit button.
- [ ] Build validation state.
- [ ] Build success state.
- [ ] Build error state.
- [ ] Build reset/new recognition action.
- [ ] Ensure flow works on mobile.
- [ ] E2E test full recognition flow.

## 9. House Social Engine

- [ ] Build house standings API.
- [ ] Build house standings page.
- [ ] Show total points by house.
- [ ] Show recognition count by house.
- [ ] Show top contributors.
- [ ] Show 3R distribution by house.
- [ ] Show domain distribution by house.
- [ ] Show recent house recognitions.
- [ ] Add optional house event support.
- [ ] Add house rollup tests.

## 10. Student Growth

- [ ] Create `GET /api/student/growth`.
- [ ] Resolve linked student.
- [ ] Return student profile.
- [ ] Return total points.
- [ ] Return house contribution.
- [ ] Return recent student-visible recognitions.
- [ ] Return 3R breakdown.
- [ ] Return domain breakdown.
- [ ] Return strongest 3R.
- [ ] Return strongest domain.
- [ ] Return area to grow.
- [ ] Build student dashboard page.
- [ ] Build recognition feed.
- [ ] Build 3R chart.
- [ ] Build domain chart.
- [ ] Build reflection prompt card.
- [ ] Build goal card placeholder.
- [ ] Add student access tests.

## 11. Parent Dashboard

- [ ] Create `GET /api/parent/children`.
- [ ] Create `GET /api/parent/children/[studentId]/growth`.
- [ ] Enforce parent-child links.
- [ ] Return child profile.
- [ ] Return parent-visible recognitions.
- [ ] Return 3R breakdown.
- [ ] Return domain breakdown.
- [ ] Return house contribution.
- [ ] Return conversation prompt.
- [ ] Build parent dashboard page.
- [ ] Build child selector.
- [ ] Build child recognition feed.
- [ ] Build parent trend cards.
- [ ] Add parent isolation tests.

## 12. Admin/Tarbiyah Dashboard

- [ ] Create `GET /api/admin/formation-overview`.
- [ ] Add date range filters.
- [ ] Add grade filter.
- [ ] Add section filter.
- [ ] Add house filter.
- [ ] Add staff filter.
- [ ] Add student filter.
- [ ] Add 3R filter.
- [ ] Add domain filter.
- [ ] Return total recognitions.
- [ ] Return total points.
- [ ] Return house standings.
- [ ] Return 3R distribution.
- [ ] Return domain distribution.
- [ ] Return grade distribution.
- [ ] Return staff participation.
- [ ] Return zero-recognition students.
- [ ] Return high-volume students.
- [ ] Build admin dashboard page.
- [ ] Build missed students table.
- [ ] Build high-volume students table.
- [ ] Build export button.
- [ ] Add admin API tests.

## 13. Reports and Export

- [ ] Create CSV export helper.
- [ ] Export recognition logs.
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
