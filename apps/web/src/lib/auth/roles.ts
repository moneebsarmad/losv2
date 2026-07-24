import type { AppRole, PortalRole } from '@/types'

export const ADMIN_ROLES: AppRole[] = ['super_admin', 'admin', 'tarbiyah_leadership']
export const STAFF_ROLES: AppRole[] = [
  'super_admin',
  'admin',
  'tarbiyah_leadership',
  'house_mentor',
  'teacher',
  'support_staff',
  'staff',
]

export function toPortalRole(role: string | null | undefined): PortalRole | null {
  if (!role) return null
  if (role === 'super_admin') return 'super_admin'
  if (role === 'student') return 'student'
  if (role === 'parent') return 'parent'
  if (role === 'house_mentor') return 'house_mentor'
  if (ADMIN_ROLES.includes(role as AppRole)) return 'admin'
  if (STAFF_ROLES.includes(role as AppRole)) return 'staff'
  return null
}

export function canRecognize(role: string | null | undefined) {
  return Boolean(role && STAFF_ROLES.includes(role as AppRole))
}

export function isAdminRole(role: string | null | undefined) {
  return Boolean(role && ADMIN_ROLES.includes(role as AppRole))
}
