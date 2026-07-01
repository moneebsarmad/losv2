# League of Stars V2 Product Requirements Document

## 1. Product Summary

League of Stars V2 is the next version of BHA's internal recognition and character formation platform.

The product name remains **League of Stars**. The redesign keeps the house system at the center of the social engine while making every point traceable to a meaningful BHA formation moment.

The core product idea is:

> The 3Rs define what BHA is forming.  
> The 5 domains define where school life happens.  
> Staff recognition captures meaningful behaviour.  
> Points motivate students and fuel house culture.  
> Dashboards help students, parents, staff, and Tarbiyah leadership see growth.

## 2. Goals

- Keep **League of Stars** as the product identity.
- Keep houses central to motivation, belonging, celebration, and competition.
- Make every recognition behaviour-specific.
- Require each recognition to connect to one 3R and one domain.
- Make staff recognition fast enough to use during the school day.
- Give students a growth-focused account experience without removing house pride.
- Give parents a useful and privacy-safe view into their own child.
- Give Tarbiyah leadership visibility into who is being noticed, missed, and over-logged.
- Preserve existing BHA concepts: 3Rs, domains, points, recognition, staff/admin/student/parent experiences, and house culture.

## 3. Non-Goals

- Do not remove the house system.
- Do not rename the app away from League of Stars.
- Do not make the app purely administrative.
- Do not turn points into discipline tracking.
- Do not automatically show every staff note to parents.
- Do not expose other students to parents or students.
- Do not build a separate external product disconnected from the current BHA app.

## 4. Core Formation Framework

### 4.1 The 3Rs

The 3Rs are locked core values:

1. Righteousness
2. Responsibility
3. Respect

Every recognition must be tied to exactly one 3R.

### 4.2 The 5 BHA Domains

The canonical domains are:

1. Washrooms
2. Hallways and Transition
3. Prayer Space
4. Classrooms
5. Lunch/Recess

Every recognition must be tied to exactly one domain.

### 4.3 Houses

Houses remain central. The house system is the social engine of LOS:

- Students belong to houses.
- Recognition points contribute to student totals and house totals.
- House standings remain visible and meaningful.
- House celebrations, top contributors, and house pride remain important.
- House competition is powered by real recognition moments, not disconnected point transactions.

## 5. User Roles

### 5.1 Staff

Staff users include teachers, support staff, house mentors, and permitted school staff.

Staff can:

- Recognise students.
- Search/select a student.
- Select one 3R.
- Select one BHA domain.
- Select a point value.
- Add a behaviour-specific note.
- Choose note visibility.
- See their own recent recognitions.
- See basic roster context as permitted.
- See house impact from their recognitions.

### 5.2 Student

Students can:

- Log in to their own account.
- See total points.
- See house contribution.
- See recent recognitions visible to students.
- See 3R breakdown.
- See domain breakdown.
- See strongest 3R and strongest domain.
- See an area to grow.
- Add or view a reflection prompt if enabled.
- Set or view a growth goal if enabled.

Students should feel pride, belonging, and motivation, but the dashboard should not be only a leaderboard.

### 5.3 Parent

Parents can:

- Log in to see only their linked child or children.
- See approved parent-visible recognitions.
- See 3R and domain trends for their own child.
- See child house contribution.
- Read parent-visible staff notes.
- Receive practical conversation prompts.
- Receive weekly/monthly digest summaries if enabled.

Parents cannot:

- See other students.
- See staff-only notes.
- See internal admin analysis.
- See discipline/intervention data unless intentionally enabled later.

### 5.4 Tarbiyah/Admin

Tarbiyah leadership and admins can:

- View school-wide recognition data.
- Filter by date range, grade, section, house, domain, 3R, staff member, and student.
- See total recognitions and points.
- See recognition distribution by 3R.
- See recognition distribution by domain.
- See house standings.
- See students with zero recognition in a selected range.
- See students with unusually high recognition volume.
- Review parent/student-visible notes if moderation is enabled.
- Export CSV.
- Audit system usage.
- Manage reference data and account links.

The key admin question is:

> Who is being formed, who is being noticed, and who is being missed?

## 6. Core User Stories

### 6.1 Staff Recognition

As a staff member, I want to recognise a student in under 15 seconds so that positive behaviour is captured while the moment is still fresh.

Acceptance criteria:

