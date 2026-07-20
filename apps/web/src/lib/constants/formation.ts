export const APP_NAME = 'League of Stars'
export const SCHOOL_NAME = 'Brighter Horizon Academy'

export const R_VALUES = [
  { key: 'righteousness', name: 'Righteousness' },
  { key: 'responsibility', name: 'Responsibility' },
  { key: 'respect', name: 'Respect' },
] as const

export const BHA_DOMAINS = [
  { key: 'washrooms', name: 'Washrooms' },
  { key: 'hallways_transition', name: 'Hallways and Transition' },
  { key: 'prayer_space', name: 'Prayer Space' },
  { key: 'classrooms', name: 'Classrooms' },
  { key: 'lunch_recess', name: 'Lunch/Recess' },
] as const

export const POINT_VALUES = [
  { value: 5, label: '+5', description: 'Expected positive behaviour' },
  { value: 10, label: '+10', description: 'Strong positive behaviour' },
  { value: 20, label: '+20', description: 'Significant character moment' },
  { value: 50, label: '+50', description: 'Exceptional moral courage' },
] as const

export const VISIBILITY_OPTIONS = [
  {
    key: 'staff_only',
    label: 'Staff only',
    description: 'Internal recognition record only.',
    studentVisible: false,
    parentVisible: false,
  },
  {
    key: 'student',
    label: 'Visible to student',
    description: 'Student can see the note in My Growth.',
    studentVisible: true,
    parentVisible: false,
  },
  {
    key: 'parent',
    label: 'Visible to parent',
    description: 'Parent can see the note in their child view.',
    studentVisible: false,
    parentVisible: true,
  },
  {
    key: 'student_parent',
    label: 'Student + parent',
    description: 'Student and parent can both see the note.',
    studentVisible: true,
    parentVisible: true,
  },
] as const

export type VisibilityKey = (typeof VISIBILITY_OPTIONS)[number]['key']

export const HOUSE_NAMES = [
  'House of Abu Bakr',
  'House of Khadijah',
  'House of Umar',
  'House of Aishah',
] as const

export const HOUSE_COLORS: Record<string, string> = {
  'House of Abu Bakr': '#6b2090',
  'House of Khadijah': '#1a4f35',
  'House of Umar': '#1a3070',
  'House of Aishah': '#8f1c1c',
}

export const SCHOOL_CREST = '/logos/crest.png'

export const HOUSE_LOGOS: Record<string, string> = {
  'House of Abu Bakr': '/logos/abu-bakr.png',
  'House of Khadijah': '/logos/khadijah.png',
  'House of Umar': '/logos/umar.png',
  'House of Aishah': '/logos/aishah.png',
}

export function visibilityBooleans(visibility: VisibilityKey) {
  const match = VISIBILITY_OPTIONS.find((option) => option.key === visibility)
  return {
    studentVisible: match?.studentVisible ?? false,
    parentVisible: match?.parentVisible ?? false,
  }
}
