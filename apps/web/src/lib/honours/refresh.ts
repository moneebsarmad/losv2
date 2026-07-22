import type { SupabaseClient } from '@supabase/supabase-js'
import { AWARD_CODES, HONOURS_ALGORITHM_VERSION, R_KEYS, type AwardCode, type RKey } from './constants'
import { calculateQuarterlyHonours, generateWeekdayCalendar } from './scoring'
import { notifyHonoursAdmins } from './notifications'
import type {
  AwardDefinitionInput,
  HonoursCalendarDay,
  HonoursEnrolment,
  HonoursPeriod,
  HonoursRecognition,
  HonoursStudent,
} from './types'

type RefreshTrigger = 'manual' | 'scheduled' | 'review_open' | 'period_end' | 'test'

type RefreshOptions = {
  admin: SupabaseClient
  periodId: string
  triggerType: RefreshTrigger
  triggeredBy?: string | null
  now?: Date
}

type DbPeriod = {
  id: string
  school_id: string
  code: string
  name: string
  starts_on: string
  ends_on: string
  baseline_period_id: string | null
  scoring_algorithm_version: string
  status: string
}

function toPeriod(row: DbPeriod): HonoursPeriod {
  return {
    id: row.id,
    schoolId: row.school_id,
    code: row.code,
    name: row.name,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    baselinePeriodId: row.baseline_period_id,
    algorithmVersion: row.scoring_algorithm_version || HONOURS_ALGORITHM_VERSION,
  }
}

