import { NextRequest, NextResponse } from 'next/server'
import { hasPermission, isAuthError, requireAdmin } from '@/lib/auth/server'
import { recognitionErrorMessage } from '@/lib/recognition/validation'

export async function GET(request: NextRequest) {
  const context = await requireAdmin()
  if (isAuthError(context)) return context.error
  if (!context.schoolId || !(await hasPermission(context, 'recognitions.nomination_review'))) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const status = request.nextUrl.searchParams.get('status') ?? 'pending'
  let query = context.admin
    .from('recognition_nominations')
    .select('*')
    .eq('school_id', context.schoolId)
    .order('created_at', { ascending: false })
    .limit(500)
  if (status !== 'all') query = query.eq('status', status)

  const { data: nominations, error } = await query
  if (error) return NextResponse.json({ error: 'Unable to load nominations.' }, { status: 400 })

  const studentIds = [...new Set((nominations ?? []).map((row) => row.student_id))]
  const definitionIds = [...new Set((nominations ?? []).map((row) => row.recognition_definition_id))]
  const domainIds = [...new Set((nominations ?? []).map((row) => row.domain_id))]
  const profileIds = [
    ...new Set(
      (nominations ?? []).flatMap((row) =>
        [row.nominated_by_profile_id, row.reviewed_by_profile_id].filter(Boolean) as string[]
      )
    ),
  ]
  const nominationIds = (nominations ?? []).map((row) => row.id)

  const [students, definitions, domains, profiles, histories, related] = await Promise.all([
    studentIds.length
      ? context.admin
          .from('students')
          .select('id,student_name,grade,section,house')
          .eq('school_id', context.schoolId)
          .in('id', studentIds)
      : Promise.resolve({ data: [], error: null }),
    definitionIds.length
      ? context.admin
          .from('recognition_definitions')
          .select('id,code,label,fixed_points,r_value_id,r_values(key,name)')
          .eq('school_id', context.schoolId)
          .in('id', definitionIds)
      : Promise.resolve({ data: [], error: null }),
    domainIds.length
      ? context.admin.from('domains').select('id,key,name').in('id', domainIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? context.admin
          .from('profiles')
          .select('id,full_name,staff_name,name,email')
          .eq('school_id', context.schoolId)
          .in('id', profileIds)
      : Promise.resolve({ data: [], error: null }),
    nominationIds.length
      ? context.admin
          .from('audit_logs')
          .select('id,record_id,action,user_id,new_data,created_at')
          .eq('school_id', context.schoolId)
          .eq('table_name', 'recognition_nominations')
          .in('record_id', nominationIds)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    studentIds.length && definitionIds.length
      ? context.admin
          .from('recognition_nominations')
          .select('id,student_id,recognition_definition_id,status,created_at')
          .eq('school_id', context.schoolId)
          .in('student_id', studentIds)
          .in('recognition_definition_id', definitionIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  const studentById = new Map((students.data ?? []).map((row) => [row.id, row]))
  const definitionById = new Map((definitions.data ?? []).map((row) => [row.id, row]))
  const domainById = new Map((domains.data ?? []).map((row) => [row.id, row]))
  const profileById = new Map((profiles.data ?? []).map((row) => [row.id, row]))
  const nameFor = (id: string | null) => {
    if (!id) return null
    const profile = profileById.get(id)
    return profile?.staff_name ?? profile?.full_name ?? profile?.name ?? profile?.email ?? 'Staff'
  }

  const rows = (nominations ?? []).map((nomination) => ({
    ...nomination,
    student: studentById.get(nomination.student_id) ?? null,
    definition: definitionById.get(nomination.recognition_definition_id) ?? null,
    domain: domainById.get(nomination.domain_id) ?? null,
    nominator_name: nameFor(nomination.nominated_by_profile_id),
    reviewer_name: nameFor(nomination.reviewed_by_profile_id),
    status_history: (histories.data ?? []).filter((entry) => entry.record_id === nomination.id),
    related_nominations: (related.data ?? []).filter(
      (entry) =>
        entry.id !== nomination.id &&
        entry.student_id === nomination.student_id &&
        entry.recognition_definition_id === nomination.recognition_definition_id
    ),
  }))

  return NextResponse.json({ nominations: rows })
}

export async function POST(request: NextRequest) {
  const context = await requireAdmin()
  if (isAuthError(context)) return context.error
  if (!context.schoolId || !(await hasPermission(context, 'recognitions.nomination_review'))) {
    return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
  }

  const payload = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const nominationId = String(payload.nomination_id ?? '').trim()
  const decision = String(payload.decision ?? '').trim()
  const reviewNote = String(payload.review_note ?? '').trim() || null
  if (!nominationId) return NextResponse.json({ error: 'Nomination is required.' }, { status: 400 })
  if (!['approved', 'rejected'].includes(decision)) {
    return NextResponse.json({ error: 'Choose approve or reject.' }, { status: 400 })
  }
  if (decision === 'rejected' && (reviewNote?.length ?? 0) < 5) {
    return NextResponse.json({ error: 'Add a brief review note when rejecting a nomination.' }, { status: 400 })
  }

  const { data, error } = await context.supabase.rpc('review_recognition_nomination_v2', {
    p_nomination_id: nominationId,
    p_decision: decision,
    p_review_note: reviewNote ?? undefined,
  })
  if (error) {
    return NextResponse.json(
      { error: recognitionErrorMessage(error.message) },
      { status: error.code === '42501' ? 403 : error.message.includes('already') ? 409 : 400 }
    )
  }
  return NextResponse.json({ nomination: data })
}
