import {
  AWARD_CODES,
  DEFAULT_AWARD_CONFIG,
  HONOURS_ALGORITHM_VERSION,
  R_KEYS,
  type AwardCode,
  type RKey,
} from './constants'
import type {
  AwardDefinitionInput,
  CandidateScoreSnapshot,
  CohortDescriptor,
  ComponentScore,
  HonoursCalendarDay,
  HonoursEnrolment,
  HonoursPeriod,
  HonoursRecognition,
  HonoursStudent,
  RecognitionEvidence,
  RMetric,
  ScoringInput,
  StudentPeriodMetrics,
} from './types'

const DAY_MS = 86_400_000

type GrowthMetrics = {
  valid: boolean
  method: 'previous_period' | 'current_period_halves' | 'unavailable'
  baselinePeriodId: string | null
  baselineEligibleDays: number
  comparisonEligibleDays: number
  comparisonEventCount: number
  comparisonActiveWeeks: number
  rateDelta: number
  consistencyDelta: number
  rBreadthDelta: number
  domainBreadthDelta: number
  staffBreadthDelta: number
  positiveComponents: number
  sustained: boolean
}

type MetricContext = {
  current: Map<string, StudentPeriodMetrics>
  growth: Map<string, GrowthMetrics>
  cohorts: Map<string, CohortDescriptor>
}

