import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/server'

export async function GET() {
  const context = await getAuthContext()
  if (isAuthError(context)) return context.error

  const links = await context.admin
    .from('parent_student_links')
    .select('student_id, relationship, is_primary')
    .eq('parent_user_id', context.user.id)

  if (links.error) return NextResponse.json({ error: links.error.message }, { status: 400 })
  const ids = (links.data ?? []).map((link) => link.student_id)
  if (ids.length === 0) return NextResponse.json({ children: [] })

  const students = await context.admin
    .from('students')
    .select('id, student_id, student_name, grade, section, house')
    .in('id', ids)
    .order('student_name')

  if (students.error) return NextResponse.json({ error: students.error.message }, { status: 400 })

  return NextResponse.json({
    children: (students.data ?? []).map((student) => ({
      ...student,
      link: links.data?.find((link) => link.student_id === student.id) ?? null,
    })),
  })
}
