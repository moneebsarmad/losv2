import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAdmin } from '@/lib/auth/server'

const ALLOWED_ROLES = ['super_admin', 'admin', 'house_mentor', 'staff', 'student', 'parent']

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const context = await requireAdmin()
  if (isAuthError(context)) return context.error

  const { userId } = await params
  const body = await request.json().catch(() => ({}))

  const patch: { role?: string; assigned_house?: string | null } = {}

  if ('role' in body) {
    if (!ALLOWED_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role.' }, { status: 400 })
    }
    patch.role = body.role
  }

  if ('assigned_house' in body) {
    patch.assigned_house = body.assigned_house ?? null
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const { error } = await context.admin
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .eq('school_id', context.schoolId!)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
