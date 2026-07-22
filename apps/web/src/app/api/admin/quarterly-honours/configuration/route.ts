import { NextResponse } from 'next/server'
import { isAuthError, jsonError, requireHonoursPermission } from '@/lib/auth/server'
import { AWARD_CODES, type AwardCode } from '@/lib/honours/constants'

function scopedDefinitions(rows: Array<Record<string, any>>, schoolId: string) {
  const byCode = new Map<AwardCode, Record<string, any>>()
  rows.forEach((row) => {
    if (!AWARD_CODES.includes(row.code as AwardCode)) return
    const code = row.code as AwardCode
    if (!byCode.has(code) || row.school_id === schoolId) byCode.set(code, row)
  })
  return AWARD_CODES.map((code) => byCode.get(code)).filter(
    (row): row is Record<string, any> => Boolean(row)
  )
}

export async function GET() {
  const context = await requireHonoursPermission('honours.configure')
  if (isAuthError(context)) return context.error
  const schoolId = context.schoolId!
  const [definitions, mappings, rValues, domains, periods] = await Promise.all([
    context.admin
      .from('quarterly_award_definitions')
      .select('*')
      .eq('active', true)
      .or(`school_id.is.null,school_id.eq.${schoolId}`)
      .order('display_order'),
    context.admin
      .from('quarterly_award_signal_mappings')
      .select('*,quarterly_award_definitions(code,name)')
      .eq('school_id', schoolId)
      .order('created_at'),
    context.admin.from('r_values').select('id,key,name').order('sort_order'),
    context.admin.from('domains').select('id,key,name').eq('is_active', true).order('sort_order'),
    context.admin
      .from('quarterly_award_periods')
      .select('id,name,status')
      .eq('school_id', schoolId)
      .in('status', ['active', 'review_open']),
  ])
  const error = definitions.error ?? mappings.error ?? rValues.error ?? domains.error ?? periods.error
  if (error) return jsonError(error.message)
  return NextResponse.json({
    definitions: scopedDefinitions(definitions.data ?? [], schoolId),
    mappings: mappings.data ?? [],
    rValues: rValues.data ?? [],
    domains: domains.data ?? [],
    configurationLockedBy: periods.data ?? [],
  })
}

export async function PATCH(request: Request) {
  const context = await requireHonoursPermission('honours.configure')
  if (isAuthError(context)) return context.error
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  if (!body.awardDefinitionId || !body.configuration || !body.algorithmVersion) {
    return jsonError('Award definition, configuration and algorithm version are required.')
  }
  const { data, error } = await context.supabase.rpc('update_quarterly_award_definition', {
    p_award_definition_id: String(body.awardDefinitionId),
    p_configuration: body.configuration as any,
    p_algorithm_version: String(body.algorithmVersion),
  })
  if (error) return jsonError(error.message, error.code === '42501' ? 403 : 400)
  return NextResponse.json({ definition: data })
}

export async function POST(request: Request) {
  const context = await requireHonoursPermission('honours.configure')
  if (isAuthError(context)) return context.error
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const { data, error } = await context.supabase.rpc('upsert_quarterly_award_signal_mapping', {
    p_award_definition_id: String(body.awardDefinitionId ?? ''),
    p_source_type: String(body.sourceType ?? ''),
    p_source_key: String(body.sourceKey ?? ''),
    p_signal_type: String(body.signalType ?? ''),
    p_weight: Number(body.weight ?? 1),
    p_qualifies_as_significant: body.qualifiesAsSignificant === true,
    p_qualifies_as_peer_impact: body.qualifiesAsPeerImpact === true,
  })
  if (error) return jsonError(error.message, error.code === '42501' ? 403 : 400)
  return NextResponse.json({ mapping: data }, { status: 201 })
}

export async function DELETE(request: Request) {
  const context = await requireHonoursPermission('honours.configure')
  if (isAuthError(context)) return context.error
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>
  const { data, error } = await context.supabase.rpc('deactivate_quarterly_award_signal_mapping', {
    p_mapping_id: String(body.mappingId ?? ''),
    p_reason: String(body.reason ?? ''),
  })
  if (error) return jsonError(error.message, error.code === '42501' ? 403 : 400)
  return NextResponse.json({ mapping: data })
}
