import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, jsonError, requireHonoursPermission } from '@/lib/auth/server'
import { AWARD_CODES, type AwardCode } from '@/lib/honours/constants'

function csvCell(value: unknown) {
  const text = Array.isArray(value) ? value.join('; ') : String(value ?? '')
  return `"${text.replaceAll('"', '""')}"`
}

export async function GET(request: NextRequest) {
  const context = await requireHonoursPermission('honours.export')
  if (isAuthError(context)) return context.error
  const periodId = request.nextUrl.searchParams.get('periodId')
  const awardCode = request.nextUrl.searchParams.get('award') as AwardCode | null
  if (!periodId) return jsonError('Award period is required.')
  if (awardCode && !AWARD_CODES.includes(awardCode)) return jsonError('Unknown award.')

  const { data: period, error: periodError } = await context.admin
    .from('quarterly_award_periods')
    .select('id,code')
    .eq('id', periodId)
    .eq('school_id', context.schoolId!)
    .maybeSingle()
  if (periodError || !period) return jsonError('Award period not found.', 404)

  let query = context.admin
    .from('v_current_award_candidate_scores')
    .select('*')
    .eq('school_id', context.schoolId!)
    .eq('award_period_id', periodId)
    .order('display_order')
    .order('eligible', { ascending: false })
    .order('total_score', { ascending: false })
  if (awardCode) query = query.eq('award_code', awardCode)
  const { data, error } = await query
  if (error) return jsonError(error.message)

  const headers = [
    'Award', 'Rank', 'Student', 'Grade', 'Section', 'House', 'Score', 'Eligible',
    'Eligibility reasons', 'Fairness flags', 'Rs represented', 'Domains represented',
    'Distinct staff', 'Active weeks', 'Eligible weeks', 'Staff concentration',
    'Significant events', 'Review status', 'Algorithm version', 'Snapshot ID',
  ]
  const rows = (data ?? []).map((row) => {
    const metrics = (row.raw_metrics ?? {}) as Record<string, unknown>
    return [
      row.award_name,
      row.rank_in_school,
      row.student_name,
      row.grade,
      row.section,
      row.house,
      row.total_score,
      row.eligible,
      row.eligibility_reasons,
      row.fairness_flags,
      metrics.distinct_rs,
      metrics.distinct_domains,
      metrics.distinct_recognising_staff_count,
      metrics.active_recognition_week_count,
      metrics.eligible_week_count,
      metrics.maximum_staff_concentration,
      metrics.significant_event_count,
      row.review_status,
      row.algorithm_version,
      row.id,
    ].map(csvCell).join(',')
  })
  const csv = [headers.map(csvCell).join(','), ...rows].join('\n')
  const suffix = awardCode ? `-${awardCode}` : ''
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="quarterly-honours-${period.code}${suffix}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
