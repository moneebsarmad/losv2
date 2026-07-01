import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/server'
import { asSortedDistribution, groupSum } from '@/lib/dashboard/aggregations'
import type { RecognitionLog, StudentSummary } from '@/types'

export async function GET(_request: Request, { params }: { params: Promise<{ studentId: string }> }) {
  const context = await getAuthContext()
  if (isAuthError(context)) return context.error
  const { studentId } = await params

  const link = await context.admin
    .from('parent_student_links')
    .select('student_id')
    .eq('parent_user_id', context.user.id)
    .eq('student_id', studentId)
    .maybeSingle()

  if (!link.data || link.error) {
    return NextResponse.json({ error: 'Child not found for this parent account.' }, { status: 404 })
  }

  const [studentRes, recognitionRes] = await Promise.all([
    context.admin
      .from('students')
      .select('id, student_id, student_name, grade, section, house')
      .eq('id', studentId)
      .maybeSingle(),
    context.admin
      .from('recognition_logs')
      .select('*, r_values(id,key,name), domains(id,key,name)')
      .eq('student_id', studentId)
      .eq('parent_visible', true)
      .in('admin_review_status', ['approved', 'not_required'])
      .order('created_at', { ascending: false }),
  ])

  if (studentRes.error) return NextResponse.json({ error: studentRes.error.message }, { status: 400 })
  if (recognitionRes.error) return NextResponse.json({ error: recognitionRes.error.message }, { status: 400 })

  const recognitions = (recognitionRes.data ?? []) as RecognitionLog[]
  const byR = asSortedDistribution(groupSum(recognitions, (row) => row.r_values?.name ?? 'Unknown', (row) => row.point_value))
  const byDomain = asSortedDistribution(groupSum(recognitions, (row) => row.domains?.name ?? 'Unknown', (row) => row.point_value))
  const latestPrompt = recognitions[0]?.behaviour_note
    ? `Ask your child about this moment: ${recognitions[0].behaviour_note}`
    : 'Ask your child which 3R they want to strengthen this week.'

  return NextResponse.json({
    profile: studentRes.data as StudentSummary | null,
    recognitions,
    totals: {
      totalPoints: recognitions.reduce((sum, row) => sum + Number(row.point_value ?? 0), 0),
      recognitionCount: recognitions.length,
      strongestR: byR[0]?.name ?? null,
      strongestDomain: byDomain[0]?.name ?? null,
    },
    byR,
    byDomain,
    conversationPrompt: latestPrompt,
  })
}
