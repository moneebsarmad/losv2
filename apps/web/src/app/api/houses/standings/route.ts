import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/server'
import { asSortedDistribution, groupSum } from '@/lib/dashboard/aggregations'

export async function GET() {
  const context = await getAuthContext()
  if (isAuthError(context)) return context.error

  const [recognitions, houseEvents] = await Promise.all([
    context.admin.from('recognition_logs').select('house_snapshot, point_value, r_values(name), domains(name)').eq('school_id', context.schoolId!).eq('record_status', 'active').is('deleted_at', null).limit(10000),
    context.admin.from('house_events').select('house, point_value').eq('school_id', context.schoolId!).limit(10000),
  ])

  if (recognitions.error) return NextResponse.json({ error: recognitions.error.message }, { status: 400 })
  if (houseEvents.error) return NextResponse.json({ error: houseEvents.error.message }, { status: 400 })

  const recognitionRows = recognitions.data ?? []
  const eventRows = houseEvents.data ?? []
  const recognitionPoints = groupSum(
    recognitionRows,
    (row: any) => row.house_snapshot,
    (row: any) => Number(row.point_value ?? 0)
  )
  const eventPoints = groupSum(
    eventRows,
    (row: any) => row.house,
    (row: any) => Number(row.point_value ?? 0)
  )

  Object.entries(eventPoints).forEach(([house, points]) => {
    recognitionPoints[house] = (recognitionPoints[house] ?? 0) + points
  })

  return NextResponse.json({
    standings: asSortedDistribution(recognitionPoints),
    byR: asSortedDistribution(
      groupSum(recognitionRows, (row: any) => row.r_values?.name ?? 'Unknown', (row: any) => Number(row.point_value ?? 0))
    ),
    byDomain: asSortedDistribution(
      groupSum(recognitionRows, (row: any) => row.domains?.name ?? 'Unknown', (row: any) => Number(row.point_value ?? 0))
    ),
  })
}
