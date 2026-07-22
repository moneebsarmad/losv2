import { NextResponse } from 'next/server'
import { isAuthError, jsonError, requireHonoursPermission } from '@/lib/auth/server'
import { refreshQuarterlyHonoursScores } from '@/lib/honours/refresh'

export async function POST(request: Request) {
  const context = await requireHonoursPermission('honours.refresh')
  if (isAuthError(context)) return context.error
  const body = (await request.json().catch(() => ({}))) as { periodId?: string }
  const periodId = String(body.periodId ?? '').trim()
  if (!periodId) return jsonError('Award period is required.')

  const { data: period, error: periodError } = await context.admin
    .from('quarterly_award_periods')
    .select('id')
    .eq('id', periodId)
    .eq('school_id', context.schoolId!)
    .maybeSingle()
  if (periodError || !period) return jsonError('Award period not found.', 404)

  try {
    const result = await refreshQuarterlyHonoursScores({
      admin: context.admin,
      periodId,
      triggerType: 'manual',
      triggeredBy: context.user.id,
    })
    return NextResponse.json(result)
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : 'Score refresh failed.', 400)
  }
}
