import { NextRequest, NextResponse } from 'next/server'
import { hasPermission, isAuthError, jsonError, requireHonoursPermission } from '@/lib/auth/server'
import { AWARD_CODES, type AwardCode } from '@/lib/honours/constants'

function selectScopedDefinitions(rows: Array<Record<string, any>>, schoolId: string) {
  const byCode = new Map<AwardCode, Record<string, any>>()
  rows.forEach((row) => {
    if (!AWARD_CODES.includes(row.code as AwardCode)) return
    const code = row.code as AwardCode
    if (!byCode.has(code) || row.school_id === schoolId) byCode.set(code, row)
  })
  return AWARD_CODES.map((code) => byCode.get(code)).filter(
    (row): row is Record<string, any> => Boolean(row)
  )
}

function relatedDefinitionCode(value: unknown) {
  const relation = Array.isArray(value) ? value[0] : value
  return relation && typeof relation === 'object' && 'code' in relation
    ? String(relation.code)
    : null
}

export async function GET(request: NextRequest) {
  const context = await requireHonoursPermission('honours.view')
  if (isAuthError(context)) return context.error
  const schoolId = context.schoolId!

  const [periodsResult, definitionsResult, permissions] = await Promise.all([
    context.admin
      .from('quarterly_award_periods')
      .select('*')
      .eq('school_id', schoolId)
      .order('starts_on', { ascending: false }),
    context.admin
      .from('quarterly_award_definitions')
      .select('*')
      .eq('active', true)
      .or(`school_id.is.null,school_id.eq.${schoolId}`)
      .order('display_order'),
    Promise.all([
      hasPermission(context, 'honours.refresh'),
      hasPermission(context, 'honours.review'),
      hasPermission(context, 'honours.finalise'),
      hasPermission(context, 'honours.configure'),
      hasPermission(context, 'honours.reopen'),
      hasPermission(context, 'honours.revoke'),
      hasPermission(context, 'honours.export'),
      hasPermission(context, 'honours.diagnostics'),
    ]),
  ])
  if (periodsResult.error) return jsonError(periodsResult.error.message)
  if (definitionsResult.error) return jsonError(definitionsResult.error.message)

  const periods = periodsResult.data ?? []
  const requestedPeriodId = request.nextUrl.searchParams.get('periodId')
  const period =
    periods.find((row) => row.id === requestedPeriodId) ??
    periods.find((row) => ['active', 'review_open'].includes(row.status)) ??
    periods.find((row) => row.status === 'upcoming') ??
    periods[0] ??
    null
  const definitions = selectScopedDefinitions(definitionsResult.data ?? [], schoolId)
  const [canRefresh, canReview, canFinalise, canConfigure, canReopen, canRevoke, canExport, canViewDiagnostics] = permissions

  if (!period) {
    return NextResponse.json({
      periods,
      period: null,
      definitions,
      awards: definitions.map((definition) => ({ definition, candidates: [], eligibleCount: 0, recipient: null })),
      latestRun: null,
      notifications: [],
      permissions: { canRefresh, canReview, canFinalise, canConfigure, canReopen, canRevoke, canExport, canViewDiagnostics },
    })
  }

  const [scoresResult, recipientsResult, runsResult, notificationsResult] = await Promise.all([
    context.admin
      .from('v_current_award_candidate_scores')
      .select('id,award_definition_id,award_code,student_id,student_name,grade,section,house,total_score,eligible,rank_in_school,review_status,fairness_flags')
      .eq('school_id', schoolId)
      .eq('award_period_id', period.id)
      .order('total_score', { ascending: false }),
    context.admin
      .from('quarterly_award_recipients')
      .select('*,students(student_name,grade,section,house),quarterly_award_definitions(code,name)')
      .eq('school_id', schoolId)
      .eq('award_period_id', period.id)
      .in('status', ['selected', 'finalised', 'not_issued']),
    context.admin
      .from('quarterly_award_score_runs')
      .select('*')
      .eq('school_id', schoolId)
      .eq('award_period_id', period.id)
      .order('created_at', { ascending: false })
      .limit(8),
    context.admin
      .from('quarterly_award_notifications')
      .select('*')
      .eq('school_id', schoolId)
      .eq('recipient_user_id', context.user.id)
      .is('dismissed_at', null)
      .order('created_at', { ascending: false })
      .limit(8),
  ])
  const error = scoresResult.error ?? recipientsResult.error ?? runsResult.error ?? notificationsResult.error
  if (error) return jsonError(error.message)

  const scores = scoresResult.data ?? []
  const recipients = recipientsResult.data ?? []
  const awards = definitions.map((definition) => {
    const awardScores = scores.filter((score) => score.award_code === definition.code)
    const awardRecipients = recipients.filter(
      (recipient) => relatedDefinitionCode(recipient.quarterly_award_definitions) === definition.code
    )
    return {
      definition,
      eligibleCount: awardScores.filter((score) => score.eligible).length,
      candidates: awardScores.filter((score) => score.eligible).slice(0, 3),
      recipient: awardRecipients[0] ?? null,
      recipientCount: awardRecipients.length,
    }
  })

  return NextResponse.json({
    periods,
    period,
    definitions,
    awards,
    latestRun: runsResult.data?.[0] ?? null,
    recentRuns: canViewDiagnostics ? runsResult.data ?? [] : [],
    notifications: notificationsResult.data ?? [],
    summary: {
      eligibleStudentCount: new Set(scores.filter((score) => score.eligible).map((score) => score.student_id)).size,
      awardsFinalised: recipients.filter((recipient) => ['finalised', 'not_issued'].includes(recipient.status)).length,
      awardsRequiringReview:
        definitions.length -
        recipients.filter((recipient) => ['finalised', 'not_issued'].includes(recipient.status)).length,
    },
    permissions: { canRefresh, canReview, canFinalise, canConfigure, canReopen, canRevoke, canExport, canViewDiagnostics },
  })
}

