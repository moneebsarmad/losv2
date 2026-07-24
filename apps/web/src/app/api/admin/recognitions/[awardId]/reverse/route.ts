import { NextRequest, NextResponse } from 'next/server'
import { hasPermission, isAuthError, requireAdmin } from '@/lib/auth/server'
import { recognitionErrorMessage } from '@/lib/recognition/validation'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ awardId: string }> }
) {
  const context = await requireAdmin()
  if (isAuthError(context)) return context.error
  if (!context.schoolId || !(await hasPermission(context, 'recognitions.reverse'))) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const { awardId } = await params
  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const reason = String(payload.reason ?? '').trim()
  if (reason.length < 10 || reason.length > 500) {
    return NextResponse.json(
      { error: 'A reversal reason between 10 and 500 characters is required.' },
      { status: 400 }
    )
  }

  const { data, error } = await context.supabase.rpc('reverse_recognition_award_v2', {
    p_award_id: awardId,
    p_reason: reason,
  })
  if (error) {
    return NextResponse.json(
      { error: recognitionErrorMessage(error.message) },
      { status: error.code === '42501' ? 403 : 400 }
    )
  }
  return NextResponse.json({ recognition: data })
}
