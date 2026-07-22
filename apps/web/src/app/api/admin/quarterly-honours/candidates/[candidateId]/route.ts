import { NextResponse } from 'next/server'
import { isAuthError, jsonError, requireHonoursPermission } from '@/lib/auth/server'

type RouteContext = { params: Promise<{ candidateId: string }> }

export async function GET(_: Request, routeContext: RouteContext) {
  const context = await requireHonoursPermission('honours.view')
  if (isAuthError(context)) return context.error
  const { candidateId } = await routeContext.params

  const { data: candidate, error } = await context.admin
    .from('quarterly_award_candidate_scores')
    .select('*,students(student_name,grade,section,house),quarterly_award_definitions(code,name,short_description,detailed_description,configuration),quarterly_award_score_runs(trigger_type,completed_at,calculation_metadata),quarterly_award_periods(code,name,starts_on,ends_on,status,recipient_limit_per_award)')
    .eq('id', candidateId)
    .eq('school_id', context.schoolId!)
    .maybeSingle()
  if (error) return jsonError(error.message)
  if (!candidate) return jsonError('Candidate snapshot not found.', 404)

  const [reviewResult, recipientsResult, domainsResult] = await Promise.all([
    context.admin
      .from('quarterly_award_candidate_reviews')
      .select('*')
      .eq('school_id', context.schoolId!)
      .eq('award_period_id', candidate.award_period_id)
      .eq('award_definition_id', candidate.award_definition_id)
      .eq('student_id', candidate.student_id)
      .maybeSingle(),
    context.admin
      .from('quarterly_award_recipients')
      .select('*,students(student_name,grade),quarterly_award_definitions(code,name)')
      .eq('school_id', context.schoolId!)
      .eq('award_period_id', candidate.award_period_id)
      .in('status', ['selected', 'finalised']),
    context.admin.from('domains').select('id,key,name,sort_order').eq('is_active', true).order('sort_order'),
  ])
  const detailError = reviewResult.error ?? recipientsResult.error ?? domainsResult.error
  if (detailError) return jsonError(detailError.message)

  return NextResponse.json({
    candidate,
    review: reviewResult.data ?? null,
    awardOverlaps: (recipientsResult.data ?? []).filter(
      (recipient) => recipient.student_id === candidate.student_id
    ),
    awardRecipients: (recipientsResult.data ?? []).filter(
      (recipient) => recipient.award_definition_id === candidate.award_definition_id
    ),
    domains: domainsResult.data ?? [],
    viewerRole: context.role,
  })
}

export async function PATCH(request: Request, routeContext: RouteContext) {
  const context = await requireHonoursPermission('honours.review')
  if (isAuthError(context)) return context.error
  const { candidateId } = await routeContext.params
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const status = String(body.reviewStatus ?? '')
  if (!['unreviewed', 'shortlisted', 'dismissed'].includes(status)) {
    return jsonError('Invalid review action.')
  }
  const { data, error } = await context.supabase.rpc('update_quarterly_award_review', {
    p_candidate_score_id: candidateId,
    p_review_status: status,
    p_internal_notes: body.internalNotes ? String(body.internalNotes) : undefined,
    p_dismissal_reason: body.dismissalReason ? String(body.dismissalReason) : undefined,
    p_public_citation_draft: body.publicCitationDraft ? String(body.publicCitationDraft) : undefined,
  })
  if (error) return jsonError(error.message, error.code === '42501' ? 403 : 400)
  return NextResponse.json({ review: data })
}
