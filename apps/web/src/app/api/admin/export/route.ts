import { NextRequest, NextResponse } from 'next/server'
import { isAuthError, requireAdmin } from '@/lib/auth/server'

function csvEscape(value: unknown) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export async function GET(request: NextRequest) {
  const context = await requireAdmin()
  if (isAuthError(context)) return context.error

  const start = request.nextUrl.searchParams.get('start')
  const end = request.nextUrl.searchParams.get('end')
  let query = context.admin
    .from('recognition_logs')
    .select('created_at, student_name_snapshot, grade_snapshot, section_snapshot, house_snapshot, staff_name_snapshot, point_value, behaviour_note, visibility, r_values(name), domains(name)')
    .order('created_at', { ascending: false })
    .limit(10000)

  if (start) query = query.gte('created_at', `${start}T00:00:00.000Z`)
  if (end) query = query.lte('created_at', `${end}T23:59:59.999Z`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  const headers = [
    'Date',
    'Student',
    'Grade',
    'Section',
    'House',
    'Staff',
    '3R',
    'Domain',
    'Points',
    'Visibility',
    'Note',
  ]
  const rows = (data ?? []).map((row: any) => [
    row.created_at,
    row.student_name_snapshot,
    row.grade_snapshot,
    row.section_snapshot,
    row.house_snapshot,
    row.staff_name_snapshot,
    row.r_values?.name,
    row.domains?.name,
    row.point_value,
    row.visibility,
    row.behaviour_note,
  ])
  const csv = [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="losv2-recognitions-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
