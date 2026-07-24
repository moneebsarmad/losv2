import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAdmin } from '@/lib/auth/server'

export async function GET(request: NextRequest) {
  const context = await requireAdmin()
  if (isAuthError(context)) return context.error

  const start = request.nextUrl.searchParams.get('start')
  const end = request.nextUrl.searchParams.get('end')

  let recognitionQuery = context.admin
    .from('recognition_logs')
    .select('student_id')
    .eq('school_id', context.schoolId!)
    .eq('record_status', 'active')
    .is('deleted_at', null)
    .eq('award_status', 'approved')
    .in('admin_review_status', ['approved', 'not_required'])
  if (start) recognitionQuery = recognitionQuery.gte('created_at', `${start}T00:00:00.000Z`)
  if (end) recognitionQuery = recognitionQuery.lte('created_at', `${end}T23:59:59.999Z`)

  const [recognized, students] = await Promise.all([
    recognitionQuery,
    context.admin.from('students').select('id, student_id, student_name, grade, section, house').eq('school_id', context.schoolId!).eq('is_active', true),
  ])

  if (recognized.error) return NextResponse.json({ error: recognized.error.message }, { status: 400 })
  if (students.error) return NextResponse.json({ error: students.error.message }, { status: 400 })

  const recognizedIds = new Set((recognized.data ?? []).map((row) => row.student_id))
  const missed = (students.data ?? []).filter((student) => !recognizedIds.has(student.id))

  return NextResponse.json({ missed })
}
