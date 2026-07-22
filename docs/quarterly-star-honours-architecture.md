# Quarterly Star Honours Architecture

## Repository Map

League of Stars is a Next.js 16 App Router application in `apps/web`. Authentication uses Supabase Auth, server sessions use `@supabase/ssr`, and PostgreSQL RLS is the final database authorization boundary. The application already resolved effective roles through `profiles.role` and `role_permissions`; Quarterly Star Honours extends that model rather than creating a separate role system.

### Reused source data

| Existing object | Honours use |
| --- | --- |
| `profiles`, `roles`, `permissions`, `role_permissions` | Effective role, school scope and granular honours permissions |
| `students` | Candidate identity, grade, section and house |
| `recognition_logs` | Valid positive recognition events and staff sources |
| `r_values` | Canonical Righteousness, Responsibility and Respect values |
| `domains` | Canonical five-domain configuration; IDs are never hardcoded |
| `point_values` | Significant and exceptional point thresholds |
| `audit_logs` | Before/after audit records for review and governance actions |

The pre-feature schema had no tenant, enrolment, calendar, attendance, incident, notification, term, or generated TypeScript type model. Migrations therefore add `schools` and school foreign keys to the existing data, plus the minimum calendar and enrolment structures needed for fair active-day calculations.

### New persistent objects

- `schools`, `academic_years`, `academic_calendar_days`, `student_enrolments`
- `quarterly_award_definitions`, seeded with exactly six stable codes
- `quarterly_award_periods`
- `quarterly_award_score_runs`
- `quarterly_award_candidate_scores`
- `quarterly_award_candidate_reviews`
- `quarterly_award_recipients`
- `quarterly_award_signal_mappings`
- `quarterly_award_notifications`

`school_id` is required on all operational honours records. The global award definitions can be overridden per school without changing historical records. Recipient rows support school, division, and grade scopes plus numbered slots; the initial UI uses school scope and honours each configured recipient slot.

## Calculation Pipeline

`refreshQuarterlyHonoursScores()` in `apps/web/src/lib/honours/refresh.ts` loads a period, the school timezone, configured definitions, calendar, enrolments, domains, point tiers, valid recognitions, and optional signal mappings. `scoring.ts` performs all calculations in memory once per run and persists the complete result atomically through `persist_quarterly_award_score_snapshots()`.

The source view `v_award_eligible_recognitions` includes only active, positive, approved or review-not-required records. It excludes deleted, draft, test, duplicate, voided and reversed records. The scorer then restricts records to the school, award-period dates, and each student's active enrolment dates.

Every student/award snapshot stores:

- Raw event, point, rate, week, gap, R, domain, staff, concentration and significant-event metrics
- Normalised component scores, configured weights and weighted contributions
- Eligibility status and plain-language reasons
- Fairness and data-quality flags
- Representative evidence
- Grade, division or school comparison cohort
- Algorithm version and source score run
- School and eligible-only ranks; ineligible students remain unranked

The engine calculates all six awards. Raw points are supporting evidence only and are not a primary component. North Star uses balanced 3R strength, breadth and consistency. R-specific honours use within-cohort event-rate percentiles plus consistency and breadth. Rising Star uses smoothed personal growth. Steadfast Star uses regularity and distribution without requiring significant events.

## Normalisation And Baselines

Eligible days are instructional days during active enrolment. Full-day attendance is not currently available, so the recorded method is `scheduled_eligible_days`. When `academic_calendar_days` has no rows, the transparent fallback is scheduled weekdays and the snapshot receives `calendar_weekday_fallback`.

Weeks use Monday boundaries in the school's configured timezone. A week is eligible with at least three eligible days, or when the calendar marks it as an official short week.

Cohort comparison follows the required hierarchy:

1. Same grade with at least 15 eligible students
2. Entire Middle School or High School division with at least 15 eligible students
3. Entire school

Rising Star first tries the previous completed award period for each student. A student without 20 eligible baseline days falls back individually to first-half versus second-half growth after six elapsed weeks. Smoothed rates prevent tiny baselines from appearing as extraordinary percentage growth.

## Database Interfaces

Private security-invoker views:

- `v_award_eligible_recognitions`
- `v_current_award_candidate_scores`

The browser cannot query either view directly. Server routes use a service client only after session authorization and always apply the authenticated user's `school_id`.

Client-callable modifying RPCs derive identity from `auth.uid()`, check the current permission and school, use a fixed safe `search_path`, validate period state, and write audit records:

- `create_quarterly_award_period`
- `update_quarterly_award_review`
- `select_quarterly_award_recipient`
- `finalise_quarterly_award_recipient`
- `finalise_quarterly_award_without_recipient`
- `reopen_quarterly_award_period`
- `revoke_quarterly_award_recipient`
- `mark_quarterly_award_notification`
- `update_quarterly_award_definition`
- `upsert_quarterly_award_signal_mapping`
- `deactivate_quarterly_award_signal_mapping`

