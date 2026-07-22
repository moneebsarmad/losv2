import { describe, expect, it } from 'vitest'
import { AWARD_CODES, DEFAULT_AWARD_CONFIG, HONOURS_ALGORITHM_VERSION, type AwardCode, type RKey } from './constants'
import { calculateQuarterlyHonours, generateWeekdayCalendar } from './scoring'
import type { HonoursRecognition, HonoursStudent, ScoringInput } from './types'

const SCHOOL_ID = 'school-bha'
const CURRENT_PERIOD = {
  id: 'period-current',
  schoolId: SCHOOL_ID,
  code: 'Q4',
  name: 'Quarter 4',
  startsOn: '2026-04-01',
  endsOn: '2026-06-30',
  baselinePeriodId: 'period-baseline',
  algorithmVersion: HONOURS_ALGORITHM_VERSION,
}
const BASELINE_PERIOD = {
  id: 'period-baseline',
  schoolId: SCHOOL_ID,
  code: 'Q3',
  name: 'Quarter 3',
  startsOn: '2026-01-01',
  endsOn: '2026-03-31',
  algorithmVersion: HONOURS_ALGORITHM_VERSION,
}
const DOMAINS = [
  ['classrooms', 'Classroom and Learning'],
  ['hallways_transition', 'Hallways and Transitions'],
  ['lunch_recess', 'Lunch and Recess'],
  ['prayer_space', 'Prayer Space'],
  ['washrooms', 'Washrooms and Shared Facilities'],
] as const
const STAFF = ['staff-a', 'staff-b', 'staff-c', 'staff-d', 'staff-e', 'staff-f']

function student(id: string, name: string, grade = 8): HonoursStudent {
  return { id, schoolId: SCHOOL_ID, name, grade, section: 'A', house: 'House of Khadijah', active: true }
}

function weekDates(startsOn: string, endsOn: string) {
  const calendar = generateWeekdayCalendar(startsOn, endsOn)
  const dates = new Map<string, string>()
  calendar.forEach((day) => {
    const date = new Date(`${day.date}T00:00:00.000Z`)
    const weekday = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() - weekday + 1)
    const monday = date.toISOString().slice(0, 10)
    if (!dates.has(monday)) dates.set(monday, day.date)
  })
  return [...dates.values()]
}

let recognitionSequence = 0
function recognition(args: {
  studentId: string
  date: string
  r: RKey
  domainIndex: number
  staffIndex: number
  points?: number
  note?: string
}): HonoursRecognition {
  recognitionSequence += 1
  const domain = DOMAINS[args.domainIndex % DOMAINS.length]
  return {
    id: `recognition-${recognitionSequence}`,
    schoolId: SCHOOL_ID,
    studentId: args.studentId,
    staffId: STAFF[args.staffIndex % STAFF.length],
    staffName: `Staff ${String.fromCharCode(65 + (args.staffIndex % STAFF.length))}`,
    date: args.date,
    rKey: args.r,
    rName: args.r[0].toUpperCase() + args.r.slice(1),
    domainId: `domain-${domain[0]}`,
    domainKey: domain[0],
    domainName: domain[1],
    points: args.points ?? 10,
    note: args.note ?? `Evidence for ${args.studentId}`,
  }
}

