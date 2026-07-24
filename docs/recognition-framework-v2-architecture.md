# BHA Recognition Framework v2

## Purpose

Recognition Framework v2 replaces staff-selected point amounts with a universal, behaviour-specific library. It extends the existing League of Stars ledger; it does not create another points system.

The model is:

```text
Student → 3R → observable behaviour → domain → fixed system-assigned points
```

- The **3R** describes the core value demonstrated.
- The **behaviour** describes the specific positive action observed.
- The **domain** records where it happened.
- The **Graduate Value** records the long-term formation meaning.
- The **points snapshot** records the fixed value assigned by the selected definition.

## Universal 3Rs and contextual domains

Righteousness, Responsibility, and Respect each exist once in `r_values`. The 31 recognition definitions also exist once per school and framework version. There is no `domain_id` on `recognition_definitions` and no behaviour-to-domain join table.

Every v2 award separately references exactly one of these canonical domains:

| Code | Label |
| --- | --- |
| `prayer_space` | Prayer Space (Muṣallā) |
| `hallways_transitions` | Hallways & Transitions |
| `classroom_learning` | Classroom & Learning |
| `lunch_recess` | Lunch / Recess |
| `bathrooms` | Bathrooms |

Because the domain is contextual, selecting another domain never changes the behaviour label, 3R, Graduate Value, or point value.

## Data model

### Definitions

`recognition_definitions` stores the stable code, 3R, canonical wording, fixed point value, direct/nomination mode, note rule, active state, sort order, and framework version.

`graduate_values` stores exactly the six official Graduate Values:

- `ihsan` — Conscious Excellence
- `sidq` — Courageous Honesty
- `sabr` — Beautiful Patience
- `khilafah` — Faithful Stewardship
- `tawadu` — Grounded Humility
- `adl` — Unwavering Justice

`recognition_definition_graduate_values` assigns one primary and, where approved, one secondary value. Only `Completed a Hard Responsibility` and `Walked Away From Escalating Conflict` use a secondary value in v2.

### Canonical ledger

`recognition_logs` remains the source of truth for points. V2 adds:

- the selected definition and domain;
- `recognition_v2` framework version;
- fixed point, 3R, behaviour wording, Graduate Value, and award-mode snapshots;
- observation time and submission idempotency key;
- approved/reversed status and reversal audit fields;
- an optional exceptional-nomination reference.

Snapshots preserve historical meaning if a later framework version changes wording or values. Active totals read only approved, active, non-deleted awards.

### Exceptional nominations

`recognition_nominations` stores a single-student `+50` nomination, explanation, optional witness information, review state, reviewer, review note, and resulting award ID.

Pending and rejected nominations never appear in the ledger. Approval locks and re-checks the pending nomination, creates exactly one `+50` ledger row, then links that award back to the nomination in the same transaction. A repeated approval returns the existing result and cannot create another award.

## Authoritative operations

Clients call these security-definer PostgreSQL functions:

- `create_recognition_awards_v2`
- `submit_recognition_nomination_v2`
- `review_recognition_nomination_v2`
- `withdraw_recognition_nomination_v2`
- `reverse_recognition_award_v2`
- `set_recognition_definition_active_v2`

The direct-award operation derives the actor from `auth.uid()`, loads the selected definition, resolves its fixed points and Graduate Values, verifies the canonical domain and school-scoped students, snapshots current House membership, and writes one ledger row per student.

The client has no authoritative points or awarding-staff parameter. Authenticated clients also have no direct insert/update/delete privilege on the ledger or nomination table.

Submission-level idempotency is enforced by the school, submission key, and student. An identical retry returns the original result; reusing a key for a different award fails.

## Notes and exceptional recognition

- `+5` and `+10`: note optional.
- `+20`: trimmed note of at least 15 characters and at most 500 characters.
- `+50`: nomination explanation of 20–500 characters and approval required.
- Bulk direct awards create one row per student.
- Bulk exceptional nominations are not supported.

The UI reminds staff that one event receives one award and asks them to choose the single behaviour that best describes the main action.

## RBAC, RLS, and school isolation

The feature reuses the existing `roles`, `permissions`, `role_permissions`, `profiles`, and `current_user_school_id()` architecture.

- Existing award-capable roles receive `recognitions.create` and `recognitions.nominate`.
- `super_admin`, `admin`, and `tarbiyah_leadership` receive nomination-review, reversal, and governance-analytics permissions.
- Students, parents, and unauthenticated users cannot award or nominate.
- Ordinary staff cannot approve exceptional nominations, reverse awards, or change definitions.
- Definition, Graduate Value, nomination, ledger, student, and profile operations are constrained to the actor's school.
- Reference reads and admin analytics remain subject to school-scoped server checks.

## Legacy coexistence

Migration 009 does not infer new behaviours from broad historical categories. Existing ledger rows retain their original values, receive a `legacy` framework marker where needed, and are backfilled only with safe snapshots of their existing data.

Historical awards may keep `recognition_definition_id = null`. Legacy and v2 approved awards both contribute to current student and House totals. Reporting can distinguish them with `framework_version`.

Canonical domain normalization safely reuses existing rows and repoints their foreign keys before removing a duplicate. No historical point value is changed.

## Reversal and audit

Awards are never silently deleted. An authorised reversal requires a reason, marks the original ledger row `reversed`, records the acting admin and timestamp, and writes an audit event. Active-total views exclude the row while retaining its history.

Audit records are also written for direct awards, nominations, approvals, rejections, withdrawals, definition activation changes, and exceptional award creation. Definition identity and point values cannot be rewritten in place.

## Reporting and anti-inflation controls

`v_recognition_reporting` exposes approved active records by school, student, House, staff, 3R, behaviour, Graduate Value, domain, tier, framework, and direct/exceptional mode.

`v_recognition_possible_duplicates` reports same-student, same-staff, same-behaviour, same-domain awards in a short interval for review; it does not punish or block legitimate repeated recognition.

The admin dashboard provides date, grade, student, House, staff, 3R, behaviour, Graduate Value, domain, tier, framework, and mode filters. It includes totals, staff averages, `+20` share, unique students, concentration, distributions, nomination states, and possible duplicates. These comparisons are restricted to governance roles.

## Adding a future definition safely

1. Confirm the action is a specific, observable, positive behaviour and is not a domain-specific copy.
2. Create a new migration and framework version; do not update an existing definition's identity or points.
3. Use only `5`, `10`, `20`, or nomination-only `50`.
4. Attach exactly one 3R and one primary official Graduate Value; add a secondary value only where genuinely needed.
5. Add the canonical wording, sorting, and Graduate Value seed rows.
6. Update generated types/reference fixtures if the contract changes.
7. Extend definition, workflow, RLS, UI, legacy-total, and reporting tests.

Historical awards continue using their stored snapshots and framework version.

## Deployment

Apply migrations in order:

1. `009_recognition_framework_v2_foundation.sql`
2. `010_recognition_framework_v2_security.sql`

Deploy the web application only after both migrations succeed. Then regenerate Supabase types from the deployed schema, run the type check, database tests, production build, and a role-based smoke test for direct awards, nominations, approval, reversal, totals, and legacy records.
