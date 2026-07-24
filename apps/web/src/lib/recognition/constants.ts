export const RECOGNITION_FRAMEWORK_VERSION = 'recognition_v2'
export const RECOGNITION_POINT_TIERS = [5, 10, 20, 50] as const
export const CANONICAL_DOMAIN_CODES = [
  'prayer_space',
  'hallways_transitions',
  'classroom_learning',
  'lunch_recess',
  'bathrooms',
] as const

export const R_VALUE_CODES = ['righteousness', 'responsibility', 'respect'] as const
export const GRADUATE_VALUE_CODES = ['ihsan', 'sidq', 'sabr', 'khilafah', 'tawadu', 'adl'] as const

export const DIRECT_NOTE_MIN_LENGTH = 15
export const NOMINATION_EXPLANATION_MIN_LENGTH = 20
export const RECOGNITION_NOTE_MAX_LENGTH = 500
export const MAX_BULK_STUDENTS = 100

export type CanonicalDomainCode = (typeof CANONICAL_DOMAIN_CODES)[number]
export type RValueCode = (typeof R_VALUE_CODES)[number]
export type GraduateValueCode = (typeof GRADUATE_VALUE_CODES)[number]
export type RecognitionPointTier = (typeof RECOGNITION_POINT_TIERS)[number]

