import type { AwardCode, RKey } from './constants'

export type HonoursPeriod = {
  id: string
  schoolId: string
  code: string
  name: string
  startsOn: string
  endsOn: string
  baselinePeriodId?: string | null
  algorithmVersion: string
}

export type HonoursStudent = {
  id: string
  schoolId: string
  name: string
  grade: number | null
  section: string | null
  house: string
  active: boolean
}

export type HonoursEnrolment = {
  studentId: string
  schoolId: string
  startsOn: string
  endsOn?: string | null
  datesInferred?: boolean
}

export type HonoursCalendarDay = {
  date: string
  instructional: boolean
  shortOfficialWeek?: boolean
}

export type HonoursRecognition = {
  id: string
  schoolId: string
  studentId: string
  staffId: string | null
  staffName: string | null
  date: string
  rKey: RKey
  rName: string
  domainId: string
  domainKey: string
  domainName: string
  points: number
  note: string
  significantByMapping?: boolean
  peerImpactByMapping?: boolean
  significantAwardCodes?: AwardCode[]
  peerImpactAwardCodes?: AwardCode[]
}

export type AwardDefinitionInput = {
  id: string
  code: AwardCode
  configuration?: Record<string, unknown> | null
}

export type ComponentScore = {
  label: string
  rawValue: number
  normalisedScore: number
  weight: number
  weightedContribution: number
}

export type CohortDescriptor = {
  type: 'grade' | 'division' | 'school'
  key: string
  label: string
  size: number
}

export type RecognitionEvidence = {
  id: string
  date: string
  r: string
  domain: string
  points: number
  staff: string | null
  note: string
  significant: boolean
}

export type CandidateScoreSnapshot = {
  awardDefinitionId: string
  awardCode: AwardCode
  studentId: string
  algorithmVersion: string
  rawMetrics: Record<string, unknown>
  componentScores: Record<string, ComponentScore>
  totalScore: number
  eligible: boolean
  eligibilityReasons: string[]
  fairnessFlags: string[]
  evidenceSummary: Record<string, unknown>
  normalisationCohort: CohortDescriptor
  rankInCohort: number | null
  rankInSchool: number | null
}

export type ScoringInput = {
  period: HonoursPeriod
  baselinePeriod?: HonoursPeriod | null
  students: HonoursStudent[]
  enrolments: HonoursEnrolment[]
  calendarDays: HonoursCalendarDay[]
  baselineCalendarDays?: HonoursCalendarDay[]
  recognitions: HonoursRecognition[]
  awardDefinitions: AwardDefinitionInput[]
  configuredDomainCount: number
  significantPointThreshold: number
  exceptionalPointThreshold: number
  asOfDate: string
  calendarMethod: 'academic_calendar' | 'scheduled_weekday_fallback'
  attendanceMethod: 'scheduled_eligible_days'
  signalTaxonomyAvailable: boolean
}

export type RMetric = {
  events: number
  points: number
  ratePer10Days: number
  eventShare: number
  pointShare: number
  activeWeeks: number
  consistencyPercentage: number
  distinctDomains: number
  distinctStaff: number
  maximumStaffConcentration: number
  significantEvents: number
}

export type StudentPeriodMetrics = {
  student: HonoursStudent
  eligibleDays: number
  totalCalendarDays: number
  eligibleWeeks: number
  activeWeeks: number
  consistencyPercentage: number
  longestGapWeeks: number
  eventCount: number
  points: number
  eventRatePer10Days: number
  pointsRatePer10Days: number
  distinctRs: number
  distinctDomains: number
  distinctStaff: number
  significantEvents: number
  exceptionalEvents: number
  maximumStaffConcentration: number
  weeklyCounts: Record<string, number>
  rMetrics: Record<RKey, RMetric>
  domainCounts: Record<string, number>
  domainPoints: Record<string, number>
  staffCounts: Record<string, number>
  staffNames: Record<string, string>
  enrolmentDatesInferred: boolean
  partialEnrolment: boolean
  evidence: RecognitionEvidence[]
  fairnessFlags: string[]
  sourceRecognitions: HonoursRecognition[]
}
