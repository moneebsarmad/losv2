import type { PortalRole } from '../../types'

export const QUARTERLY_HONOURS_ROUTE = '/dashboard/admin/quarterly-honours'

export type NavigationIcon =
  | 'home'
  | 'recognise'
  | 'students'
  | 'houses'
  | 'settings'
  | 'growth'
  | 'analytics'
  | 'admin'
  | 'honours'
  | 'audit'
  | 'users'

export const navigationByRole: Record<
  PortalRole,
  Array<{ label: string; href: string; icon: NavigationIcon }>
> = {
  super_admin: [
    { label: 'Tarbiyah', href: '/dashboard', icon: 'admin' },
    { label: 'Recognise', href: '/dashboard/recognize', icon: 'recognise' },
    { label: 'Students', href: '/dashboard/students', icon: 'students' },
    { label: 'Houses', href: '/dashboard/houses', icon: 'houses' },
    { label: 'Reports', href: '/dashboard/admin/reports', icon: 'analytics' },
    { label: 'Audit', href: '/dashboard/admin/audit', icon: 'audit' },
    { label: 'Users', href: '/dashboard/admin/users', icon: 'users' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
  ],
  admin: [
    { label: 'Tarbiyah', href: '/dashboard', icon: 'admin' },
    { label: 'Recognise', href: '/dashboard/recognize', icon: 'recognise' },
    { label: 'Students', href: '/dashboard/students', icon: 'students' },
    { label: 'Houses', href: '/dashboard/houses', icon: 'houses' },
    { label: 'Quarterly Honours', href: QUARTERLY_HONOURS_ROUTE, icon: 'honours' },
    { label: 'Reports', href: '/dashboard/admin/reports', icon: 'analytics' },
    { label: 'Audit', href: '/dashboard/admin/audit', icon: 'audit' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
  ],
  house_mentor: [
    { label: 'My House', href: '/dashboard', icon: 'houses' },
    { label: 'Recognise', href: '/dashboard/recognize', icon: 'recognise' },
    { label: 'Students', href: '/dashboard/students', icon: 'students' },
    { label: 'Houses', href: '/dashboard/houses', icon: 'analytics' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
  ],
  staff: [
    { label: 'Dashboard', href: '/dashboard', icon: 'home' },
    { label: 'Recognise', href: '/dashboard/recognize', icon: 'recognise' },
    { label: 'Students', href: '/dashboard/students', icon: 'students' },
    { label: 'Houses', href: '/dashboard/houses', icon: 'houses' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
  ],
  student: [
    { label: 'My Growth', href: '/dashboard/my-growth', icon: 'growth' },
    { label: 'My House', href: '/dashboard/my-house', icon: 'houses' },
    { label: 'Houses', href: '/dashboard/houses', icon: 'analytics' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
  ],
  parent: [
    { label: 'Child View', href: '/dashboard/parent', icon: 'growth' },
    { label: 'Houses', href: '/dashboard/houses', icon: 'houses' },
    { label: 'Settings', href: '/dashboard/settings', icon: 'settings' },
  ],
}
