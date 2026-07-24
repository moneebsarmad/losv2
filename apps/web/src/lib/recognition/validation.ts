import {
  CANONICAL_DOMAIN_CODES,
  DIRECT_NOTE_MIN_LENGTH,
  MAX_BULK_STUDENTS,
  NOMINATION_EXPLANATION_MIN_LENGTH,
  RECOGNITION_NOTE_MAX_LENGTH,
} from './constants'
import type { VisibilityKey } from '@/lib/constants/formation'

const VISIBILITIES: VisibilityKey[] = ['staff_only', 'student', 'parent', 'student_parent']

export type DirectAwardRequest = {
  studentIds: string[]
  recognitionDefinitionCode: string
  domainCode: string
  note: string | null
  observedAt: string
  idempotencyKey: string
  visibility: VisibilityKey
}

export type NominationRequest = {
  studentId: string
  recognitionDefinitionCode: string
  domainCode: string
  explanation: string
  witnessInformation: string | null
  observedAt: string
  idempotencyKey: string
}

type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string }

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function parseDate(value: unknown) {
  const candidate = cleanText(value)
  const parsed = candidate ? new Date(candidate) : new Date()
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

function parseIdempotencyKey(value: unknown) {
  const key = cleanText(value)
  return key.length >= 8 && key.length <= 200 ? key : null
}

export function parseDirectAwardRequest(body: unknown): ParseResult<DirectAwardRequest> {
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const studentIds = Array.isArray(payload.student_ids)
    ? [...new Set(payload.student_ids.map(cleanText).filter(Boolean))]
    : []
  const recognitionDefinitionCode = cleanText(payload.recognition_definition_code)
  const domainCode = cleanText(payload.domain_code)
  const note = cleanText(payload.note) || null
  const observedAt = parseDate(payload.observed_at)
  const idempotencyKey = parseIdempotencyKey(payload.idempotency_key)
  const visibility = cleanText(payload.visibility || 'student_parent') as VisibilityKey

  if (studentIds.length === 0) return { ok: false, error: 'Select at least one student.' }
  if (studentIds.length > MAX_BULK_STUDENTS) {
    return { ok: false, error: `A bulk recognition may include at most ${MAX_BULK_STUDENTS} students.` }
  }
  if (!recognitionDefinitionCode) return { ok: false, error: 'Select the behaviour you observed.' }
  if (!CANONICAL_DOMAIN_CODES.includes(domainCode as never)) {
    return { ok: false, error: 'Select where the behaviour occurred.' }
  }
  if (note && note.length > RECOGNITION_NOTE_MAX_LENGTH) {
    return { ok: false, error: `Recognition notes cannot exceed ${RECOGNITION_NOTE_MAX_LENGTH} characters.` }
  }
  if (!observedAt) return { ok: false, error: 'Enter a valid observation date and time.' }
  if (!idempotencyKey) return { ok: false, error: 'A valid submission identifier is required.' }
  if (!VISIBILITIES.includes(visibility)) return { ok: false, error: 'Valid visibility is required.' }

  // Deliberately ignore point and awarding-staff fields. The database resolves both.
  return {
    ok: true,
    value: {
      studentIds,
      recognitionDefinitionCode,
      domainCode,
      note,
      observedAt,
      idempotencyKey,
      visibility,
    },
  }
}

export function parseNominationRequest(body: unknown): ParseResult<NominationRequest> {
  const payload = body && typeof body === 'object' ? (body as Record<string, unknown>) : {}
  const studentId = cleanText(payload.student_id)
  const recognitionDefinitionCode = cleanText(payload.recognition_definition_code)
  const domainCode = cleanText(payload.domain_code)
  const explanation = cleanText(payload.explanation)
  const witnessInformation = cleanText(payload.witness_information) || null
  const observedAt = parseDate(payload.observed_at)
  const idempotencyKey = parseIdempotencyKey(payload.idempotency_key)

  if (!studentId) return { ok: false, error: 'Select a student.' }
  if (!recognitionDefinitionCode) return { ok: false, error: 'Select the exceptional behaviour you observed.' }
  if (!CANONICAL_DOMAIN_CODES.includes(domainCode as never)) {
    return { ok: false, error: 'Select where the behaviour occurred.' }
  }
  if (
    explanation.length < NOMINATION_EXPLANATION_MIN_LENGTH ||
    explanation.length > RECOGNITION_NOTE_MAX_LENGTH
  ) {
    return {
      ok: false,
      error: `A nomination explanation between ${NOMINATION_EXPLANATION_MIN_LENGTH} and ${RECOGNITION_NOTE_MAX_LENGTH} characters is required.`,
    }
  }
  if (witnessInformation && witnessInformation.length > RECOGNITION_NOTE_MAX_LENGTH) {
    return { ok: false, error: `Witness information cannot exceed ${RECOGNITION_NOTE_MAX_LENGTH} characters.` }
  }
  if (!observedAt) return { ok: false, error: 'Enter a valid observation date and time.' }
  if (!idempotencyKey) return { ok: false, error: 'A valid submission identifier is required.' }

  return {
    ok: true,
    value: {
      studentId,
      recognitionDefinitionCode,
      domainCode,
      explanation,
      witnessInformation,
      observedAt,
      idempotencyKey,
    },
  }
}

export function noteMeetsDefinitionRequirement(points: number, note: string) {
  const trimmed = note.trim()
  if (trimmed.length > RECOGNITION_NOTE_MAX_LENGTH) return false
  return points !== 20 || trimmed.length >= DIRECT_NOTE_MIN_LENGTH
}

export function recognitionErrorMessage(message: string | undefined) {
  if (!message) return 'Unable to submit this recognition.'
  const known = [
    'Select at least one student.',
    'Select the behaviour you observed.',
    'Select where the behaviour occurred.',
    'This recognition requires a short note describing what happened.',
    'Exceptional recognition must be submitted as a nomination.',
    'You do not have permission to award points.',
    'This award has already been submitted.',
    'The selected recognition is no longer active. Refresh and choose another.',
    'The point value is assigned automatically and cannot be changed.',
  ]
  return known.find((candidate) => message.includes(candidate)) ?? message.replace(/^.*?:\s*/, '')
}
