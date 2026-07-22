import { NextResponse } from 'next/server'
import { isAuthError, jsonError, requireHonoursPermission } from '@/lib/auth/server'

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const action = String(body.action ?? '')
  const permission =
    action === 'select'
      ? 'honours.review'
      : action === 'finalise' || action === 'no_recipient'
        ? 'honours.finalise'
        : action === 'reopen'
          ? 'honours.reopen'
          : action === 'revoke'
            ? 'honours.revoke'
            : null
  if (!permission) return jsonError('Unknown workflow action.')

  const context = await requireHonoursPermission(permission)
  if (isAuthError(context)) return context.error
  let result: { data: unknown; error: any }

  if (action === 'select') {
    result = await context.supabase.rpc('select_quarterly_award_recipient', {
      p_candidate_score_id: String(body.candidateScoreId ?? ''),
      p_internal_selection_note: body.internalSelectionNote ? String(body.internalSelectionNote) : undefined,
      p_public_citation: body.publicCitation ? String(body.publicCitation) : undefined,
      p_override_reason: body.overrideReason ? String(body.overrideReason) : undefined,
      p_scope_type: String(body.scopeType ?? 'school'),
      p_scope_key: String(body.scopeKey ?? 'school'),
      p_recipient_slot: Number(body.recipientSlot ?? 1),
    })
  } else if (action === 'finalise') {
    result = await context.supabase.rpc('finalise_quarterly_award_recipient', {
      p_recipient_id: String(body.recipientId ?? ''),
      p_public_citation: String(body.publicCitation ?? ''),
      p_override_reason: body.overrideReason ? String(body.overrideReason) : undefined,
    })
  } else if (action === 'no_recipient') {
    result = await context.supabase.rpc('finalise_quarterly_award_without_recipient', {
      p_award_period_id: String(body.periodId ?? ''),
      p_award_definition_id: String(body.awardDefinitionId ?? ''),
      p_reason: String(body.reason ?? ''),
      p_scope_type: String(body.scopeType ?? 'school'),
      p_scope_key: String(body.scopeKey ?? 'school'),
      p_recipient_slot: Number(body.recipientSlot ?? 1),
    })
  } else if (action === 'reopen') {
    result = await context.supabase.rpc('reopen_quarterly_award_period', {
      p_award_period_id: String(body.periodId ?? ''),
      p_reason: String(body.reason ?? ''),
    })
  } else {
    result = await context.supabase.rpc('revoke_quarterly_award_recipient', {
      p_recipient_id: String(body.recipientId ?? ''),
      p_reason: String(body.reason ?? ''),
    })
  }

  if (result.error) return jsonError(result.error.message, result.error.code === '42501' ? 403 : 400)
  return NextResponse.json({ result: result.data })
}
