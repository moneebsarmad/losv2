import { NextResponse } from 'next/server'
import { isAuthError, jsonError, requireStaff } from '@/lib/auth/server'
import { parseNominationRequest, recognitionErrorMessage } from '@/lib/recognition/validation'

export async function POST(request: Request) {
  const context = await requireStaff()
  if (isAuthError(context)) return context.error
  if (!context.schoolId) return jsonError('School profile is not configured.', 403)

  const parsed = parseNominationRequest(await request.json().catch(() => ({})))
  if (!parsed.ok) return jsonError(parsed.error)
  const value = parsed.value

  const { data, error } = await context.supabase.rpc('submit_recognition_nomination_v2', {
    p_student_id: value.studentId,
    p_recognition_definition_code: value.recognitionDefinitionCode,
    p_domain_code: value.domainCode,
    p_explanation: value.explanation,
    p_idempotency_key: value.idempotencyKey,
    p_witness_information: value.witnessInformation ?? undefined,
    p_observed_at: value.observedAt,
  })

  if (error) {
    const status = error.code === '42501' ? 403 : error.message.includes('already') ? 409 : 400
    return NextResponse.json({ error: recognitionErrorMessage(error.message) }, { status })
  }
  return NextResponse.json({ nomination: data }, { status: 201 })
}