- Staff can open the recognition form from the dashboard in one click.
- Student search returns likely matches quickly.
- 3R selection is required.
- Domain selection is required.
- Point value is required.
- Behaviour note is required.
- Visibility selection is required.
- Submit creates a recognition log.
- The student's house receives the point value.
- Staff sees confirmation and recent recognition appears immediately.

### 6.2 Student Growth View

As a student, I want to see how I am growing across the 3Rs and domains so that points feel connected to who I am becoming.

Acceptance criteria:

- Student sees total points.
- Student sees house contribution.
- Student sees recent student-visible recognitions.
- Student sees 3R breakdown.
- Student sees domain breakdown.
- Student sees strongest 3R/domain.
- Student sees a growth prompt.
- Student cannot see staff-only or parent-only notes.

### 6.3 Parent Child View

As a parent, I want to see approved recognitions for my child so that I can reinforce positive growth at home.

Acceptance criteria:

- Parent sees only linked children.
- Parent can select a child if more than one is linked.
- Parent sees parent-visible recognitions only.
- Parent sees 3R/domain trends.
- Parent sees suggested conversation prompt when notes are available.
- Parent does not see staff-only notes.

### 6.4 Admin Formation Overview

As Tarbiyah leadership, I want to monitor recognition patterns so that I can identify students who are being missed and support consistent implementation.

Acceptance criteria:

- Admin sees total recognitions in selected date range.
- Admin sees recognition count and point distribution by 3R.
- Admin sees recognition count and point distribution by domain.
- Admin sees house standings.
- Admin sees zero-recognition students in range.
- Admin sees high-volume recognition students.
- Admin can filter by grade, section, house, staff, student, 3R, domain, and date range.
- Admin can export CSV.

## 7. Recognition Workflow

The staff workflow:

1. Open League of Stars.
2. Click **Recognise Student**.
3. Search/select student.
4. Select 3R:
   - Righteousness
   - Responsibility
   - Respect
5. Select domain:
   - Washrooms
   - Hallways and Transition
   - Prayer Space
   - Classrooms
   - Lunch/Recess
6. Select point value:
   - +5 Expected positive behaviour
   - +10 Strong positive behaviour
   - +20 Significant character moment
   - +50 Exceptional moral courage / rare high-impact recognition
7. Add short behaviour-specific note.
8. Choose visibility:
   - Staff only
   - Student-visible
   - Parent-visible
   - Student + parent visible
9. Submit.

## 8. Visibility Rules

Each recognition has a visibility setting.

| Visibility | Staff | Student | Parent | Admin |
|---|---:|---:|---:|---:|
| Staff only | Yes | No | No | Yes |
| Student-visible | Yes | Yes | No | Yes |
| Parent-visible | Yes | No | Yes | Yes |
| Student + parent visible | Yes | Yes | Yes | Yes |

Admin may optionally moderate parent/student-visible notes before they become visible.

## 9. House System Requirements

Houses must remain core to LOS.

Required house features:

- House standings.
- House total points.
- House recognition count.
- House distribution by 3R.
- House distribution by domain.
- Student contribution to house.
- House celebration moments.
- House leaderboard/top contributors.
- House filters in admin dashboard.

Important principle:

> House points should remain exciting, but each point should have a meaningful formation source.

## 10. Data Requirements

Each recognition must store:

- Student
- Staff user
- 3R
- Domain
- Point value
- Behaviour note
- Visibility
- House at time of recognition
- Created timestamp
- Updated timestamp
- Optional review status

Student and parent access must be based on explicit links, not name matching.

## 11. Reporting Requirements

Reports should include:

- Recognition log export.
- House standings export.
- Student growth export.
- 3R distribution export.
- Domain distribution export.
- Staff participation export.
- Missed students export.
- Parent-visible recognition audit export.

## 12. Success Metrics

- Staff can submit recognition in under 15 seconds after student selection.
- Staff recognition volume increases.
- Zero-recognition student count decreases.
- Parent-visible recognitions are used intentionally.
- Students can identify their strongest 3R/domain.
- Admins can detect uneven recognition patterns by staff, grade, house, 3R, and domain.
- House standings remain active and motivating.

## 13. Open Questions

- Should parent/student-visible notes require admin moderation before publishing?
- Should students be allowed to write reflections immediately, or should reflection be phase 2?
- Should staff be allowed to recognise multiple students at once in V2, or should V2 start with one-student recognition for better note quality?
- Should house competition-only points still exist, and if so, should they require an event type separate from recognition?
- Should students see house leaderboard by default or inside a separate House tab?