Score persistence is service-role-only. A partial unique index permits only one queued/running refresh per period, and snapshot replacement is atomic. Previous snapshots are marked non-current, never deleted. Final recipients retain the exact candidate snapshot ID used at selection.

## RBAC And Privacy

Four independent controls protect the feature:

1. Navigation metadata includes Quarterly Honours only for Admin Portal roles.
2. `/dashboard/admin/*` has a server layout guard, and every API route performs session and permission checks before loading data.
3. RPCs resolve identity and effective permissions from `auth.uid()`; no client-provided user ID or role is trusted.
4. RLS exposes honours rows only to `super_admin`, `admin`, and `tarbiyah_leadership` in their own school. Authenticated clients have no direct mutation grants.

Honours tables are explicitly absent from the Supabase Realtime publication. Staff, student and parent APIs do not load honours data. Finalised awards remain admin-confidential in this release.

Permission split:

- `super_admin`: view, diagnostics, refresh, review, finalise, configure, export, reopen and revoke
- `admin`: view, refresh, review, finalise and export
- `tarbiyah_leadership`: view, review, finalise and export
- All other roles: no access

## Indexes

The migrations add school/date and school/student/date indexes to recognition data, plus indexes for period status/dates, run status, current eligible candidate sorting, student history, review queues, active recipient history and unread notification inboxes. Partial unique indexes enforce one current candidate snapshot, one active score run per period, and one active outcome per configured recipient slot.

## Routes And Components

- `/dashboard/admin/quarterly-honours`: period health, notifications and six review queues
- `/dashboard/admin/quarterly-honours/candidates`: filters, sorting, export and no-recipient decisions
- `/dashboard/admin/quarterly-honours/candidates/[candidateId]`: score explanation, evidence and human review workflow
- `/dashboard/admin/quarterly-honours/configuration`: super-admin algorithm and signal mapping controls
- `/api/admin/quarterly-honours/**`: school-scoped admin endpoints
- `/api/cron/quarterly-honours`: `CRON_SECRET`-protected maintenance endpoint

## Scheduling And Notifications

`vercel.json` invokes the maintenance route nightly at 07:00 UTC, which is compatible with the project's current Vercel plan. The endpoint is idempotent and retains a five-hour refresh guard during the final 14 days, so a Vercel Pro or external scheduler can call the same route every six hours without code changes. Each run transitions period state, creates the period-end frozen snapshot, and inserts deduplicated in-app notifications at 14 days, 7 days, one day after the end, and three days after the end when decisions remain. Score-run failures create an admin-only diagnostic notification.

Set `CRON_SECRET` in each deployed environment. Vercel sends it as the bearer token. To adopt the recommended six-hour final-window cadence, change the Vercel schedule to `0 */6 * * *` on a plan that supports sub-daily cron jobs, or invoke the endpoint from the existing trusted scheduler with the same bearer secret. The notification table and dispatcher can support a future email or push adapter without changing candidate privacy.

## Algorithm Versioning

Version `quarterly-star-honours-v1` is stored on each definition, period, score run and candidate snapshot. A configuration change requires a new version string and is blocked while any school period is active or review-open. Updating a definition creates or updates a school-scoped override; global seed definitions and historical snapshots remain unchanged. Upcoming periods adopt the new version, while finalised and archived periods cannot be recalculated.

When a formula changes:

1. Change the readable scorer and defaults.
2. assign a new `quarterly-star-honours-vN` version through the configuration workflow;
3. refresh only upcoming/active periods approved for that version;
4. retain old runs, snapshots, recipient references and audits.

## Assumptions And Data Gaps

- No attendance table exists. Eligible scheduled days are used and `missing_attendance_data` is retained on snapshots.
- No pre-existing academic calendar existed. The new calendar table is preferred; weekday fallback is explicit.
- No pre-existing enrolment history existed. Migration backfill dates are marked inferred and must be replaced with authoritative enrolment dates when available.
- No reliable behaviour-tag/subcategory taxonomy exists. Domain and R mappings work now; tag-dependent evidence remains flagged as unavailable.
- No reliable incident/concern dataset exists. Rising Star uses the required 45/25/15/15 positive-growth formula and does not expose invented concern reductions.
- No existing notification framework or scheduler existed. The feature uses an admin-only table and the existing Vercel deployment model.
- Recognition event dates are backfilled from `created_at` where historical records lacked a distinct event date.
- Existing point tiers determine significant and exceptional thresholds. The current fallback expectation is 20 and 50, but IDs and values are not hardcoded.
- Final award publication to students, parents or public channels is deliberately out of scope.

## Verification

Run:

```bash
npm test
npm run typecheck
npm run build
SUPABASE_DB_POOLER_HOST=<pooler-host> npm run test:db
```

The pgTAP suite covers all portal roles, tenant isolation, direct table access, Realtime exclusion, source-record filtering, configuration/version locks, notifications, refresh concurrency, review/finalisation, overlap overrides, reopening, revocation and retained no-recipient replacements.
