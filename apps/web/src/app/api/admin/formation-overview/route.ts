import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAdmin } from '@/lib/auth/server'
import { asSortedDistribution, groupSum } from '@/lib/dashboard/aggregations'
import type { RecognitionLog } from '@/types'

function applyFilters(query: any, request: NextRequest) {
  const params = request.nextUrl.searchParams
  const start = params.get('start')
  const end = params.get('end')
  const house = params.get('house')
  const grade = params.get('grade')
  const staff = params.get('staff')
  const rValue = params.get('r')
  const domain = params.get('domain')

  if (start) query = query.gte('created_at', `${start}T00:00:00.000Z`)
  if (end) query = query.lte('created_at', `${end}T23:59:59.999Z`)
  if (house) query = query.eq('house_snapshot', house)
  if (grade) query = query.eq('grade_snapshot', Number(grade))
  if (staff) query = query.ilike('staff_name_snapshot', `%${staff}%`)
  if (rValue) query = query.eq('r_value_id', rValue)
  if (domain) query = query.eq('domain_id', domain)
  return query
}

export async function GET(request: NextRequest) {
  const context = await requireAdmin()
  if (isAuthError(context)) return context.error

  let query = context.admin
    .from('recognition_logs')
    .select('*, r_values(id,key,name), domains(id,key,name)')
    .eq('school_id', context.schoolId!)
    .eq('record_status', 'active')
    .is('deleted_at', null)
    .eq('award_status', 'approved')
    .in('admin_review_status', ['approved', 'not_required'])
    .order('created_at', { ascending: false })
    .limit(5000)

  query = applyFilters(query, request)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const recognitions = (data ?? []) as RecognitionLog[]
  const byHouse = asSortedDistribution(groupSum(recognitions, (row) => row.house_snapshot, (row) => row.point_value))
  const byR = asSortedDistribution(groupSum(recognitions, (row) => row.r_values?.name ?? 'Unknown', (row) => row.point_value))
  const byDomain = asSortedDistribution(groupSum(recognitions, (row) => row.domains?.name ?? 'Unknown', (row) => row.point_value))
  const byStaff = asSortedDistribution(groupSum(recognitions, (row) => row.staff_name_snapshot, () => 1))

  const countsByStudent = asSortedDistribution(groupSum(recognitions, (row) => row.student_name_snapshot, () => 1))
  const highVolumeStudents = countsByStudent.slice(0, 10)

  return NextResponse.json({
    totals: {
      recognitionCount: recognitions.length,
      totalPoints: recognitions.reduce((sum, row) => sum + Number(row.point_value ?? 0), 0),
      uniqueStudents: new Set(recognitions.map((row) => row.student_id)).size,
      activeStaff: new Set(recognitions.map((row) => row.staff_user_id)).size,
    },
    byHouse,
    byR,
    byDomain,
    byStaff,
    highVolumeStudents,
    recentRecognitions: recognitions.slice(0, 20),
  })
}
