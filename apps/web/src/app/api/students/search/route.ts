import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireStaff } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  const context = await requireStaff()
  if (isAuthError(context)) return context.error

  const query = request.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (query.length < 2) return NextResponse.json({ students: [] })

  const { data, error } = await context.admin
    .from('students')
    .select('id, student_id, student_name, grade, section, house')
    .eq('is_active', true)
    .ilike('student_name', `%${query}%`)
    .order('student_name')
    .limit(12)

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ students: data ?? [] })
}
