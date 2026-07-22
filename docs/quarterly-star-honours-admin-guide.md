# Quarterly Star Honours Administrator Guide

## Access

Open **Quarterly Honours** from the Admin Portal. Candidate rankings, evidence and decisions are confidential. Staff, student and parent accounts cannot open the route or query its records.

`admin` and `tarbiyah_leadership` users can review and finalise awards. `admin` can also refresh scores. Only `super_admin` can create periods, change algorithms or mappings, reopen a finalised period, and revoke an outcome.

## Set Up A Quarter

1. A super administrator opens **Quarterly Honours** and selects **Period**.
2. Enter the code, dates, review-open time and recipient limit. Select a prior period for Rising Star when one is available; otherwise the engine chooses the latest completed period.
3. Populate authoritative instructional days in `academic_calendar_days` and verify enrolment dates before relying on final scores.
4. Use **Edit period** to correct an upcoming period. Active and review-open period dates are locked.
5. Use **Configure** only before the period becomes active. A formula change requires a new algorithm version.

The six award definitions are already seeded. House Catalyst is not part of the feature.

## Refresh And Health

Scores refresh on the deployment schedule. An admin may select **Refresh scores** for an ordinary immediate update. Only one refresh can run for a period at a time.

The overview shows the latest run status, timestamp, source-record count and errors. A failed run retains the previous current snapshot and notifies authorised administrators. Finalised and archived periods cannot be recalculated.

## Review Candidates

1. Open an award card, then use grade, division, house, eligibility, status and student filters as needed.
2. Open a candidate to inspect eligibility reasons, fairness flags, cohort, algorithm version, weighted components, 3R distribution, domains, weekly timeline, staff distribution and representative recognitions.
3. Treat fairness flags as prompts for human review, not evidence of misconduct.
4. **Shortlist** a strong candidate, or **Dismiss** with a required reason. **Save notes** restores or leaves the candidate unreviewed.

An ineligible candidate has no numerical rank among eligible candidates. A super administrator may select one only with an explicit override reason. The reason is audited.

## Select And Finalise

1. Add internal selection notes and draft the positive public citation.
2. For a multi-recipient award, choose the intended numbered slot.
3. Select **Select recipient**. This records a human choice but does not declare the winner.
4. During `review_open`, recheck the frozen evidence and select **Finalise award**. A citation is mandatory.

If a later refresh occurs after selection, the candidate screen links to the frozen snapshot used at selection. Finalise from that snapshot so the displayed evidence matches the auditable recipient reference.

The default rule is one honour per student in a period. An overlap remains visible and blocks finalisation. Only `super_admin` may override it with a required reason. Suggested human review precedence is North Star, an R-specific award, Rising Star, then Steadfast Star; the system never transfers an award automatically.

## Leave An Award Unissued

When fewer than three students qualify, or the evidence is not sufficient, open the candidate list and select **No recipient**. Choose the slot when the period permits multiple recipients and record the reason. Thresholds are not lowered, and the retained decision counts toward period completion.

## Reopen Or Correct

A fully decided period becomes `finalised`. A super administrator can select **Reopen period** and must record a reason. Frozen runs and historical decisions are not deleted.

To correct a selected or finalised recipient, open that candidate and use **Revoke selection/award** with a reason. Revoking an outcome from a finalised period returns the period to review. A reopened no-recipient slot can be filled by selecting a candidate; the old decision remains as a revoked historical row and the replacement is audited.

## Notifications

Authorised Admin Portal users receive one in-app notice per scheduled event:

- 14 days before the end: review approaching
- 7 days before the end: review leading candidates
- 1 day after the end: final snapshot ready
- 3 days after the end: decisions still outstanding
- On score-run failure: diagnostics required

Dismissal affects only the current recipient's inbox. Scheduled runs do not create duplicate notices.

## Interpretation Notes

- A high point total cannot win an award by itself.
- North Star requires all three Rs, broad domain and staff evidence, sustained weeks, significant evidence and balanced R shares.
- R-specific awards use recognition rates normalised within grade/division/school cohorts plus domain, week, staff and significant evidence.
- Rising Star compares a student to a smoothed personal baseline and uses positive language. Do not copy internal baseline details into a citation.
- Steadfast Star favours even week-to-week evidence and does not require high-value events.
- Missing attendance, inferred enrolment, concentrated staff evidence, incomplete tags, clustered events and similar data limitations should be resolved or discussed before finalisation.

## Confidentiality

Exports contain admin-confidential candidate information. Keep them within authorised administrative workflows. Do not put rankings, percentiles, staff concentration, internal notes, dismissal reasons, negative baselines or non-selected candidates into student, parent, staff, house or recognition communications.
