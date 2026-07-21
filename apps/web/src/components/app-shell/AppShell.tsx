'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  BarChart3,
  ClipboardPlus,
  FileClock,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { APP_NAME, SCHOOL_CREST, SCHOOL_NAME } from '@/lib/constants/formation'
import type { PortalRole } from '@/types'

type AppShellProps = {
  role: PortalRole
  userName: string
  children: ReactNode
}

const navByRole: Record<PortalRole, Array<{ label: string; href: string; icon: ReactNode }>> = {
  staff: [
    { label: 'Dashboard', href: '/dashboard', icon: <Home size={16} /> },
    { label: 'Recognise', href: '/dashboard/recognize', icon: <ClipboardPlus size={16} /> },
    { label: 'Students', href: '/dashboard/students', icon: <UsersRound size={16} /> },
    { label: 'Houses', href: '/dashboard/houses', icon: <Trophy size={16} /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={16} /> },
  ],
  student: [
    { label: 'My Growth', href: '/dashboard/my-growth', icon: <UserRound size={16} /> },
    { label: 'My House', href: '/dashboard/my-house', icon: <Trophy size={16} /> },
    { label: 'Houses', href: '/dashboard/houses', icon: <BarChart3 size={16} /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={16} /> },
  ],
  parent: [
    { label: 'Child View', href: '/dashboard/parent', icon: <UserRound size={16} /> },
    { label: 'Houses', href: '/dashboard/houses', icon: <Trophy size={16} /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={16} /> },
  ],
  admin: [
    { label: 'Tarbiyah', href: '/dashboard', icon: <ShieldCheck size={16} /> },
    { label: 'Recognise', href: '/dashboard/recognize', icon: <ClipboardPlus size={16} /> },
    { label: 'Students', href: '/dashboard/students', icon: <UsersRound size={16} /> },
    { label: 'Houses', href: '/dashboard/houses', icon: <Trophy size={16} /> },
    { label: 'Reports', href: '/dashboard/admin/reports', icon: <BarChart3 size={16} /> },
    { label: 'Audit', href: '/dashboard/admin/audit', icon: <FileClock size={16} /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={16} /> },
  ],
}

export function AppShell({ role, userName, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const nav = navByRole[role]

  async function handleSignOut() {
    await signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-lockup">
          <div className="brand-mark">
            <img src={SCHOOL_CREST} alt="" />
          </div>
          <div>
            <p className="eyebrow header-eyebrow">{SCHOOL_NAME}</p>
            <strong className="header-app-name">{APP_NAME}</strong>
          </div>
        </div>
        <div className="header-right">
          <div className="header-user">
            <strong>{userName}</strong>
            <span className="header-role">{role}</span>
          </div>
          <button className="btn btn-header-signout" type="button" onClick={handleSignOut}>
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      <nav className="nav-strip" aria-label="Primary navigation">
        {nav.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link className={`nav-item ${active ? 'active' : ''}`} href={item.href} key={item.href}>
              {item.icon}
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="main-area">
        {children}
      </div>
    </div>
  )
}
