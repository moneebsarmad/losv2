import { describe, expect, it } from 'vitest'
import {
  noteMeetsDefinitionRequirement,
  parseDirectAwardRequest,
  parseNominationRequest,
} from './validation'

const directPayload = {
  student_ids: ['student-a'],
  recognition_definition_code: 'respect_included_someone',
  domain_code: 'lunch_recess',
  note: null,
  observed_at: '2026-07-24T15:00:00.000Z',
  idempotency_key: 'recognition-test-001',
  visibility: 'student_parent',
}

describe('recognition request validation', () => {
  it('accepts the canonical direct-award contract and ignores spoofed authority fields', () => {
    const result = parseDirectAwardRequest({
      ...directPayload,
      points: 50,
      point_value: 50,
      awarded_by: 'spoofed-user',
      staff_user_id: 'spoofed-user',
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value).toEqual({
      studentIds: ['student-a'],
      recognitionDefinitionCode: 'respect_included_someone',
      domainCode: 'lunch_recess',
      note: null,
      observedAt: '2026-07-24T15:00:00.000Z',
      idempotencyKey: 'recognition-test-001',
      visibility: 'student_parent',
    })
    expect(result.value).not.toHaveProperty('points')
    expect(result.value).not.toHaveProperty('awardedBy')
  })

  it('deduplicates students while preserving a bulk submission', () => {
    const result = parseDirectAwardRequest({
      ...directPayload,
      student_ids: ['student-a', 'student-b', 'student-a'],
    })

    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.studentIds).toEqual(['student-a', 'student-b'])
  })

  it('rejects missing, custom, and legacy domain values', () => {
    for (const domainCode of ['', 'playground', 'washrooms', 'classrooms']) {
      const result = parseDirectAwardRequest({ ...directPayload, domain_code: domainCode })
      expect(result).toEqual({ ok: false, error: 'Select where the behaviour occurred.' })
    }
  })

  it('enforces the +20 note rule without requiring notes for lower tiers', () => {
    expect(noteMeetsDefinitionRequirement(5, '')).toBe(true)
    expect(noteMeetsDefinitionRequirement(10, '')).toBe(true)
    expect(noteMeetsDefinitionRequirement(20, 'Too short')).toBe(false)
    expect(noteMeetsDefinitionRequirement(20, 'The student persisted through a difficult conflict.')).toBe(true)
  })

  it('requires a substantive explanation for exceptional nominations', () => {
    const invalid = parseNominationRequest({
      student_id: 'student-a',
      recognition_definition_code: 'respect_defended_someone_personal_risk',
      domain_code: 'hallways_transitions',
      explanation: 'Too short',
      observed_at: '2026-07-24T15:00:00.000Z',
      idempotency_key: 'nomination-test-001',
    })
    expect(invalid.ok).toBe(false)

    const valid = parseNominationRequest({
      student_id: 'student-a',
      recognition_definition_code: 'respect_defended_someone_personal_risk',
      domain_code: 'hallways_transitions',
      explanation: 'The student safely defended a peer despite a credible risk of retaliation.',
      witness_information: 'Observed by two staff members.',
      observed_at: '2026-07-24T15:00:00.000Z',
      idempotency_key: 'nomination-test-001',
    })
    expect(valid.ok).toBe(true)
  })
})