function dateInTimeZone(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${values.year}-${values.month}-${values.day}`
}

function asAwardCode(value: unknown): AwardCode | null {
  return typeof value === 'string' && AWARD_CODES.includes(value as AwardCode)
    ? (value as AwardCode)
    : null
}

function asRKey(value: unknown): RKey | null {
  return typeof value === 'string' && R_KEYS.includes(value as RKey) ? (value as RKey) : null
}

async function loadCalendar(
  admin: SupabaseClient,
  schoolId: string,
  startsOn: string,
  endsOn: string
) {
  const { data, error } = await admin
    .from('academic_calendar_days')
    .select('calendar_date,is_instructional,is_short_official_week')
    .eq('school_id', schoolId)
    .gte('calendar_date', startsOn)
    .lte('calendar_date', endsOn)
    .order('calendar_date')
  if (error) throw error
  if (!data?.length) {
    return {
      rows: generateWeekdayCalendar(startsOn, endsOn),
      method: 'scheduled_weekday_fallback' as const,
    }
  }
  return {
    rows: data.map(
      (row): HonoursCalendarDay => ({
        date: String(row.calendar_date),
        instructional: row.is_instructional === true,
        shortOfficialWeek: row.is_short_official_week === true,
      })
    ),
    method: 'academic_calendar' as const,
  }
}

async function loadBaselinePeriod(admin: SupabaseClient, period: DbPeriod) {
  if (period.baseline_period_id) {
    const { data, error } = await admin
      .from('quarterly_award_periods')
      .select('id,school_id,code,name,starts_on,ends_on,baseline_period_id,scoring_algorithm_version,status')
      .eq('id', period.baseline_period_id)
      .eq('school_id', period.school_id)
      .maybeSingle()
    if (error) throw error
    return (data as DbPeriod | null) ?? null
  }

  const { data, error } = await admin
    .from('quarterly_award_periods')
    .select('id,school_id,code,name,starts_on,ends_on,baseline_period_id,scoring_algorithm_version,status')
    .eq('school_id', period.school_id)
    .lt('ends_on', period.starts_on)
    .in('status', ['finalised', 'archived'])
    .order('ends_on', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  return (data as DbPeriod | null) ?? null
}

function selectThresholds(values: number[]) {
  const positive = [...new Set(values.filter((value) => Number.isFinite(value) && value > 0))].sort(
    (left, right) => left - right
  )
  const maximum = positive.at(-1) ?? 50
  return {
    significant: positive.find((value) => value >= 20) ?? maximum,
    exceptional: positive.find((value) => value >= 50) ?? maximum,
  }
}

export async function refreshQuarterlyHonoursScores(options: RefreshOptions) {
  const { admin, periodId, triggerType, triggeredBy = null, now = new Date() } = options
  const { data: rawPeriod, error: periodError } = await admin
    .from('quarterly_award_periods')
    .select('id,school_id,code,name,starts_on,ends_on,baseline_period_id,scoring_algorithm_version,status')
    .eq('id', periodId)
    .single()
  if (periodError) throw periodError
  const period = rawPeriod as DbPeriod
  if (['finalised', 'archived'].includes(period.status)) {
    throw new Error('Historical finalised or archived award periods cannot be recalculated.')
  }

  const { data: run, error: runError } = await admin
    .from('quarterly_award_score_runs')
    .insert({
      school_id: period.school_id,
      award_period_id: period.id,
      algorithm_version: period.scoring_algorithm_version || HONOURS_ALGORITHM_VERSION,
      trigger_type: triggerType,
      triggered_by: triggeredBy,
      status: 'running',
      started_at: now.toISOString(),
    })
    .select('id')
    .single()
  if (runError) {
    if (runError.code === '23505') throw new Error('A score refresh is already running for this period.')
    throw runError
  }

  try {
    const baselineRow = await loadBaselinePeriod(admin, period)
    const baselineStart = baselineRow?.starts_on ?? period.starts_on
    const recognitionEnd = period.ends_on

    const [schoolResult, definitionsResult, studentsResult, enrolmentsResult, domainsResult, pointsResult, recognitionsResult, mappingsResult] =
      await Promise.all([
        admin.from('schools').select('id,timezone').eq('id', period.school_id).single(),
        admin
          .from('quarterly_award_definitions')
          .select('id,school_id,code,configuration,display_order')
          .eq('active', true)
          .or(`school_id.is.null,school_id.eq.${period.school_id}`)
          .order('display_order'),
        admin
          .from('students')
          .select('id,school_id,student_name,grade,section,house,is_active')
          .eq('school_id', period.school_id),
        admin
          .from('student_enrolments')
          .select('student_id,school_id,starts_on,ends_on,dates_inferred,status')
          .eq('school_id', period.school_id)
          .lte('starts_on', recognitionEnd)
          .or(`ends_on.is.null,ends_on.gte.${baselineStart}`),
        admin.from('domains').select('id').eq('is_active', true),
        admin.from('point_values').select('value').eq('is_active', true).order('value'),
        admin
          .from('v_award_eligible_recognitions')
          .select('*')
          .eq('school_id', period.school_id)
          .gte('recognition_date', baselineStart)
          .lte('recognition_date', recognitionEnd),
        admin
          .from('quarterly_award_signal_mappings')
          .select('award_definition_id,source_type,source_key,qualifies_as_significant,qualifies_as_peer_impact')
          .eq('school_id', period.school_id)
          .eq('active', true),
      ])

    const failures = [
      schoolResult,
      definitionsResult,
      studentsResult,
      enrolmentsResult,
      domainsResult,
      pointsResult,
      recognitionsResult,
      mappingsResult,
    ].map((result) => result.error).filter(Boolean)
    if (failures.length) throw failures[0]

    const timezone = String(schoolResult.data?.timezone ?? 'UTC')
    const asOfDate = dateInTimeZone(now, timezone)
    const currentCalendar = await loadCalendar(
      admin,
      period.school_id,
      period.starts_on,
      period.ends_on
    )
    const baselineCalendar = baselineRow
      ? await loadCalendar(admin, period.school_id, baselineRow.starts_on, baselineRow.ends_on)
      : null

    const enrolments: HonoursEnrolment[] = (enrolmentsResult.data ?? []).map((row) => ({
      studentId: String(row.student_id),
      schoolId: String(row.school_id),
      startsOn: String(row.starts_on),
      endsOn: row.ends_on ? String(row.ends_on) : null,
      datesInferred: row.dates_inferred === true,
    }))
    const enrolledStudentIds = new Set(enrolments.map((row) => row.studentId))
    const students: HonoursStudent[] = (studentsResult.data ?? [])
      .filter((row) => enrolledStudentIds.has(String(row.id)))
      .map((row) => ({
        id: String(row.id),
        schoolId: String(row.school_id),
        name: String(row.student_name),
        grade: row.grade === null ? null : Number(row.grade),
        section: row.section === null ? null : String(row.section),
        house: String(row.house),
        active: row.is_active === true,
      }))

    const definitionByCode = new Map<AwardCode, AwardDefinitionInput>()
    ;(definitionsResult.data ?? []).forEach((row) => {
      const code = asAwardCode(row.code)
      if (!code) return
      const existing = definitionByCode.get(code)
      if (!existing || row.school_id === period.school_id) {
        definitionByCode.set(code, {
          id: String(row.id),
          code,
          configuration: (row.configuration as Record<string, unknown> | null) ?? {},
        })
      }
    })
    const awardDefinitions = AWARD_CODES.map((code) => definitionByCode.get(code)).filter(
      (definition): definition is AwardDefinitionInput => Boolean(definition)
    )
    if (awardDefinitions.length !== AWARD_CODES.length) {
      throw new Error('All six Quarterly Star Honours award definitions must be active.')
    }

    const mappingRows = mappingsResult.data ?? []
    const definitionCodeById = new Map(
      (definitionsResult.data ?? []).flatMap((row) => {
        const code = asAwardCode(row.code)
        return code ? [[String(row.id), code] as const] : []
      })
    )
    const mappingMatches = (recognition: Record<string, unknown>) =>
      mappingRows.filter((mapping) => {
        if (mapping.source_type === 'domain') {
          return mapping.source_key === recognition.domain_key || mapping.source_key === recognition.domain_id
        }
        if (mapping.source_type === 'r_value') {
          return mapping.source_key === recognition.r_key || mapping.source_key === recognition.r_value_id
        }
        return false
      })

    const recognitions: HonoursRecognition[] = (recognitionsResult.data ?? []).flatMap((row) => {
      const rKey = asRKey(row.r_key)
      if (!rKey) return []
      const matches = mappingMatches(row)
      const significantAwardCodes = [...new Set(
        matches
          .filter((mapping) => mapping.qualifies_as_significant === true)
          .map((mapping) => definitionCodeById.get(String(mapping.award_definition_id)))
          .filter((code): code is AwardCode => Boolean(code))
      )]
      const peerImpactAwardCodes = [...new Set(
        matches
          .filter((mapping) => mapping.qualifies_as_peer_impact === true)
          .map((mapping) => definitionCodeById.get(String(mapping.award_definition_id)))
          .filter((code): code is AwardCode => Boolean(code))
      )]
      return [{
        id: String(row.id),
        schoolId: String(row.school_id),
        studentId: String(row.student_id),
        staffId: row.staff_user_id ? String(row.staff_user_id) : null,
        staffName: row.staff_name_snapshot ? String(row.staff_name_snapshot) : null,
        date: String(row.recognition_date),
        rKey,
        rName: String(row.r_name),
        domainId: String(row.domain_id),
        domainKey: String(row.domain_key),
        domainName: String(row.domain_name),
        points: Number(row.point_value),
        note: String(row.behaviour_note ?? ''),
        significantByMapping: significantAwardCodes.length > 0,
        peerImpactByMapping: peerImpactAwardCodes.length > 0,
        significantAwardCodes,
        peerImpactAwardCodes,
      }]
    })
    const thresholds = selectThresholds((pointsResult.data ?? []).map((row) => Number(row.value)))
    const snapshots = calculateQuarterlyHonours({
      period: toPeriod(period),
      baselinePeriod: baselineRow ? toPeriod(baselineRow) : null,
      students,
      enrolments,
      calendarDays: currentCalendar.rows,
      baselineCalendarDays: baselineCalendar?.rows,
      recognitions,
      awardDefinitions,
      configuredDomainCount: Math.max(Number(domainsResult.data?.length ?? 0), 1),
      significantPointThreshold: thresholds.significant,
      exceptionalPointThreshold: thresholds.exceptional,
      asOfDate,
      calendarMethod: currentCalendar.method,
      attendanceMethod: 'scheduled_eligible_days',
      signalTaxonomyAvailable: false,
    })

    const persistencePayload = snapshots.map((snapshot) => ({
      award_definition_id: snapshot.awardDefinitionId,
      student_id: snapshot.studentId,
      algorithm_version: snapshot.algorithmVersion,
      raw_metrics: snapshot.rawMetrics,
      component_scores: snapshot.componentScores,
      total_score: snapshot.totalScore,
      eligible: snapshot.eligible,
      eligibility_reasons: snapshot.eligibilityReasons,
      fairness_flags: snapshot.fairnessFlags,
      evidence_summary: snapshot.evidenceSummary,
      normalisation_cohort: snapshot.normalisationCohort,
      rank_in_cohort: snapshot.rankInCohort,
      rank_in_school: snapshot.rankInSchool,
    }))
    const metadata = {
      attendance_method: 'scheduled_eligible_days',
      calendar_method: currentCalendar.method,
      baseline_calendar_method: baselineCalendar?.method ?? null,
      baseline_period_id: baselineRow?.id ?? null,
      school_timezone: timezone,
      calculated_through: asOfDate,
      configured_domain_count: domainsResult.data?.length ?? 0,
      significant_point_threshold: thresholds.significant,
      exceptional_point_threshold: thresholds.exceptional,
      incident_dataset_available: false,
      signal_taxonomy_available: false,
      student_count: students.length,
      snapshot_count: snapshots.length,
    }
    const { data: insertedCount, error: persistenceError } = await admin.rpc(
      'persist_quarterly_award_score_snapshots',
      {
        p_score_run_id: run.id,
        p_snapshots: persistencePayload,
        p_source_record_count: recognitions.length,
        p_calculation_metadata: metadata,
      }
    )
    if (persistenceError) throw persistenceError

    if (triggeredBy) {
      await admin.from('audit_logs').insert({
        school_id: period.school_id,
        user_id: triggeredBy,
        action: 'quarterly_honours.score_refresh_triggered',
        table_name: 'quarterly_award_score_runs',
        record_id: run.id,
        new_data: {
          period_id: period.id,
          trigger_type: triggerType,
          algorithm_version: period.scoring_algorithm_version,
          inserted_snapshot_count: insertedCount,
        },
      })
    }

    return {
      runId: run.id as string,
      snapshotCount: Number(insertedCount ?? snapshots.length),
      eligibleCandidateCount: snapshots.filter((snapshot) => snapshot.eligible).length,
      metadata,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown score refresh failure.'
    await admin
      .from('quarterly_award_score_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: message })
      .eq('id', run.id)
    await admin.from('audit_logs').insert({
      school_id: period.school_id,
      user_id: triggeredBy,
      action: 'quarterly_honours.score_run_failed',
      table_name: 'quarterly_award_score_runs',
      record_id: run.id,
      new_data: { period_id: period.id, error_message: message },
    })
    await notifyHonoursAdmins({
      admin,
      schoolId: period.school_id,
      periodId: period.id,
      type: 'score_run_failed',
      title: 'Quarterly Star Honours score refresh failed',
      message: `${period.name} could not be recalculated. Review the score-run diagnostics.`,
      deduplicationKey: `${period.id}:score-run-failed:${run.id}`,
    }).catch(() => undefined)
    throw error
  }
}
