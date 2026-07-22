import { NextResponse } from 'next/server'
import { isAuthError, jsonError, requireHonoursPermission } from '@/lib/auth/server'

export async function PATCH(request: Request) {
  const context = await requireHonoursPermission('honours.view')
  if (isAuthError(context)) return context.error
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const { data, error } = await context.supabase.rpc('mark_quarterly_award_notification', {
    p_notification_id: String(body.notificationId ?? ''),
    p_dismiss: body.dismiss === true,
  })
  if (error) return jsonError(error.message, error.code === '42501' ? 403 : 400)
  return NextResponse.json({ notification: data })
}
