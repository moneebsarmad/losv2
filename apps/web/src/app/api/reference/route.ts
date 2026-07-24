import { NextResponse } from 'next/server'
import { getAuthContext, isAuthError } from '@/lib/auth/server'
import { CANONICAL_DOMAIN_CODES } from '@/lib/recognition/constants'
import type { GraduateValue, RecognitionDefinition } from '@/types'

export async function GET() {
  const context = await getAuthContext()
  if (isAuthError(context)) return context.error
  if (!context.schoolId) {
    return NextResponse.json({ error: 'School profile is not configured.' }, { status: 403 })
  }

  const [rValues, domains, graduateValues, definitions, mappings] = await Promise.all([
    context.admin.from('r_values').select('id,key,name,description,sort_order').order('sort_order'),
    context.admin
      .from('domains')
      .select('id,key,name,description,sort_order')
      .eq('is_active', true)
      .in('key', [...CANONICAL_DOMAIN_CODES])
      .order('sort_order'),
    context.admin
      .from('graduate_values')
      .select('id,code,display_label,islamic_term,parent_r_value_id,sort_order')
      .eq('school_id', context.schoolId)
      .order('sort_order'),
    context.admin
      .from('recognition_definitions')
      .select('id,code,r_value_id,label,description,fixed_points,award_mode,requires_note,is_active,sort_order,framework_version')
      .eq('school_id', context.schoolId)
      .eq('is_active', true)
      .order('sort_order'),
    context.admin
      .from('recognition_definition_graduate_values')
      .select('recognition_definition_id,graduate_value_id,relationship')
      .eq('school_id', context.schoolId),
  ])

  const error = [rValues.error, domains.error, graduateValues.error, definitions.error, mappings.error].find(Boolean)
  if (error) return NextResponse.json({ error: 'Unable to load recognition definitions.' }, { status: 400 })

  const rById = new Map((rValues.data ?? []).map((row) => [row.id, row]))
  const graduateById = new Map(
    ((graduateValues.data ?? []) as GraduateValue[]).map((row) => [row.id, row])
  )
  const mappingsByDefinition = new Map<string, GraduateValue[]>()
  for (const mapping of mappings.data ?? []) {
    const value = graduateById.get(mapping.graduate_value_id)
    if (!value) continue
    const list = mappingsByDefinition.get(mapping.recognition_definition_id) ?? []
    list.push({
      ...value,
      relationship: mapping.relationship as 'primary' | 'secondary',
    })
    mappingsByDefinition.set(mapping.recognition_definition_id, list)
  }

  const normalisedDefinitions: RecognitionDefinition[] = (definitions.data ?? []).map((row) => {
    const rValue = rById.get(row.r_value_id)
    return {
      ...row,
      fixed_points: row.fixed_points as 5 | 10 | 20 | 50,
      award_mode: row.award_mode as 'direct' | 'nomination',
      r_value_code: (rValue?.key ?? 'respect') as RecognitionDefinition['r_value_code'],
      r_value_name: rValue?.name ?? '3R',
      graduate_values: (mappingsByDefinition.get(row.id) ?? []).sort((a, b) =>
        a.relationship === 'primary' ? -1 : b.relationship === 'primary' ? 1 : 0
      ),
    }
  })

  return NextResponse.json({
    rValues: rValues.data ?? [],
    domains: domains.data ?? [],
    graduateValues: graduateValues.data ?? [],
    definitions: normalisedDefinitions,
  })
}