function buildFixture(): ScoringInput {
  recognitionSequence = 0
  const currentWeeks = weekDates(CURRENT_PERIOD.startsOn, CURRENT_PERIOD.endsOn)
  const baselineWeeks = weekDates(BASELINE_PERIOD.startsOn, BASELINE_PERIOD.endsOn)
  const students = [
    student('balanced', 'Balanced North Star'),
    student('point-outlier', 'Raw Point Outlier'),
    student('steadfast', 'Steadfast Student'),
    student('burst', 'One Week Burst'),
    student('rising', 'Rising Student'),
    student('tiny-growth', 'Tiny Baseline Student'),
    student('concentrated', 'Staff Concentration Student'),
    student('partial', 'Partial Enrolment Student'),
    ...Array.from({ length: 8 }, (_, index) => student(`cohort-${index}`, `Cohort Student ${index + 1}`)),
  ]
  const enrolments = students.map((row) => ({
    studentId: row.id,
    schoolId: SCHOOL_ID,
    startsOn: row.id === 'partial' ? '2026-05-11' : BASELINE_PERIOD.startsOn,
    endsOn: null,
    datesInferred: row.id === 'partial',
  }))
  const recognitions: HonoursRecognition[] = []

  const rCycle: RKey[] = ['righteousness', 'responsibility', 'respect']
  currentWeeks.slice(0, 12).forEach((date, index) => {
    recognitions.push(recognition({
      studentId: 'balanced', date, r: rCycle[index % 3], domainIndex: index % 5,
      staffIndex: index % 4, points: index === 2 || index === 8 ? 20 : 10,
    }))
  })
  recognitions.push(recognition({
    studentId: 'point-outlier', date: currentWeeks[2], r: 'respect', domainIndex: 0,
    staffIndex: 0, points: 50, note: 'One exceptional event only',
  }))

  currentWeeks.slice(0, 12).forEach((date, index) => {
    recognitions.push(recognition({
      studentId: 'steadfast', date, r: index % 2 ? 'respect' : 'responsibility',
      domainIndex: index % 3, staffIndex: index % 3, points: 5,
    }))
  })
  Array.from({ length: 12 }, (_, index) => {
    recognitions.push(recognition({
      studentId: 'burst', date: currentWeeks[3], r: rCycle[index % 3],
      domainIndex: index % 5, staffIndex: index % 4, points: 10,
    }))
  })

  baselineWeeks.slice(0, 2).forEach((date, index) => {
    recognitions.push(recognition({
      studentId: 'rising', date, r: 'responsibility', domainIndex: 0,
      staffIndex: index, points: 5,
    }))
  })
  currentWeeks.slice(2, 10).forEach((date, index) => {
    recognitions.push(recognition({
      studentId: 'rising', date, r: rCycle[index % 3], domainIndex: index % 4,
      staffIndex: index % 4, points: 10,
    }))
  })

  recognitions.push(recognition({
    studentId: 'tiny-growth', date: baselineWeeks[2], r: 'respect', domainIndex: 0,
    staffIndex: 0, points: 5,
  }))
  currentWeeks.slice(2, 4).forEach((date, index) => {
    recognitions.push(recognition({
      studentId: 'tiny-growth', date, r: 'respect', domainIndex: index,
      staffIndex: index, points: 5,
    }))
  })

  currentWeeks.slice(0, 10).forEach((date, index) => {
    recognitions.push(recognition({
      studentId: 'concentrated', date, r: rCycle[index % 3], domainIndex: index % 5,
      staffIndex: 0, points: index < 2 ? 20 : 10,
    }))
  })

  currentWeeks.filter((date) => date >= '2026-05-11').slice(0, 8).forEach((date, index) => {
    recognitions.push(recognition({
      studentId: 'partial', date, r: rCycle[index % 3], domainIndex: index % 4,
      staffIndex: index % 4, points: 10,
    }))
  })

  return {
    period: CURRENT_PERIOD,
    baselinePeriod: BASELINE_PERIOD,
    students,
    enrolments,
    calendarDays: generateWeekdayCalendar(CURRENT_PERIOD.startsOn, CURRENT_PERIOD.endsOn),
    baselineCalendarDays: generateWeekdayCalendar(BASELINE_PERIOD.startsOn, BASELINE_PERIOD.endsOn),
    recognitions,
    awardDefinitions: AWARD_CODES.map((code) => ({
      id: `award-${code}`,
      code,
      configuration: DEFAULT_AWARD_CONFIG[code] as unknown as Record<string, unknown>,
    })),
    configuredDomainCount: 5,
    significantPointThreshold: 20,
    exceptionalPointThreshold: 50,
    asOfDate: CURRENT_PERIOD.endsOn,
    calendarMethod: 'academic_calendar',
    attendanceMethod: 'scheduled_eligible_days',
    signalTaxonomyAvailable: false,
  }
}

function score(fixture: ScoringInput, award: AwardCode, studentId: string) {
  return calculateQuarterlyHonours(fixture).find(
    (candidate) => candidate.awardCode === award && candidate.studentId === studentId
  )!
}

