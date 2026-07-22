import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, jsonError, requireHonoursPermission } from '@/lib/auth/server'
import { AWARD_CODES, type AwardCode } from '@/lib/honours/constants'

function numberValue(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function candidateSummary(row: Record<string, any>) {
  const metrics = (row.raw_metrics ?? {}) as Record<string, any>
  const growth = (metrics.growth_components ?? {}) as Record<string, any>
  return {
    id: row.id,
    awardCode: row.award_code,
    awardName: row.award_name,
    rank: row.rank_in_school,
    studentId: row.student_id,
    studentName: row.student_name,
    grade: row.grade,
    section: row.section,
    division:
      row.grade >= 6 && row.grade <= 8
        ? 'Middle School'
        : row.grade >= 9 && row.grade <= 12
          ? 'High School'
          : 'Other',
    house: row.house,
    totalScore: numberValue(row.total_score),
    eligible: row.eligible === true,
    eligibilityReasons: row.eligibility_reasons ?? [],
    fairnessFlags: row.fairness_flags ?? [],
    rsRepresented: numberValue(metrics.distinct_rs),
    domainsRepresented: numberValue(metrics.distinct_domains),
    configuredDomainCount: numberValue(metrics.configured_domain_count),
    distinctStaff: numberValue(metrics.distinct_recognising_staff_count),
    activeWeeks: numberValue(metrics.active_recognition_week_count),
    eligibleWeeks: numberValue(metrics.eligible_week_count),
    consistency: numberValue(metrics.consistency_percentage),
    staffConcentration: numberValue(metrics.maximum_staff_concentration),
    significantEvents: numberValue(metrics.significant_event_count),
    growth: numberValue(growth.rateDelta),
    reviewStatus: row.review_status,
    recipientId: row.recipient_id,
    recipientStatus: row.recipient_status,
  }
}

export async function GET(request: NextRequest) {
  const context = await requireHonoursPermission('honours.view')
  if (isAuthError(context)) return context.error
  const params = request.nextUrl.searchParams
  const periodId = params.get('periodId')
  const awardCode = params.get('award') as AwardCode | null
  if (!periodId) return jsonError('Award period is required.')
  if (awardCode && !AWARD_CODES.includes(awardCode)) return jsonError('Unknown award.')

  const { data: period, error: periodError } = await context.admin
    .from('quarterly_award_periods')
    .select('id,name,status')
    .eq('id', periodId)
    .eq('school_id', context.schoolId!)
    .maybeSingle()
  if (periodError || !period) return jsonError('Award period not found.', 404)

  let query = context.admin
    .from('v_current_award_candidate_scores')
    .select('*')
    .eq('school_id', context.schoolId!)
    .eq('award_period_id', periodId)
  if (awardCode) query = query.eq('award_code', awardCode)
  const grade = params.get('grade')
  if (grade) query = query.eq('grade', Number(grade))
  const division = params.get('division')
  if (division === 'middle_school') query = query.gte('grade', 6).lte('grade', 8)
  if (division === 'high_school') query = query.gte('grade', 9).lte('grade', 12)
  const house = params.get('house')
  if (house) query = query.eq('house', house)
  if (params.get('eligible') !== 'all') query = query.eq('eligible', true)
  const reviewStatus = params.get('reviewStatus')
  if (reviewStatus) query = query.eq('review_status', reviewStatus)
  const search = params.get('search')?.trim()
  if (search) query = query.ilike('student_name', `%${search.replace(/[%_]/g, '')}%`)

  const { data, error } = await query.limit(2000)
  if (error) return jsonError(error.message)
  const candidates = (data ?? []).map((row) => candidateSummary(row as Record<string, any>))
  const sort = params.get('sort') ?? 'total_score'
  const direction = params.get('direction') === 'asc' ? 1 : -1
  const value = (candidate: ReturnType<typeof candidateSummary>) => {
    if (sort === 'student_name') return candidate.studentName.toLowerCase()
    if (sort === 'grade') return candidate.grade ?? 99
    if (sort === 'weekly_consistency') return candidate.consistency
    if (sort === 'domain_breadth') return candidate.domainsRepresented
    if (sort === 'staff_breadth') return candidate.distinctStaff
    if (sort === 'growth') return candidate.growth
    return candidate.totalScore
  }
  candidates.sort((left, right) => {
    const leftValue = value(left)
    const rightValue = value(right)
    if (typeof leftValue === 'string' && typeof rightValue === 'string') {
      return leftValue.localeCompare(rightValue) * direction
    }
    return (numberValue(leftValue) - numberValue(rightValue)) * direction
  })

  return NextResponse.json({ period, candidates })
}
