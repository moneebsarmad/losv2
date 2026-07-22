// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { QuarterlyHonoursCandidateDetail } from './QuarterlyHonoursCandidateDetail'

const payload = {
  candidate: {
    id: 'candidate-1',
    award_period_id: 'period-1',
    award_definition_id: 'award-1',
    student_id: 'student-1',
    algorithm_version: 'quarterly-star-honours-v1',
    total_score: 91.5,
    eligible: true,
    eligibility_reasons: [],
    fairness_flags: ['missing_attendance_data', 'tag_taxonomy_unavailable'],
    rank_in_school: 1,
    normalisation_cohort: { label: 'Grade 8', size: 24 },
    raw_metrics: {
      recognition_events_by_r: {
        righteousness: { events: 4, points: 50, ratePer10Days: 1, eventShare: 0.33 },
        responsibility: { events: 4, points: 45, ratePer10Days: 1, eventShare: 0.33 },
        respect: { events: 4, points: 45, ratePer10Days: 1, eventShare: 0.34 },
      },
      weekly_recognition_counts: { '2026-07-06': 2, '2026-07-13': 1 },
      recognition_count_by_domain: { classrooms: 4 },
      recognitions_by_staff_member: { 'staff-1': 4 },
      recognising_staff_names: { 'staff-1': 'Nadia Hassan' },
      active_recognition_week_count: 2,
      consistency_percentage: 100,
      longest_gap_in_eligible_weeks: 0,
      distinct_recognising_staff_count: 1,
      maximum_staff_concentration: 0.33,
    },
    component_scores: {
      balanced_three_r: {
        label: 'Balanced 3R strength', rawValue: 33, normalisedScore: 95,
        weight: 0.45, weightedContribution: 42.75,
      },
    },
    evidence_summary: {
      representative_recognitions: [{
        id: 'recognition-1', date: '2026-07-14', r: 'Righteousness',
        domain: 'Prayer Space', points: 20, staff: 'Nadia Hassan', significant: true,
        note: 'Supported younger students in preparing calmly for salah without prompting.',
      }],
    },
    students: { student_name: 'Amina Rahman', grade: 8, section: 'A', house: 'House of Khadijah' },
    quarterly_award_definitions: { code: 'north_star', name: 'North Star Award' },
    quarterly_award_score_runs: { completed_at: '2026-07-21T18:00:00Z' },
    quarterly_award_periods: { name: 'Quarter 1', status: 'review_open', recipient_limit_per_award: 1 },
  },
  review: { review_status: 'shortlisted', internal_notes: '', public_citation_draft: '' },
  awardOverlaps: [],
  awardRecipients: [],
  domains: [{ id: 'domain-1', key: 'classrooms', name: 'Classroom and Learning' }],
  viewerRole: 'admin',
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('QuarterlyHonoursCandidateDetail', () => {
  it('renders transparent score components, fairness flags and representative evidence', async () => {
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: async () => payload } as Response)))
    render(<QuarterlyHonoursCandidateDetail candidateId="candidate-1" />)

    expect(await screen.findByRole('heading', { name: 'Amina Rahman' })).toBeTruthy()
    expect(screen.getByText('Balanced 3R strength')).toBeTruthy()
    expect(screen.getByText('Missing Attendance Data')).toBeTruthy()
    expect(screen.getByText('Tag Taxonomy Unavailable')).toBeTruthy()
    expect(screen.getByText('Supported younger students in preparing calmly for salah without prompting.')).toBeTruthy()
    expect(screen.getByText('quarterly-star-honours-v1')).toBeTruthy()
  })
})