describe('Quarterly Star Honours scoring', () => {
  it('seeds and calculates exactly the six intended awards without House Catalyst', () => {
    expect(AWARD_CODES).toEqual([
      'north_star', 'righteousness_beacon', 'responsibility_anchor',
      'respect_ambassador', 'rising_star', 'steadfast_star',
    ])
    expect(calculateQuarterlyHonours(buildFixture())).toHaveLength(16 * 6)
  })

  it('makes the balanced student eligible for North Star while the raw-point outlier is unranked', () => {
    const fixture = buildFixture()
    const balanced = score(fixture, 'north_star', 'balanced')
    const outlier = score(fixture, 'north_star', 'point-outlier')
    expect(balanced.eligible).toBe(true)
    expect(balanced.rankInSchool).not.toBeNull()
    expect(outlier.eligible).toBe(false)
    expect(outlier.rankInSchool).toBeNull()
    expect(outlier.rawMetrics.positive_points).toBe(50)
  })

  it('rewards quiet weekly distribution for Steadfast and rejects a one-week burst', () => {
    const fixture = buildFixture()
    const steadfast = score(fixture, 'steadfast_star', 'steadfast')
    const burst = score(fixture, 'steadfast_star', 'burst')
    expect(steadfast.eligible).toBe(true)
    expect(steadfast.rawMetrics.significant_event_count).toBe(0)
    expect(burst.eligible).toBe(false)
    expect(burst.eligibilityReasons).toContain('Recognition is required in at least 80% of eligible weeks.')
  })

  it('uses smoothed personal growth and rejects the unstable tiny-volume case', () => {
    const fixture = buildFixture()
    const rising = score(fixture, 'rising_star', 'rising')
    const tiny = score(fixture, 'rising_star', 'tiny-growth')
    expect(rising.eligible).toBe(true)
    expect((rising.rawMetrics.growth_components as Record<string, number>).positiveComponents).toBeGreaterThanOrEqual(3)
    expect(tiny.eligible).toBe(false)
    expect(tiny.eligibilityReasons).toContain('Requires at least 6 current-period recognition events.')
  })

  it('flags and disqualifies evidence dominated by one staff member', () => {
    const concentrated = score(buildFixture(), 'north_star', 'concentrated')
    expect(concentrated.eligible).toBe(false)
    expect(concentrated.rawMetrics.maximum_staff_concentration).toBe(1)
    expect(concentrated.fairnessFlags).toContain('high_staff_concentration')
  })

  it('normalises active days for a student enrolled midway through the quarter', () => {
    const fixture = buildFixture()
    const partial = score(fixture, 'north_star', 'partial')
    const full = score(fixture, 'north_star', 'balanced')
    expect(Number(partial.rawMetrics.eligible_days)).toBeLessThan(Number(full.rawMetrics.eligible_days))
    expect(Number(partial.rawMetrics.recognition_event_rate_per_10_days)).toBeGreaterThan(0)
    expect(partial.fairnessFlags).toContain('student_enrolled_partway_through_period')
  })

  it('uses a grade cohort when at least 15 students in that grade are eligible', () => {
    const candidate = score(buildFixture(), 'north_star', 'balanced')
    expect(candidate.normalisationCohort.type).toBe('grade')
    expect(candidate.normalisationCohort.label).toBe('Grade 8')
    expect(candidate.normalisationCohort.size).toBe(16)
  })

  it('uses the full division when the student grade is below the cohort minimum', () => {
    const fixture = buildFixture()
    fixture.students.forEach((row, index) => { row.grade = index === 15 ? 7 : 6 })
    const targetId = fixture.students[15].id
    const dates = weekDates(CURRENT_PERIOD.startsOn, CURRENT_PERIOD.endsOn)
    ;(['righteousness', 'responsibility', 'respect'] as RKey[]).forEach((r, rIndex) => {
      dates.slice(0, 10).forEach((date, index) => {
        fixture.recognitions.push(recognition({
          studentId: targetId,
          date,
          r,
          domainIndex: index,
          staffIndex: index + rIndex,
        }))
      })
    })
    const candidate = score(fixture, 'north_star', targetId)
    const percentiles = candidate.rawMetrics.three_r_rate_percentiles as Record<string, number>
    expect(candidate.normalisationCohort.type).toBe('division')
    expect(candidate.normalisationCohort.size).toBe(16)
    expect(percentiles.righteousness).toBeGreaterThan(50)
  })

  it('falls back to current-period halves when the prior period is invalid for a student', () => {
    const fixture = buildFixture()
    const enrolment = fixture.enrolments.find((row) => row.studentId === 'rising')!
    enrolment.startsOn = CURRENT_PERIOD.startsOn
    const rising = score(fixture, 'rising_star', 'rising')
    expect(rising.rawMetrics.baseline_method).toBe('current_period_halves')
    expect((rising.rawMetrics.growth_components as Record<string, unknown>).valid).toBe(true)
    expect(rising.fairnessFlags).toContain('baseline_generated_from_current_period_halves')
  })

  it('preserves raw metrics and transparent weighted components in every snapshot', () => {
    const candidate = score(buildFixture(), 'north_star', 'balanced')
    expect(candidate.algorithmVersion).toBe(HONOURS_ALGORITHM_VERSION)
    expect(candidate.rawMetrics.recognition_event_rate_per_10_days).toBeTypeOf('number')
    expect(candidate.componentScores.balanced_three_r.normalisedScore).toBeGreaterThanOrEqual(0)
    expect(candidate.componentScores.balanced_three_r.weight).toBe(0.45)
    expect(candidate.totalScore).toBeGreaterThan(0)
  })

  it('applies signal mappings only to their configured award', () => {
    const fixture = buildFixture()
    const mapped = fixture.recognitions.find(
      (row) => row.studentId === 'balanced' && row.rKey === 'responsibility' && row.points === 10
    )!
    mapped.significantAwardCodes = ['responsibility_anchor']
    const north = score(fixture, 'north_star', 'balanced')
    const responsibility = score(fixture, 'responsibility_anchor', 'balanced')
    expect(north.rawMetrics.award_significant_event_count).toBe(2)
    expect(responsibility.rawMetrics.award_significant_event_count).toBe(1)
  })
})
