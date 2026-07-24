import { NextRequest, NextResponse } from 'next/server'
import { hasPermission, isAuthError, requireAdmin } from '@/lib/auth/server'
import { asSortedDistribution, groupSum } from '@/lib/dashboard/aggregations'

type ReportingRow = {
  id: string
  student_id: string
  student_name_snapshot: string
  grade_snapshot: number | null
  house_snapshot: string
  staff_user_id: string
  staff_name_snapshot: string
  r_value_code: string
  r_value_name: string
  domain_code: string
  domain_name: string
  behaviour_code: string | null
  behaviour_label: string
  graduate_value_codes: string[] | null
  graduate_value_labels: string | null
  points: number
  framework_version: string
  recognition_mode: string
  recognition_date: string
}

export async function GET(request: NextRequest) {
  const context = await requireAdmin()
  if (isAuthError(context)) return context.error
  if (!context.schoolId || !(await hasPermission(context, 'recognitions.analytics'))) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const params = request.nextUrl.searchParams
  const start = params.get('start')
  const end = params.get('end')
  let query = context.admin
    .from('v_recognition_reporting')
    .select('*')
    .eq('school_id', context.schoolId)
    .order('recognition_date', { ascending: false })
    .limit(10000)
  if (start) query = query.gte('recognition_date', start)
  if (end) query = query.lte('recognition_date', end)

  const [awardsResult, nominationsResult, duplicatesResult] = await Promise.all([
    query,
    context.admin
      .from('recognition_nominations')
      .select('status')
      .eq('school_id', context.schoolId)
      .limit(10000),
    context.admin
      .from('v_recognition_possible_duplicates')
      .select('id')
      .eq('school_id', context.schoolId)
      .limit(10000),
  ])
  if (awardsResult.error) {
    return NextResponse.json({ error: 'Unable to load recognition analytics.' }, { status: 400 })
  }

  const filters = {
    grade: params.get('grade'),
    student: params.get('student')?.toLowerCase(),
    house: params.get('house'),
    staff: params.get('staff')?.toLowerCase(),
    r: params.get('r'),
    behaviour: params.get('behaviour'),
    graduateValue: params.get('graduate_value'),
    domain: params.get('domain'),
    points: params.get('points'),
    framework: params.get('framework'),
    mode: params.get('mode'),
  }
  const awards = ((awardsResult.data ?? []) as ReportingRow[]).filter((row) => {
    if (filters.grade && row.grade_snapshot !== Number(filters.grade)) return false
    if (filters.student && !row.student_name_snapshot.toLowerCase().includes(filters.student)) return false
    if (filters.house && row.house_snapshot !== filters.house) return false
    if (filters.staff && !row.staff_name_snapshot.toLowerCase().includes(filters.staff)) return false
    if (filters.r && row.r_value_code !== filters.r) return false
    if (filters.behaviour && row.behaviour_code !== filters.behaviour) return false
    if (filters.graduateValue && !(row.graduate_value_codes ?? []).includes(filters.graduateValue)) return false
    if (filters.domain && row.domain_code !== filters.domain) return false
    if (filters.points && row.points !== Number(filters.points)) return false
    if (filters.framework && row.framework_version !== filters.framework) return false
    if (filters.mode && row.recognition_mode !== filters.mode) return false
    return true
  })

  const staffGroups = new Map<
    string,
    { points: number; awards: number; twenty: number; students: Set<string> }
  >()
  for (const award of awards) {
    const current = staffGroups.get(award.staff_name_snapshot) ?? {
      points: 0,
      awards: 0,
      twenty: 0,
      students: new Set<string>(),
    }
    current.points += Number(award.points)
    current.awards += 1
    current.twenty += award.points === 20 ? 1 : 0
    current.students.add(award.student_id)
    staffGroups.set(award.staff_name_snapshot, current)
  }

  const byGraduateValue: Record<string, number> = {}
  for (const row of awards) {
    const labels = row.graduate_value_labels?.split(', ') ?? ['Legacy / unmapped']
    for (const label of labels) byGraduateValue[label] = (byGraduateValue[label] ?? 0) + 1
  }
  const nominationStatuses = groupSum(
    nominationsResult.data ?? [],
    (row) => row.status,
    () => 1
  )

  return NextResponse.json({
    totals: {
      awards: awards.length,
      points: awards.reduce((sum, row) => sum + Number(row.points), 0),
      uniqueStudents: new Set(awards.map((row) => row.student_id)).size,
      activeStaff: new Set(awards.map((row) => row.staff_user_id)).size,
      possibleDuplicates: duplicatesResult.data?.length ?? 0,
    },
    byR: asSortedDistribution(groupSum(awards, (row) => row.r_value_name, () => 1)),
    byDomain: asSortedDistribution(groupSum(awards, (row) => row.domain_name, () => 1)),
    byBehaviour: asSortedDistribution(groupSum(awards, (row) => row.behaviour_label, () => 1)),
    byGraduateValue: asSortedDistribution(byGraduateValue),
    byPointTier: asSortedDistribution(groupSum(awards, (row) => `+${row.points}`, () => 1)),
    byHouse: asSortedDistribution(groupSum(awards, (row) => row.house_snapshot, () => 1)),
    byStudent: asSortedDistribution(groupSum(awards, (row) => row.student_name_snapshot, () => 1)),
    byFramework: asSortedDistribution(groupSum(awards, (row) => row.framework_version, () => 1)),
    byMode: asSortedDistribution(
      groupSum(awards, (row) => (row.recognition_mode === 'nomination' ? 'Exceptional' : 'Direct'), () => 1)
    ),
    staff: [...staffGroups.entries()]
      .map(([name, values]) => ({
        name,
        awards: values.awards,
        points: values.points,
        averagePoints: values.awards ? Number((values.points / values.awards).toFixed(1)) : 0,
        twentyPercent: values.awards ? Number(((values.twenty / values.awards) * 100).toFixed(1)) : 0,
        uniqueStudents: values.students.size,
      }))
      .sort((a, b) => b.awards - a.awards),
    nominations: {
      pending: nominationStatuses.pending ?? 0,
      approved: nominationStatuses.approved ?? 0,
      rejected: nominationStatuses.rejected ?? 0,
      withdrawn: nominationStatuses.withdrawn ?? 0,
    },
    recentAwards: awards.slice(0, 30).map((row) => ({
      id: row.id,
      recognitionDate: row.recognition_date,
      student: row.student_name_snapshot,
      house: row.house_snapshot,
      staff: row.staff_name_snapshot,
      behaviour: row.behaviour_label,
      domain: row.domain_name,
      points: row.points,
      framework: row.framework_version,
      mode: row.recognition_mode,
    })),
  })
}
