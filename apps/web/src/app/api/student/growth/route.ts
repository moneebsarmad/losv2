import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError, type AuthContext } from '@/lib/auth/server'
import { asSortedDistribution, groupSum } from '@/lib/dashboard/aggregations'
import type { RecognitionLog, StudentSummary } from '@/types'

async function resolveStudent(context: AuthContext) {
  const link = await context.admin
    .from('student_user_links')
    .select('student_id')
    .eq('school_id', context.schoolId!)
    .eq('user_id', context.user.id)
    .limit(1)
    .maybeSingle()

  if (link.data?.student_id) {
    return context.admin
      .from('students')
      .select('id, student_id, student_name, grade, section, house')
      .eq('school_id', context.schoolId!)
      .eq('id', link.data.student_id)
      .maybeSingle()
  }

  const profile = await context.admin
    .from('profiles')
    .select('student_name, full_name, name')
    .eq('school_id', context.schoolId!)
    .eq('id', context.user.id)
    .maybeSingle()
  const name = String(profile.data?.student_name ?? profile.data?.full_name ?? profile.data?.name ?? '').trim()
  if (!name) return { data: null, error: null }

  return context.admin
    .from('students')
    .select('id, student_id, student_name, grade, section, house')
    .eq('school_id', context.schoolId!)
    .ilike('student_name', name)
    .limit(1)
    .maybeSingle()
}

export async function GET() {
  const context = await getAuthContext()
  if (isAuthError(context)) return context.error

  const studentRes = await resolveStudent(context)
  if (studentRes.error) return NextResponse.json({ error: studentRes.error.message }, { status: 400 })
  if (!studentRes.data) return NextResponse.json({ profile: null, recognitions: [] })

  const student = studentRes.data as StudentSummary
  const { data, error } = await context.admin
    .from('recognition_logs')
    .select('*, r_values(id,key,name), domains(id,key,name)')
    .eq('school_id', context.schoolId!)
    .eq('student_id', student.id)
    .eq('student_visible', true)
    .eq('record_status', 'active')
    .is('deleted_at', null)
    .in('admin_review_status', ['approved', 'not_required'])
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const recognitions = (data ?? []) as RecognitionLog[]
  const totalPoints = recognitions.reduce((sum, row) => sum + Number(row.point_value ?? 0), 0)
  const byR = asSortedDistribution(groupSum(recognitions, (row) => row.r_values?.name ?? 'Unknown', (row) => row.point_value))
  const byDomain = asSortedDistribution(groupSum(recognitions, (row) => row.domains?.name ?? 'Unknown', (row) => row.point_value))

  return NextResponse.json({
    profile: student,
    recognitions,
    totals: {
      totalPoints,
      recognitionCount: recognitions.length,
      strongestR: byR[0]?.name ?? null,
      strongestDomain: byDomain[0]?.name ?? null,
      areaToGrow: byR.at(-1)?.name ?? null,
    },
    byR,
    byDomain,
    reflectionPrompt: 'Which recognition are you most proud of this week?',
  })
}