export async function POST(request: Request) {
  const context = await requireHonoursPermission('honours.configure')
  if (isAuthError(context)) return context.error
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const code = String(body.code ?? '').trim()
  const name = String(body.name ?? '').trim()
  const startsOn = String(body.startsOn ?? '').trim()
  const endsOn = String(body.endsOn ?? '').trim()
  if (!code || !name || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) {
    return jsonError('Code, name, start date and end date are required.')
  }
  const { data, error } = await context.supabase.rpc('create_quarterly_award_period', {
    p_code: code,
    p_name: name,
    p_starts_on: startsOn,
    p_ends_on: endsOn,
    p_review_opens_at: body.reviewOpensAt ? String(body.reviewOpensAt) : undefined,
    p_baseline_period_id: body.baselinePeriodId ? String(body.baselinePeriodId) : undefined,
    p_recipient_limit: Number(body.recipientLimit ?? 1),
  })
  if (error) return jsonError(error.message, error.code === '42501' ? 403 : 400)
  return NextResponse.json({ period: data }, { status: 201 })
}

export async function PUT(request: Request) {
  const context = await requireHonoursPermission('honours.configure')
  if (isAuthError(context)) return context.error
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const periodId = String(body.periodId ?? '').trim()
  const code = String(body.code ?? '').trim()
  const name = String(body.name ?? '').trim()
  const startsOn = String(body.startsOn ?? '').trim()
  const endsOn = String(body.endsOn ?? '').trim()
  if (!periodId || !code || !name || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn)) {
    return jsonError('Period, code, name, start date and end date are required.')
  }
  const { data, error } = await context.supabase.rpc('update_quarterly_award_period', {
    p_award_period_id: periodId,
    p_code: code,
    p_name: name,
    p_starts_on: startsOn,
    p_ends_on: endsOn,
    p_review_opens_at: body.reviewOpensAt ? String(body.reviewOpensAt) : undefined,
    p_baseline_period_id: body.baselinePeriodId ? String(body.baselinePeriodId) : undefined,
    p_recipient_limit: Number(body.recipientLimit ?? 1),
  })
  if (error) return jsonError(error.message, error.code === '42501' ? 403 : 400)
  return NextResponse.json({ period: data })
}