function utcDate(value: string) {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`)
}

function dateString(date: Date) {
  return date.toISOString().slice(0, 10)
}

function compareDates(left: string, right: string) {
  return left.localeCompare(right)
}

function minimumDate(...values: string[]) {
  return [...values].sort(compareDates)[0]
}

function mondayWeekKey(value: string) {
  const date = utcDate(value)
  const day = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() - day + 1)
  return dateString(date)
}

function round(value: number, digits = 3) {
  const multiplier = 10 ** digits
  return Math.round((Number.isFinite(value) ? value : 0) * multiplier) / multiplier
}

function percentage(numerator: number, denominator: number) {
  return denominator > 0 ? round((numerator / denominator) * 100) : 0
}

function ratePer10(count: number, days: number) {
  return days > 0 ? round((count / days) * 10) : 0
}

function smoothedRatePer10(count: number, days: number) {
  return round(((count + 2) / (days + 10)) * 10)
}

function countBy<T>(rows: T[], key: (row: T) => string | null | undefined) {
  const result: Record<string, number> = {}
  rows.forEach((row) => {
    const value = key(row)
    if (value) result[value] = (result[value] ?? 0) + 1
  })
  return result
}

function sumBy<T>(rows: T[], key: (row: T) => string, value: (row: T) => number) {
  const result: Record<string, number> = {}
  rows.forEach((row) => {
    const itemKey = key(row)
    result[itemKey] = (result[itemKey] ?? 0) + value(row)
  })
  return result
}

function maximumConcentration(counts: Record<string, number>, total: number) {
  if (total <= 0) return 0
  return round(Math.max(0, ...Object.values(counts)) / total)
}

function longestInactiveGap(weekKeys: string[], weeklyCounts: Record<string, number>) {
  let current = 0
  let longest = 0
  weekKeys.forEach((week) => {
    if ((weeklyCounts[week] ?? 0) === 0) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  })
  return longest
}

function normaliseRecognitionEvidence(
  rows: HonoursRecognition[],
  significantPointThreshold: number
): RecognitionEvidence[] {
  return [...rows]
    .sort((left, right) => {
      const leftSignificant = left.points >= significantPointThreshold || (left.significantAwardCodes?.length ?? 0) > 0 ? 1 : 0
      const rightSignificant = right.points >= significantPointThreshold || (right.significantAwardCodes?.length ?? 0) > 0 ? 1 : 0
      return rightSignificant - leftSignificant || right.date.localeCompare(left.date)
    })
    .slice(0, 8)
    .map((row) => ({
      id: row.id,
      date: row.date,
      r: row.rName,
      domain: row.domainName,
      points: row.points,
      staff: row.staffName,
      note: row.note,
      significant: row.points >= significantPointThreshold || (row.significantAwardCodes?.length ?? 0) > 0,
    }))
}

function enrolmentContainsDate(enrolments: HonoursEnrolment[], date: string) {
  return enrolments.some(
    (row) => row.startsOn <= date && (!row.endsOn || row.endsOn >= date)
  )
}

function duplicatePatternExists(rows: HonoursRecognition[]) {
  const seen = new Set<string>()
  return rows.some((row) => {
    const key = [
      row.studentId,
      row.staffId ?? row.staffName ?? 'missing',
      row.date,
      row.rKey,
      row.domainId,
      row.points,
      row.note.trim().toLowerCase(),
    ].join('|')
    if (seen.has(key)) return true
    seen.add(key)
    return false
  })
}

function computeStudentPeriodMetrics(args: {
  student: HonoursStudent
  period: HonoursPeriod
  asOfDate: string
  enrolments: HonoursEnrolment[]
  calendarDays: HonoursCalendarDay[]
  recognitions: HonoursRecognition[]
  significantPointThreshold: number
  exceptionalPointThreshold: number
  configuredDomainCount: number
  attendanceMethod: string
  calendarMethod: string
  signalTaxonomyAvailable: boolean
}) {
  const {
    student,
    period,
    enrolments,
    significantPointThreshold,
    exceptionalPointThreshold,
  } = args
  const effectiveEnd = minimumDate(period.endsOn, args.asOfDate)
  const elapsedCalendar = args.calendarDays
    .filter(
      (day) =>
        day.instructional && day.date >= period.startsOn && day.date <= effectiveEnd
    )
    .sort((left, right) => left.date.localeCompare(right.date))
  const totalCalendarDays = elapsedCalendar.length
  const eligibleCalendar = elapsedCalendar.filter((day) =>
    enrolmentContainsDate(enrolments, day.date)
  )
  const eligibleDateSet = new Set(eligibleCalendar.map((day) => day.date))
  const eligibleWeekRows = new Map<string, HonoursCalendarDay[]>()
  eligibleCalendar.forEach((day) => {
    const week = mondayWeekKey(day.date)
    eligibleWeekRows.set(week, [...(eligibleWeekRows.get(week) ?? []), day])
  })
  const eligibleWeekKeys = [...eligibleWeekRows.entries()]
    .filter(([, days]) => days.length >= 3 || days.some((day) => day.shortOfficialWeek))
    .map(([week]) => week)
    .sort()
  const eligibleWeekSet = new Set(eligibleWeekKeys)
  const rows = args.recognitions.filter(
    (row) =>
      row.studentId === student.id &&
      row.schoolId === student.schoolId &&
      row.date >= period.startsOn &&
      row.date <= effectiveEnd &&
      eligibleDateSet.has(row.date)
  )
  const weeklyCounts = countBy(rows, (row) => {
    const key = mondayWeekKey(row.date)
    return eligibleWeekSet.has(key) ? key : null
  })
  const activeWeeks = eligibleWeekKeys.filter((week) => (weeklyCounts[week] ?? 0) > 0).length
  const staffCounts = countBy(rows, (row) => row.staffId ?? null)
  const staffNames = Object.fromEntries(
    rows
      .filter((row) => row.staffId)
      .map((row) => [row.staffId!, row.staffName?.trim() || 'Staff member'])
  )
  const domainCounts = countBy(rows, (row) => row.domainKey)
  const domainPoints = sumBy(rows, (row) => row.domainKey, (row) => row.points)
  const totalPoints = rows.reduce((sum, row) => sum + row.points, 0)
  const significantEvents = rows.filter(
    (row) => row.points >= significantPointThreshold || (row.significantAwardCodes?.length ?? 0) > 0
  ).length
  const exceptionalEvents = rows.filter((row) => row.points >= exceptionalPointThreshold).length
  const rMetrics = {} as Record<RKey, RMetric>

  R_KEYS.forEach((rKey) => {
    const rRows = rows.filter((row) => row.rKey === rKey)
    const rStaffCounts = countBy(rRows, (row) => row.staffId ?? null)
    const rWeekCounts = countBy(rRows, (row) => {
      const key = mondayWeekKey(row.date)
      return eligibleWeekSet.has(key) ? key : null
    })
    const rActiveWeeks = eligibleWeekKeys.filter((week) => (rWeekCounts[week] ?? 0) > 0).length
    const rPoints = rRows.reduce((sum, row) => sum + row.points, 0)
    rMetrics[rKey] = {
      events: rRows.length,
      points: rPoints,
      ratePer10Days: ratePer10(rRows.length, eligibleCalendar.length),
      eventShare: rows.length > 0 ? round(rRows.length / rows.length) : 0,
      pointShare: totalPoints > 0 ? round(rPoints / totalPoints) : 0,
      activeWeeks: rActiveWeeks,
      consistencyPercentage: percentage(rActiveWeeks, eligibleWeekKeys.length),
      distinctDomains: new Set(rRows.map((row) => row.domainId)).size,
      distinctStaff: Object.keys(rStaffCounts).length,
      maximumStaffConcentration: maximumConcentration(rStaffCounts, rRows.length),
      significantEvents: rRows.filter(
        (row) => row.points >= significantPointThreshold || (row.significantAwardCodes?.length ?? 0) > 0
      ).length,
    }
  })

  const fairnessFlags: string[] = []
  const maximumWeekShare = maximumConcentration(weeklyCounts, rows.length)
  const maximumDomainShare = maximumConcentration(domainCounts, rows.length)
  const enrolmentDatesInferred = enrolments.some((row) => row.datesInferred)
  const partialEnrolment = eligibleCalendar.length < totalCalendarDays
  if (args.attendanceMethod === 'scheduled_eligible_days') fairnessFlags.push('missing_attendance_data')
  if (args.calendarMethod === 'scheduled_weekday_fallback') fairnessFlags.push('calendar_weekday_fallback')
  if (enrolmentDatesInferred) fairnessFlags.push('enrolment_dates_inferred')
  if (partialEnrolment) fairnessFlags.push('student_enrolled_partway_through_period')
  if (rows.some((row) => !row.staffId)) fairnessFlags.push('missing_staff_identifier')
  if (maximumWeekShare > 0.5) fairnessFlags.push('recognition_clustered_in_one_week')
  if (maximumDomainShare > 0.6) fairnessFlags.push('recognition_clustered_in_one_domain')
  if (maximumConcentration(staffCounts, rows.length) > 0.4) fairnessFlags.push('high_staff_concentration')
  if (!args.signalTaxonomyAvailable) fairnessFlags.push('tag_taxonomy_unavailable')
  if (args.configuredDomainCount < 5) fairnessFlags.push('configured_domain_count_below_expected')
  if (duplicatePatternExists(rows)) fairnessFlags.push('possible_duplicate_recognition_pattern')
  if (rows.length < 6) fairnessFlags.push('low_sample_size')
  if (eligibleWeekKeys.length < 3) fairnessFlags.push('insufficient_period_progress')

  return {
    student,
    eligibleDays: eligibleCalendar.length,
    totalCalendarDays,
    eligibleWeeks: eligibleWeekKeys.length,
    activeWeeks,
    consistencyPercentage: percentage(activeWeeks, eligibleWeekKeys.length),
    longestGapWeeks: longestInactiveGap(eligibleWeekKeys, weeklyCounts),
    eventCount: rows.length,
    points: totalPoints,
    eventRatePer10Days: ratePer10(rows.length, eligibleCalendar.length),
    pointsRatePer10Days: ratePer10(totalPoints, eligibleCalendar.length),
    distinctRs: R_KEYS.filter((key) => rMetrics[key].events > 0).length,
    distinctDomains: Object.keys(domainCounts).length,
    distinctStaff: Object.keys(staffCounts).length,
    significantEvents,
    exceptionalEvents,
    maximumStaffConcentration: maximumConcentration(staffCounts, rows.length),
    weeklyCounts,
    rMetrics,
    domainCounts,
    domainPoints,
    staffCounts,
    staffNames,
    enrolmentDatesInferred,
    partialEnrolment,
    evidence: normaliseRecognitionEvidence(rows, significantPointThreshold),
    fairnessFlags,
    sourceRecognitions: rows,
  } satisfies StudentPeriodMetrics
}

function significantEventsForAward(
  metrics: StudentPeriodMetrics,
  awardCode: AwardCode,
  threshold: number,
  rKey?: RKey
) {
  return metrics.sourceRecognitions.filter(
    (row) =>
      (!rKey || row.rKey === rKey) &&
      (row.points >= threshold || row.significantAwardCodes?.includes(awardCode))
  ).length
}

function computeMetricsMap(args: {
  period: HonoursPeriod
  asOfDate: string
  students: HonoursStudent[]
  enrolments: HonoursEnrolment[]
  calendarDays: HonoursCalendarDay[]
  recognitions: HonoursRecognition[]
  significantPointThreshold: number
  exceptionalPointThreshold: number
  configuredDomainCount: number
  attendanceMethod: string
  calendarMethod: string
  signalTaxonomyAvailable: boolean
}) {
  return new Map(
    args.students.map((student) => {
      const metrics = computeStudentPeriodMetrics({
        ...args,
        student,
        enrolments: args.enrolments.filter(
          (row) => row.studentId === student.id && row.schoolId === student.schoolId
        ),
      })
      return [student.id, metrics]
    })
  )
}

function periodFromCalendar(
  source: HonoursPeriod,
  idSuffix: string,
  days: HonoursCalendarDay[]
): HonoursPeriod | null {
  const sorted = days.filter((day) => day.instructional).sort((a, b) => a.date.localeCompare(b.date))
  if (sorted.length === 0) return null
  return {
    ...source,
    id: `${source.id}:${idSuffix}`,
    startsOn: sorted[0].date,
    endsOn: sorted.at(-1)?.date ?? sorted[0].date,
  }
}

function unavailableGrowth(): GrowthMetrics {
  return {
    valid: false,
    method: 'unavailable',
    baselinePeriodId: null,
    baselineEligibleDays: 0,
    comparisonEligibleDays: 0,
    comparisonEventCount: 0,
    comparisonActiveWeeks: 0,
    rateDelta: 0,
    consistencyDelta: 0,
    rBreadthDelta: 0,
    domainBreadthDelta: 0,
    staffBreadthDelta: 0,
    positiveComponents: 0,
    sustained: false,
  }
}

function growthBetween(
  baseline: StudentPeriodMetrics,
  comparison: StudentPeriodMetrics,
  method: GrowthMetrics['method'],
  baselinePeriodId: string | null,
  minimumBaselineDays = 20
): GrowthMetrics {
  const rateDelta = round(
    smoothedRatePer10(comparison.eventCount, comparison.eligibleDays) -
      smoothedRatePer10(baseline.eventCount, baseline.eligibleDays)
  )
  const consistencyDelta = round(
    comparison.consistencyPercentage - baseline.consistencyPercentage
  )
  const rBreadthDelta = comparison.distinctRs - baseline.distinctRs
  const domainBreadthDelta = comparison.distinctDomains - baseline.distinctDomains
  const staffBreadthDelta = comparison.distinctStaff - baseline.distinctStaff
  const positiveComponents = [
    rateDelta,
    consistencyDelta,
    rBreadthDelta,
    domainBreadthDelta,
  ].filter((value) => value > 0).length

  return {
    valid: baseline.eligibleDays >= minimumBaselineDays && comparison.eligibleDays > 0,
    method,
    baselinePeriodId,
    baselineEligibleDays: baseline.eligibleDays,
    comparisonEligibleDays: comparison.eligibleDays,
    comparisonEventCount: comparison.eventCount,
    comparisonActiveWeeks: comparison.activeWeeks,
    rateDelta,
    consistencyDelta,
    rBreadthDelta,
    domainBreadthDelta,
    staffBreadthDelta,
    positiveComponents,
    sustained: comparison.activeWeeks >= 2 && comparison.maximumStaffConcentration <= 0.5,
  }
}

function computeCurrentPeriodHalfGrowth(input: ScoringInput) {
  const result = new Map<string, GrowthMetrics>()
  const elapsedDays = input.calendarDays
    .filter(
      (day) =>
        day.instructional &&
        day.date >= input.period.startsOn &&
        day.date <= minimumDate(input.period.endsOn, input.asOfDate)
    )
    .sort((a, b) => a.date.localeCompare(b.date))
  const elapsedWeeks = new Set(elapsedDays.map((day) => mondayWeekKey(day.date))).size
  if (elapsedWeeks < 6 || elapsedDays.length < 2) {
    input.students.forEach((student) => result.set(student.id, unavailableGrowth()))
    return result
  }

  const splitIndex = Math.floor(elapsedDays.length / 2)
  const firstDays = elapsedDays.slice(0, splitIndex)
  const secondDays = elapsedDays.slice(splitIndex)
  const firstPeriod = periodFromCalendar(input.period, 'first-half', firstDays)
  const secondPeriod = periodFromCalendar(input.period, 'second-half', secondDays)
  if (!firstPeriod || !secondPeriod) {
    input.students.forEach((student) => result.set(student.id, unavailableGrowth()))
    return result
  }

  const firstMetrics = computeMetricsMap({
    period: firstPeriod,
    asOfDate: firstPeriod.endsOn,
    students: input.students,
    enrolments: input.enrolments,
    calendarDays: firstDays,
    recognitions: input.recognitions,
    significantPointThreshold: input.significantPointThreshold,
    exceptionalPointThreshold: input.exceptionalPointThreshold,
    configuredDomainCount: input.configuredDomainCount,
    attendanceMethod: input.attendanceMethod,
    calendarMethod: input.calendarMethod,
    signalTaxonomyAvailable: input.signalTaxonomyAvailable,
  })
  const secondMetrics = computeMetricsMap({
    period: secondPeriod,
    asOfDate: secondPeriod.endsOn,
    students: input.students,
    enrolments: input.enrolments,
    calendarDays: secondDays,
    recognitions: input.recognitions,
    significantPointThreshold: input.significantPointThreshold,
    exceptionalPointThreshold: input.exceptionalPointThreshold,
    configuredDomainCount: input.configuredDomainCount,
    attendanceMethod: input.attendanceMethod,
    calendarMethod: input.calendarMethod,
    signalTaxonomyAvailable: input.signalTaxonomyAvailable,
  })
  input.students.forEach((student) => {
    const baseline = firstMetrics.get(student.id)
    const comparison = secondMetrics.get(student.id)
    result.set(
      student.id,
      baseline && comparison
        ? growthBetween(baseline, comparison, 'current_period_halves', null, 10)
        : unavailableGrowth()
    )
  })
  return result
}

function computeGrowthMap(input: ScoringInput, current: Map<string, StudentPeriodMetrics>) {
  const halfPeriodGrowth = computeCurrentPeriodHalfGrowth(input)
  if (!input.baselinePeriod || (input.baselineCalendarDays?.length ?? 0) === 0) {
    return halfPeriodGrowth
  }

  const baseline = computeMetricsMap({
    period: input.baselinePeriod,
    asOfDate: input.baselinePeriod.endsOn,
    students: input.students,
    enrolments: input.enrolments,
    calendarDays: input.baselineCalendarDays ?? [],
    recognitions: input.recognitions,
    significantPointThreshold: input.significantPointThreshold,
    exceptionalPointThreshold: input.exceptionalPointThreshold,
    configuredDomainCount: input.configuredDomainCount,
    attendanceMethod: input.attendanceMethod,
    calendarMethod: input.calendarMethod,
    signalTaxonomyAvailable: input.signalTaxonomyAvailable,
  })
  const result = new Map<string, GrowthMetrics>()
  input.students.forEach((student) => {
    const baselineMetrics = baseline.get(student.id)
    const currentMetrics = current.get(student.id)
    const previousGrowth = baselineMetrics && currentMetrics
      ? growthBetween(
          baselineMetrics,
          currentMetrics,
          'previous_period',
          input.baselinePeriod?.id ?? null
        )
      : unavailableGrowth()
    result.set(
      student.id,
      previousGrowth.valid
        ? previousGrowth
        : halfPeriodGrowth.get(student.id) ?? unavailableGrowth()
    )
  })
  return result
}

function divisionForGrade(grade: number | null) {
  if (grade !== null && grade >= 6 && grade <= 8) return 'middle_school'
  if (grade !== null && grade >= 9 && grade <= 12) return 'high_school'
  return null
}

function divisionLabel(key: string) {
  return key === 'middle_school' ? 'Middle School' : 'High School'
}

function buildCohorts(metrics: Map<string, StudentPeriodMetrics>) {
  const eligiblePool = [...metrics.values()].filter((row) => row.eligibleDays >= 20)
  const comparisonPool = eligiblePool.length > 0 ? eligiblePool : [...metrics.values()]
  const gradeCounts = countBy(comparisonPool, (row) =>
    row.student.grade === null ? null : String(row.student.grade)
  )
  const divisionCounts = countBy(comparisonPool, (row) => divisionForGrade(row.student.grade))
  const cohorts = new Map<string, CohortDescriptor>()

  metrics.forEach((row, studentId) => {
    const gradeKey = row.student.grade === null ? null : String(row.student.grade)
    const divisionKey = divisionForGrade(row.student.grade)
    if (gradeKey && (gradeCounts[gradeKey] ?? 0) >= 15) {
      cohorts.set(studentId, {
        type: 'grade',
        key: `grade:${gradeKey}`,
        label: `Grade ${gradeKey}`,
        size: gradeCounts[gradeKey],
      })
    } else if (divisionKey && (divisionCounts[divisionKey] ?? 0) >= 15) {
      cohorts.set(studentId, {
        type: 'division',
        key: `division:${divisionKey}`,
        label: divisionLabel(divisionKey),
        size: divisionCounts[divisionKey],
      })
    } else {
      cohorts.set(studentId, {
        type: 'school',
        key: 'school',
        label: 'School-wide',
        size: comparisonPool.length,
      })
    }
  })
  return cohorts
}

function cohortMembers(context: MetricContext, studentId: string) {
  const cohort = context.cohorts.get(studentId)
  const target = context.current.get(studentId)
  if (!cohort || !target) return []
  return [...context.current.values()].filter((row) => {
    if (row.eligibleDays < 20) return false
    if (cohort.type === 'grade') return row.student.grade === target.student.grade
    if (cohort.type === 'division') {
      return divisionForGrade(row.student.grade) === divisionForGrade(target.student.grade)
    }
    return true
  })
}

function percentRank(values: Array<{ id: string; value: number }>, studentId: string) {
  if (values.length === 0) return 0
  if (values.length === 1) return 50
  const sorted = [...values].sort((left, right) => left.value - right.value)
  const target = sorted.find((row) => row.id === studentId)
  if (!target) return 0
  const lowerCount = sorted.filter((row) => row.value < target.value).length
  const equalCount = sorted.filter((row) => row.value === target.value).length
  const averageZeroBasedRank = lowerCount + (equalCount - 1) / 2
  return round((averageZeroBasedRank / (sorted.length - 1)) * 100)
}

function metricPercentile(
  context: MetricContext,
  studentId: string,
  selector: (metrics: StudentPeriodMetrics) => number
) {
  return percentRank(
    cohortMembers(context, studentId).map((row) => ({ id: row.student.id, value: selector(row) })),
    studentId
  )
}

function growthPercentile(
  context: MetricContext,
  studentId: string,
  selector: (metrics: GrowthMetrics) => number
) {
  const members = cohortMembers(context, studentId)
    .map((row) => ({ row, growth: context.growth.get(row.student.id) }))
    .filter((item): item is { row: StudentPeriodMetrics; growth: GrowthMetrics } =>
      Boolean(item.growth?.valid)
    )
  return percentRank(
    members.map((item) => ({ id: item.row.student.id, value: selector(item.growth) })),
    studentId
  )
}

function configNumber(
  definition: AwardDefinitionInput,
  section: 'weights' | 'minimums',
  key: string,
  fallback: number
) {
  const sectionValue = definition.configuration?.[section]
  if (!sectionValue || typeof sectionValue !== 'object') return fallback
  const value = (sectionValue as Record<string, unknown>)[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function component(
  label: string,
  rawValue: number,
  normalisedScore: number,
  weight: number
): ComponentScore {
  const bounded = Math.max(0, Math.min(100, normalisedScore))
  return {
    label,
    rawValue: round(rawValue),
    normalisedScore: round(bounded),
    weight,
    weightedContribution: round(bounded * weight),
  }
}

function totalComponents(components: Record<string, ComponentScore>) {
  return round(
    Math.max(
      0,
      Math.min(
        100,
        Object.values(components).reduce((sum, row) => sum + row.weightedContribution, 0)
      )
    )
  )
}

function commonRawMetrics(metrics: StudentPeriodMetrics, input: ScoringInput) {
  return {
    student: {
      id: metrics.student.id,
      name: metrics.student.name,
      grade: metrics.student.grade,
      section: metrics.student.section,
      house: metrics.student.house,
    },
    eligible_days: metrics.eligibleDays,
    scheduled_elapsed_days: metrics.totalCalendarDays,
    attendance_method: input.attendanceMethod,
    calendar_method: input.calendarMethod,
    eligible_week_count: metrics.eligibleWeeks,
    active_recognition_week_count: metrics.activeWeeks,
    consistency_percentage: metrics.consistencyPercentage,
    longest_gap_in_eligible_weeks: metrics.longestGapWeeks,
    weekly_recognition_counts: metrics.weeklyCounts,
    positive_recognition_event_count: metrics.eventCount,
    positive_points: metrics.points,
    recognition_event_rate_per_10_days: metrics.eventRatePer10Days,
    points_rate_per_10_days: metrics.pointsRatePer10Days,
    distinct_rs: metrics.distinctRs,
    distinct_domains: metrics.distinctDomains,
    distinct_recognising_staff_count: metrics.distinctStaff,
    maximum_staff_concentration: metrics.maximumStaffConcentration,
    significant_event_count: metrics.significantEvents,
    exceptional_event_count: metrics.exceptionalEvents,
    recognition_events_by_r: metrics.rMetrics,
    recognition_count_by_domain: metrics.domainCounts,
    points_by_domain: metrics.domainPoints,
    recognitions_by_staff_member: metrics.staffCounts,
    recognising_staff_names: metrics.staffNames,
    configured_domain_count: input.configuredDomainCount,
    significant_point_threshold: input.significantPointThreshold,
    exceptional_point_threshold: input.exceptionalPointThreshold,
  }
}

function candidateBase(
  definition: AwardDefinitionInput,
  metrics: StudentPeriodMetrics,
  cohort: CohortDescriptor,
  input: ScoringInput,
  components: Record<string, ComponentScore>,
  eligibilityReasons: string[],
  fairnessFlags: string[],
  extraRaw: Record<string, unknown> = {},
  extraEvidence: Record<string, unknown> = {}
): CandidateScoreSnapshot {
  return {
    awardDefinitionId: definition.id,
    awardCode: definition.code,
    studentId: metrics.student.id,
    algorithmVersion: input.period.algorithmVersion || HONOURS_ALGORITHM_VERSION,
    rawMetrics: { ...commonRawMetrics(metrics, input), ...extraRaw },
    componentScores: components,
    totalScore: totalComponents(components),
    eligible: eligibilityReasons.length === 0,
    eligibilityReasons,
    fairnessFlags: [...new Set(fairnessFlags)],
    evidenceSummary: {
      representative_recognitions: metrics.evidence,
      ...extraEvidence,
    },
    normalisationCohort: cohort,
    rankInCohort: null,
    rankInSchool: null,
  }
}

function failure(condition: boolean, message: string, reasons: string[]) {
  if (!condition) reasons.push(message)
}

function northStarCandidate(
  definition: AwardDefinitionInput,
  metrics: StudentPeriodMetrics,
  context: MetricContext,
  input: ScoringInput
) {
  const defaults = DEFAULT_AWARD_CONFIG.north_star
  const minimumRShare = Math.min(...R_KEYS.map((key) => metrics.rMetrics[key].eventShare))
  const maximumRShare = Math.max(...R_KEYS.map((key) => metrics.rMetrics[key].eventShare))
  const threeRStrength =
    R_KEYS.reduce(
      (sum, key) =>
        sum + metricPercentile(context, metrics.student.id, (row) => row.rMetrics[key].ratePer10Days),
      0
    ) / 3
  const balanceMultiplier = Math.min(1, minimumRShare / 0.2)
  const balancedThreeRScore = threeRStrength * balanceMultiplier
  const domainBreadth = percentage(metrics.distinctDomains, input.configuredDomainCount)
  const staffBreadth = Math.min(metrics.distinctStaff / 6, 1) * 100
  const awardSignificantEvents = significantEventsForAward(
    metrics,
    definition.code,
    input.significantPointThreshold
  )
  const significantEvidence = Math.min(awardSignificantEvents / 4, 1) * 100
  const components = {
    balanced_three_r: component(
      'Balanced 3R strength',
      minimumRShare * 100,
      balancedThreeRScore,
      configNumber(definition, 'weights', 'balanced_three_r', defaults.weights.balanced_three_r)
    ),
    domain_breadth: component(
      'Domain breadth',
      metrics.distinctDomains,
      domainBreadth,
      configNumber(definition, 'weights', 'domain_breadth', defaults.weights.domain_breadth)
    ),
    weekly_consistency: component(
      'Weekly consistency',
      metrics.consistencyPercentage,
      metrics.consistencyPercentage,
      configNumber(definition, 'weights', 'weekly_consistency', defaults.weights.weekly_consistency)
    ),
    staff_breadth: component(
      'Staff breadth',
      metrics.distinctStaff,
      staffBreadth,
      configNumber(definition, 'weights', 'staff_breadth', defaults.weights.staff_breadth)
    ),
    significant_evidence: component(
      'Significant character evidence',
      awardSignificantEvents,
      significantEvidence,
      configNumber(definition, 'weights', 'significant_evidence', defaults.weights.significant_evidence)
    ),
  }
  const reasons: string[] = []
  const minimumEligibleDays = configNumber(definition, 'minimums', 'eligible_days', defaults.minimums.eligible_days)
  const minimumDomains = configNumber(definition, 'minimums', 'distinct_domains', defaults.minimums.distinct_domains)
  const minimumStaff = configNumber(definition, 'minimums', 'distinct_staff', defaults.minimums.distinct_staff)
  const minimumConsistency = configNumber(definition, 'minimums', 'eligible_week_percentage', defaults.minimums.eligible_week_percentage)
  const maximumStaffConcentration = configNumber(definition, 'minimums', 'maximum_staff_concentration', defaults.minimums.maximum_staff_concentration)
  const minimumSignificantEvents = configNumber(definition, 'minimums', 'significant_events', defaults.minimums.significant_events)
  failure(
    metrics.eventCount >= configNumber(definition, 'minimums', 'events', defaults.minimums.events),
    'Requires at least 8 valid positive recognition events.',
    reasons
  )
  failure(metrics.eligibleDays >= minimumEligibleDays, `Requires at least ${minimumEligibleDays} eligible school days.`, reasons)
  failure(metrics.distinctRs === 3, 'All three Rs must be represented.', reasons)
  failure(metrics.distinctDomains >= minimumDomains, `At least ${minimumDomains} configured domains must be represented.`, reasons)
  failure(metrics.distinctStaff >= minimumStaff, `At least ${minimumStaff} distinct staff observers are required.`, reasons)
  failure(metrics.consistencyPercentage >= minimumConsistency, `Recognition is required in at least ${minimumConsistency}% of eligible weeks.`, reasons)
  failure(metrics.maximumStaffConcentration <= maximumStaffConcentration, `No single staff member may account for more than ${maximumStaffConcentration * 100}% of events.`, reasons)
  failure(awardSignificantEvents >= minimumSignificantEvents, `At least ${minimumSignificantEvents} significant character events are required.`, reasons)
  failure(maximumRShare <= configNumber(definition, 'minimums', 'maximum_r_share', defaults.minimums.maximum_r_share), 'One R exceeds the configured maximum event share.', reasons)
  failure(minimumRShare >= configNumber(definition, 'minimums', 'minimum_r_share', defaults.minimums.minimum_r_share), 'One R falls below the configured minimum event share.', reasons)

  return candidateBase(
    definition,
    metrics,
    context.cohorts.get(metrics.student.id)!,
    input,
    components,
    reasons,
    metrics.fairnessFlags,
    {
      three_r_rate_percentiles: Object.fromEntries(
        R_KEYS.map((key) => [
          key,
          metricPercentile(context, metrics.student.id, (row) => row.rMetrics[key].ratePer10Days),
        ])
      ),
      three_r_strength: round(threeRStrength),
      minimum_r_share: minimumRShare,
      maximum_r_share: maximumRShare,
      balance_multiplier: round(balanceMultiplier),
      award_significant_event_count: awardSignificantEvents,
    },
    {
      explanation: 'Balanced evidence across all three Rs, multiple domains, weeks and staff observers.',
    }
  )
}

function rSpecificCandidate(
  definition: AwardDefinitionInput,
  rKey: RKey,
  metrics: StudentPeriodMetrics,
  context: MetricContext,
  input: ScoringInput
) {
  const defaults = DEFAULT_AWARD_CONFIG[definition.code as
    | 'righteousness_beacon'
    | 'responsibility_anchor'
    | 'respect_ambassador']
  const rMetric = metrics.rMetrics[rKey]
  const ratePercentile = metricPercentile(
    context,
    metrics.student.id,
    (row) => row.rMetrics[rKey].ratePer10Days
  )
  const domainBreadth = percentage(rMetric.distinctDomains, input.configuredDomainCount)
  const staffBreadth = Math.min(rMetric.distinctStaff / 6, 1) * 100
  const awardSignificantEvents = significantEventsForAward(
    metrics,
    definition.code,
    input.significantPointThreshold,
    rKey
  )
  const significantEvidence = Math.min(awardSignificantEvents / 3, 1) * 100
  const components = {
    recognition_rate: component(
      `${rKey} recognition-rate percentile`,
      rMetric.ratePer10Days,
      ratePercentile,
      configNumber(definition, 'weights', 'recognition_rate', defaults.weights.recognition_rate)
    ),
    weekly_consistency: component(
      `${rKey} weekly consistency`,
      rMetric.consistencyPercentage,
      rMetric.consistencyPercentage,
      configNumber(definition, 'weights', 'weekly_consistency', defaults.weights.weekly_consistency)
    ),
    domain_breadth: component(
      `${rKey} domain breadth`,
      rMetric.distinctDomains,
      domainBreadth,
      configNumber(definition, 'weights', 'domain_breadth', defaults.weights.domain_breadth)
    ),
    staff_breadth: component(
      `${rKey} staff breadth`,
      rMetric.distinctStaff,
      staffBreadth,
      configNumber(definition, 'weights', 'staff_breadth', defaults.weights.staff_breadth)
    ),
    significant_evidence: component(
      `Significant ${rKey} evidence`,
      awardSignificantEvents,
      significantEvidence,
      configNumber(definition, 'weights', 'significant_evidence', defaults.weights.significant_evidence)
    ),
  }
  const reasons: string[] = []
  const minimumEvents = configNumber(definition, 'minimums', 'events', defaults.minimums.events)
  const minimumDays = configNumber(definition, 'minimums', 'eligible_days', defaults.minimums.eligible_days)
  const minimumDomains = configNumber(definition, 'minimums', 'distinct_domains', defaults.minimums.distinct_domains)
  const minimumStaff = configNumber(definition, 'minimums', 'distinct_staff', defaults.minimums.distinct_staff)
  const minimumConsistency = configNumber(definition, 'minimums', 'eligible_week_percentage', defaults.minimums.eligible_week_percentage)
  const maximumConcentration = configNumber(definition, 'minimums', 'maximum_staff_concentration', defaults.minimums.maximum_staff_concentration)
  const minimumSignificant = configNumber(definition, 'minimums', 'significant_events', defaults.minimums.significant_events)
  failure(rMetric.events >= minimumEvents, `Requires at least ${minimumEvents} ${rKey} recognition events.`, reasons)
  failure(metrics.eligibleDays >= minimumDays, `Requires at least ${minimumDays} eligible school days.`, reasons)
  failure(rMetric.distinctDomains >= minimumDomains, `Requires ${rKey} evidence in at least ${minimumDomains} domains.`, reasons)
  failure(rMetric.distinctStaff >= minimumStaff, `Requires ${rKey} evidence from at least ${minimumStaff} staff members.`, reasons)
  failure(rMetric.consistencyPercentage >= minimumConsistency, `Requires ${rKey} recognition in at least ${minimumConsistency}% of eligible weeks.`, reasons)
  failure(rMetric.maximumStaffConcentration <= maximumConcentration, `One staff member exceeds the configured ${rKey} concentration limit.`, reasons)
  failure(awardSignificantEvents >= minimumSignificant, `Requires at least ${minimumSignificant} significant ${rKey} event.`, reasons)
  const flags = [...metrics.fairnessFlags]
  if (definition.code === 'respect_ambassador' && !input.signalTaxonomyAvailable) {
    flags.push('peer_impact_signal_unavailable')
  }

  return candidateBase(
    definition,
    metrics,
    context.cohorts.get(metrics.student.id)!,
    input,
    components,
    reasons,
    flags,
    {
      focus_r: rKey,
      focus_r_metrics: rMetric,
      focus_r_rate_percentile: ratePercentile,
      award_significant_event_count: awardSignificantEvents,
    },
    {
      focus_r: rKey,
      explanation: `Sustained ${rKey} evidence across domains, weeks and multiple observers.`,
    }
  )
}

function risingStarCandidate(
  definition: AwardDefinitionInput,
  metrics: StudentPeriodMetrics,
  context: MetricContext,
  input: ScoringInput
) {
  const defaults = DEFAULT_AWARD_CONFIG.rising_star
  const growth = context.growth.get(metrics.student.id) ?? unavailableGrowth()
  const rateScore = growthPercentile(context, metrics.student.id, (row) => row.rateDelta)
  const consistencyScore = growthPercentile(
    context,
    metrics.student.id,
    (row) => row.consistencyDelta
  )
  const rBreadthScore = growthPercentile(
    context,
    metrics.student.id,
    (row) => row.rBreadthDelta
  )
  const domainBreadthScore = growthPercentile(
    context,
    metrics.student.id,
    (row) => row.domainBreadthDelta
  )
  const components = {
    recognition_rate_improvement: component(
      'Smoothed recognition-rate improvement',
      growth.rateDelta,
      rateScore,
      configNumber(
        definition,
        'weights',
        'recognition_rate_improvement',
        defaults.weights.recognition_rate_improvement
      )
    ),
    consistency_improvement: component(
      'Weekly-consistency improvement',
      growth.consistencyDelta,
      consistencyScore,
      configNumber(
        definition,
        'weights',
        'consistency_improvement',
        defaults.weights.consistency_improvement
      )
    ),
    r_breadth_improvement: component(
      '3R breadth improvement',
      growth.rBreadthDelta,
      rBreadthScore,
      configNumber(
        definition,
        'weights',
        'r_breadth_improvement',
        defaults.weights.r_breadth_improvement
      )
    ),
    domain_breadth_improvement: component(
      'Domain breadth improvement',
      growth.domainBreadthDelta,
      domainBreadthScore,
      configNumber(
        definition,
        'weights',
        'domain_breadth_improvement',
        defaults.weights.domain_breadth_improvement
      )
    ),
  }
  const reasons: string[] = []
  const minimumEvents = configNumber(definition, 'minimums', 'events', defaults.minimums.events)
  const minimumDays = configNumber(definition, 'minimums', 'eligible_days', defaults.minimums.eligible_days)
  const minimumWeeks = configNumber(definition, 'minimums', 'active_weeks', defaults.minimums.active_weeks)
  const minimumConsistency = configNumber(definition, 'minimums', 'consistency_percentage', defaults.minimums.consistency_percentage)
  const minimumPositiveComponents = configNumber(definition, 'minimums', 'positive_components', defaults.minimums.positive_components)
  const maximumConcentration = configNumber(definition, 'minimums', 'maximum_staff_concentration', defaults.minimums.maximum_staff_concentration)
  failure(growth.valid, 'A valid previous-period or current-period-half baseline is required.', reasons)
  failure(metrics.eventCount >= minimumEvents, `Requires at least ${minimumEvents} current-period recognition events.`, reasons)
  failure(metrics.eligibleDays >= minimumDays, `Requires at least ${minimumDays} eligible school days.`, reasons)
  failure(metrics.activeWeeks >= minimumWeeks, `Requires recognition in at least ${minimumWeeks} current-period weeks.`, reasons)
  failure(metrics.consistencyPercentage >= minimumConsistency, `Current weekly consistency must be at least ${minimumConsistency}%.`, reasons)
  failure(growth.positiveComponents >= minimumPositiveComponents, `Requires positive improvement in at least ${minimumPositiveComponents} major components.`, reasons)
  failure(growth.sustained, 'Improvement must be sustained across multiple weeks and observers.', reasons)
  failure(metrics.maximumStaffConcentration <= maximumConcentration, 'Staff concentration exceeds the configured Rising Star review limit.', reasons)
  const flags = [...metrics.fairnessFlags, 'incident_dataset_unavailable']
  if (growth.method === 'current_period_halves') flags.push('baseline_generated_from_current_period_halves')
  if (!growth.valid) flags.push('growth_baseline_unavailable')

  return candidateBase(
    definition,
    metrics,
    context.cohorts.get(metrics.student.id)!,
    input,
    components,
    reasons,
    flags,
    {
      baseline_method: growth.method,
      baseline_period_id: growth.baselinePeriodId,
      baseline_eligible_days: growth.baselineEligibleDays,
      comparison_eligible_days: growth.comparisonEligibleDays,
      growth_components: growth,
      incident_data_used: false,
    },
    {
      public_summary: 'Recognised for deliberate, visible and sustained growth across the quarter.',
    }
  )
}

function steadfastCandidate(
  definition: AwardDefinitionInput,
  metrics: StudentPeriodMetrics,
  context: MetricContext,
  input: ScoringInput
) {
  const defaults = DEFAULT_AWARD_CONFIG.steadfast_star
  const missedWeeks = Math.max(0, metrics.eligibleWeeks - metrics.activeWeeks)
  const missedWeekPenalty = metrics.eligibleWeeks > 0 ? (missedWeeks / metrics.eligibleWeeks) * 60 : 100
  const gapPenalty = Math.max(0, metrics.longestGapWeeks - 1) * 15
  const maximumWeekShare = maximumConcentration(metrics.weeklyCounts, metrics.eventCount)
  const burstPenalty = maximumWeekShare > 0.4 ? (maximumWeekShare - 0.4) * 100 : 0
  const distributionGapScore = Math.max(0, 100 - missedWeekPenalty - gapPenalty - burstPenalty)
  const staffBreadth = Math.min(metrics.distinctStaff / 6, 1) * 100
  const frameworkBreadth =
    (percentage(metrics.distinctRs, 3) +
      percentage(metrics.distinctDomains, input.configuredDomainCount)) /
    2
  const components = {
    weekly_consistency: component(
      'Weekly consistency',
      metrics.consistencyPercentage,
      metrics.consistencyPercentage,
      configNumber(definition, 'weights', 'weekly_consistency', defaults.weights.weekly_consistency)
    ),
    distribution_gap: component(
      'Distribution and gap score',
      metrics.longestGapWeeks,
      distributionGapScore,
      configNumber(definition, 'weights', 'distribution_gap', defaults.weights.distribution_gap)
    ),
    staff_breadth: component(
      'Staff breadth',
      metrics.distinctStaff,
      staffBreadth,
      configNumber(definition, 'weights', 'staff_breadth', defaults.weights.staff_breadth)
    ),
    framework_breadth: component(
      '3R and domain breadth',
      metrics.distinctRs + metrics.distinctDomains,
      frameworkBreadth,
      configNumber(definition, 'weights', 'framework_breadth', defaults.weights.framework_breadth)
    ),
  }
  const reasons: string[] = []
  const minimumEvents = configNumber(definition, 'minimums', 'events', defaults.minimums.events)
  const minimumDays = configNumber(definition, 'minimums', 'eligible_days', defaults.minimums.eligible_days)
  const minimumConsistency = configNumber(definition, 'minimums', 'eligible_week_percentage', defaults.minimums.eligible_week_percentage)
  const maximumGap = configNumber(definition, 'minimums', 'maximum_gap_weeks', defaults.minimums.maximum_gap_weeks)
  const minimumRs = configNumber(definition, 'minimums', 'distinct_rs', defaults.minimums.distinct_rs)
  const minimumDomains = configNumber(definition, 'minimums', 'distinct_domains', defaults.minimums.distinct_domains)
  const minimumStaff = configNumber(definition, 'minimums', 'distinct_staff', defaults.minimums.distinct_staff)
  const maximumStaffConcentration = configNumber(definition, 'minimums', 'maximum_staff_concentration', defaults.minimums.maximum_staff_concentration)
  failure(metrics.eventCount >= minimumEvents, `Requires at least ${minimumEvents} valid positive recognition events.`, reasons)
  failure(metrics.eligibleDays >= minimumDays, `Requires at least ${minimumDays} eligible school days.`, reasons)
  failure(metrics.consistencyPercentage >= minimumConsistency, `Recognition is required in at least ${minimumConsistency}% of eligible weeks.`, reasons)
  failure(metrics.longestGapWeeks <= maximumGap, `No gap may exceed ${maximumGap} consecutive eligible weeks.`, reasons)
  failure(metrics.distinctRs >= minimumRs, `At least ${minimumRs} Rs must be represented.`, reasons)
  failure(metrics.distinctDomains >= minimumDomains, `At least ${minimumDomains} domains must be represented.`, reasons)
  failure(metrics.distinctStaff >= minimumStaff, `At least ${minimumStaff} distinct staff observers are required.`, reasons)
  failure(metrics.maximumStaffConcentration <= maximumStaffConcentration, 'No single staff member may exceed the configured concentration limit.', reasons)

  return candidateBase(
    definition,
    metrics,
    context.cohorts.get(metrics.student.id)!,
    input,
    components,
    reasons,
    metrics.fairnessFlags,
    {
      missed_eligible_weeks: missedWeeks,
      maximum_week_share: maximumWeekShare,
      distribution_gap_score: round(distributionGapScore),
      significant_events_not_required: true,
    },
    {
      explanation: 'Regular, evenly distributed recognition across the quarter without relying on high-point events.',
    }
  )
}

function buildCandidate(
  definition: AwardDefinitionInput,
  metrics: StudentPeriodMetrics,
  context: MetricContext,
  input: ScoringInput
) {
  switch (definition.code) {
    case 'north_star':
      return northStarCandidate(definition, metrics, context, input)
    case 'righteousness_beacon':
      return rSpecificCandidate(definition, 'righteousness', metrics, context, input)
    case 'responsibility_anchor':
      return rSpecificCandidate(definition, 'responsibility', metrics, context, input)
    case 'respect_ambassador':
      return rSpecificCandidate(definition, 'respect', metrics, context, input)
    case 'rising_star':
      return risingStarCandidate(definition, metrics, context, input)
    case 'steadfast_star':
      return steadfastCandidate(definition, metrics, context, input)
  }
}

function assignRanks(candidates: CandidateScoreSnapshot[]) {
  AWARD_CODES.forEach((awardCode) => {
    const awardCandidates = candidates.filter(
      (candidate) => candidate.awardCode === awardCode && candidate.eligible
    )
    const schoolSorted = [...awardCandidates].sort(
      (left, right) => right.totalScore - left.totalScore || left.studentId.localeCompare(right.studentId)
    )
    schoolSorted.forEach((candidate, index) => {
      candidate.rankInSchool = index + 1
    })

    awardCandidates.forEach((candidate) => {
      const student = candidate.rawMetrics.student as { grade?: number | null } | undefined
      const targetGrade = student?.grade ?? null
      const cohortSorted = awardCandidates.filter((other) => {
        const otherStudent = other.rawMetrics.student as { grade?: number | null } | undefined
        const otherGrade = otherStudent?.grade ?? null
        if (candidate.normalisationCohort.type === 'grade') return otherGrade === targetGrade
        if (candidate.normalisationCohort.type === 'division') {
          return divisionForGrade(otherGrade) === divisionForGrade(targetGrade)
        }
        return true
      }).sort(
        (left, right) => right.totalScore - left.totalScore || left.studentId.localeCompare(right.studentId)
      )
      candidate.rankInCohort = cohortSorted.findIndex((row) => row.studentId === candidate.studentId) + 1
    })
  })
  return candidates
}

export function calculateQuarterlyHonours(input: ScoringInput) {
  const current = computeMetricsMap({
    period: input.period,
    asOfDate: input.asOfDate,
    students: input.students,
    enrolments: input.enrolments,
    calendarDays: input.calendarDays,
    recognitions: input.recognitions,
    significantPointThreshold: input.significantPointThreshold,
    exceptionalPointThreshold: input.exceptionalPointThreshold,
    configuredDomainCount: input.configuredDomainCount,
    attendanceMethod: input.attendanceMethod,
    calendarMethod: input.calendarMethod,
    signalTaxonomyAvailable: input.signalTaxonomyAvailable,
  })
  const context: MetricContext = {
    current,
    growth: computeGrowthMap(input, current),
    cohorts: buildCohorts(current),
  }
  const definitions = input.awardDefinitions.filter((definition) =>
    AWARD_CODES.includes(definition.code)
  )
  const candidates = definitions.flatMap((definition) =>
    [...current.values()].map((metrics) => buildCandidate(definition, metrics, context, input))
  )
  return assignRanks(candidates)
}

export function generateWeekdayCalendar(startsOn: string, endsOn: string) {
  const rows: HonoursCalendarDay[] = []
  const start = utcDate(startsOn)
  const end = utcDate(endsOn)
  for (let cursor = start.getTime(); cursor <= end.getTime(); cursor += DAY_MS) {
    const date = new Date(cursor)
    const day = date.getUTCDay()
    if (day >= 1 && day <= 5) {
      rows.push({ date: dateString(date), instructional: true })
    }
  }
  return rows
}
