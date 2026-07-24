import { NextResponse } from 'next/server'
import { isAuthError, requireAdmin } from '@/lib/auth/server'

export async function GET() {
  const context = await requireAdmin()
  if (isAuthError(context)) return context.error

  const { data, error } = await context.admin
    .from('profiles')
    .select('id, email, full_name, staff_name, student_name, role, assigned_house')
    .order('role')
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ users: data ?? [] })
}
