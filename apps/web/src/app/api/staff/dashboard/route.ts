import { NextResponse } from 'next/server'
import { isAuthError, requireStaff } from '@/lib/auth/server'
import { groupSum, asSortedDistribution } from '@/lib/dashboard/aggregations'
import type { RecognitionLog, StudentSummary } from '@/types'

export async function GET() {
  const context = await requireStaff()
  if (isAuthError(context)) return context.error

  const since = new Date()
  since.setDate(since.getDate() - 14)

  const [recentOwn, recentAll, students] = await Promise.all([
    context.admin
      .from('recognition_logs')
      .select('*, r_values(id,key,name), domains(id,key,name)')
      .eq('school_id', context.schoolId!)
      .eq('staff_user_id', context.user.id)
      .eq('record_status', 'active')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(8),
    context.admin
      .from('recognition_logs')
      .select('student_id, house_snapshot, point_value, created_at')
      .eq('school_id', context.schoolId!)
      .eq('record_status', 'active')
      .is('deleted_at', null)
      .gte('created_at', since.toISOString()),
    context.admin
      .from('students')
      .select('id, student_id, student_name, grade, section, house')
      .eq('school_id', context.schoolId!)
      .eq('is_active', true)
      .order('student_name')
      .limit(5000),
  ])

  if (recentOwn.error) return NextResponse.json({ error: recentOwn.error.message }, { status: 400 })
  if (recentAll.error) return NextResponse.json({ error: recentAll.error.message }, { status: 400 })
  if (students.error) return NextResponse.json({ error: students.error.message }, { status: 400 })

  const ownRows = (recentOwn.data ?? []) as RecognitionLog[]
  const recentRows = (recentAll.data ?? []) as Array<{ student_id: string; house_snapshot: string; point_value: number }>
  const studentRows = (students.data ?? []) as StudentSummary[]
  const noticed = new Set(recentRows.map((row) => row.student_id))

  const houseImpact = asSortedDistribution(
    groupSum(ownRows, (row) => row.house_snapshot, (row) => Number(row.point_value ?? 0))
  )

  return NextResponse.json({
    recentRecognitions: ownRows,
    houseImpact,
    notRecognizedRecently: studentRows.filter((student) => !noticed.has(student.id)).slice(0, 8),
    totals: {
      recentSubmittedByMe: ownRows.length,
      activeStudents: studentRows.length,
      studentsNotRecognizedRecently: studentRows.filter((student) => !noticed.has(student.id)).length,
    },
  })
}
