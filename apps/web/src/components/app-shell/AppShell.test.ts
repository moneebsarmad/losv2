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
    ADMIN_ROLES.forEach((role) => expect(toPortalRole(role)).toBe('admin'))
    ;['house_mentor', 'teacher', 'support_staff', 'staff'].forEach((role) => {
      expect(STAFF_ROLES).toContain(role)
      expect(toPortalRole(role)).toBe('staff')
    })
    expect(toPortalRole('student')).toBe('student')
    expect(toPortalRole('parent')).toBe('parent')
  })
})
