import { NextResponse } from 'next/server'
import { isAuthError, jsonError, requireStaff } from '@/lib/auth/server'
import { visibilityBooleans, type VisibilityKey, VISIBILITY_OPTIONS } from '@/lib/constants/formation'

type Payload = {
  studentId?: string
  rValueId?: string
  domainId?: string
  pointValue?: number
  behaviourNote?: string
  visibility?: VisibilityKey
}

export async function POST(request: Request) {
  const context = await requireStaff()
  if (isAuthError(context)) return context.error

  const payload = (await request.json().catch(() => ({}))) as Payload
  const studentId = String(payload.studentId ?? '').trim()
  const rValueId = String(payload.rValueId ?? '').trim()
  const domainId = String(payload.domainId ?? '').trim()
  const pointValue = Number(payload.pointValue)
  const behaviourNote = String(payload.behaviourNote ?? '').trim()
  const visibility = payload.visibility

  if (!studentId) return jsonError('Student is required.')
  if (!rValueId) return jsonError('3R is required.')
  if (!domainId) return jsonError('Domain is required.')
  if (!Number.isFinite(pointValue)) return jsonError('Point value is required.')
  if (!behaviourNote) return jsonError('Behaviour note is required.')
  if (!visibility || !VISIBILITY_OPTIONS.some((option) => option.key === visibility)) {
    return jsonError('Valid visibility is required.')
  }

  const [studentRes, rValueRes, domainRes, pointRes, profileRes] = await Promise.all([
    context.admin.from('students').select('id, student_name, grade, section, house, is_active').eq('id', studentId).maybeSingle(),
    context.admin.from('r_values').select('id').eq('id', rValueId).maybeSingle(),
    context.admin.from('domains').select('id').eq('id', domainId).eq('is_active', true).maybeSingle(),
    context.admin.from('point_values').select('value').eq('value', pointValue).eq('is_active', true).maybeSingle(),
    context.admin.from('profiles').select('full_name, name, staff_name, email').eq('id', context.user.id).maybeSingle(),
  ])

  if (!studentRes.data || studentRes.error || studentRes.data.is_active === false) return jsonError('Student not found.')
  if (!rValueRes.data || rValueRes.error) return jsonError('Invalid 3R.')
  if (!domainRes.data || domainRes.error) return jsonError('Invalid domain.')
  if (!pointRes.data || pointRes.error) return jsonError('Invalid point value.')

  const staffName = String(
    profileRes.data?.staff_name ??
      profileRes.data?.full_name ??
      profileRes.data?.name ??
      profileRes.data?.email ??
      context.user.email ??
      'Staff'
  ).trim()
  const { studentVisible, parentVisible } = visibilityBooleans(visibility)

  const insertPayload = {
    student_id: studentRes.data.id,
    staff_user_id: context.user.id,
    staff_name_snapshot: staffName,
    student_name_snapshot: studentRes.data.student_name,
    grade_snapshot: studentRes.data.grade,
    section_snapshot: studentRes.data.section,
    house_snapshot: studentRes.data.house,
    r_value_id: rValueId,
    domain_id: domainId,
    point_value: pointValue,
    behaviour_note: behaviourNote,
    visibility,
    student_visible: studentVisible,
    parent_visible: parentVisible,
    admin_review_status: 'approved',
    source: 'manual',
  }

  const { data, error } = await context.admin.from('recognition_logs').insert(insertPayload).select('id').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  await context.admin.from('audit_logs').insert({
    user_id: context.user.id,
    action: 'recognition.created',
    table_name: 'recognition_logs',
    record_id: data.id,
    new_data: insertPayload,
  })

  return NextResponse.json({ recognition: data })
}
