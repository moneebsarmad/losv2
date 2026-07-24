import { describe, expect, it } from 'vitest'
import { navigationByRole, QUARTERLY_HONOURS_ROUTE } from '../../lib/auth/navigation'
import { ADMIN_ROLES, STAFF_ROLES, toPortalRole } from '../../lib/auth/roles'

describe('Quarterly Star Honours navigation RBAC', () => {
  it('shows the navigation route only in the admin portal', () => {
    expect(navigationByRole.admin.map((item) => item.href)).toContain(QUARTERLY_HONOURS_ROUTE)
    expect(navigationByRole.staff.map((item) => item.href)).not.toContain(QUARTERLY_HONOURS_ROUTE)
    expect(navigationByRole.student.map((item) => item.href)).not.toContain(QUARTERLY_HONOURS_ROUTE)
    expect(navigationByRole.parent.map((item) => item.href)).not.toContain(QUARTERLY_HONOURS_ROUTE)
  })

  it('maps only the three authorised database roles to the admin portal', () => {
    expect(ADMIN_ROLES).toEqual(['super_admin', 'admin', 'tarbiyah_leadership'])
    // Super admins retain their distinct portal so the shell can expose
    // super-admin-only controls; the other two governance roles use admin.
    expect(toPortalRole('super_admin')).toBe('super_admin')
    ;(['admin', 'tarbiyah_leadership'] as const).forEach((role) => expect(toPortalRole(role)).toBe('admin'))
    expect(STAFF_ROLES).toEqual([
      'super_admin',
      'admin',
      'tarbiyah_leadership',
      'house_mentor',
      'teacher',
      'support_staff',
      'staff',
    ])
    expect(toPortalRole('house_mentor')).toBe('house_mentor')
    ;(['teacher', 'support_staff', 'staff'] as const).forEach((role) => {
      expect(toPortalRole(role)).toBe('staff')
    })
    expect(toPortalRole('student')).toBe('student')
    expect(toPortalRole('parent')).toBe('parent')
  })
})
