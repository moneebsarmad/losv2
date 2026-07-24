'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Award,
  BarChart3,
  ClipboardPlus,
  FileClock,
  Home,
  LogOut,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  UsersRound,
} from 'lucide-react'
import { useAuth } from '@/app/providers'
import { APP_NAME, SCHOOL_CREST, SCHOOL_NAME } from '@/lib/constants/formation'
import { navigationByRole, type NavigationIcon } from '@/lib/auth/navigation'
import type { PortalRole } from '@/types'

type AppShellProps = {
  role: PortalRole
  userName: string
  children: ReactNode
}

const navigationIcons: Record<NavigationIcon, ReactNode> = {
  home: <Home size={18} />,
  recognise: <ClipboardPlus size={18} />,
  students: <UsersRound size={18} />,
  houses: <Trophy size={18} />,
  settings: <Settings size={18} />,
  growth: <UserRound size={18} />,
  analytics: <BarChart3 size={18} />,
  admin: <ShieldCheck size={18} />,
  honours: <Award size={18} />,
  audit: <FileClock size={18} />,
  users: <Users size={18} />,
}

const roleLabels: Record<string, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  house_mentor: 'House Mentor',
  staff: 'Staff',
  student: 'Student',
  parent: 'Parent',
}

export function AppShell({ role, userName, children }: AppShellProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { signOut } = useAuth()
  const nav = navigationByRole[role]

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
            <span className="header-role">{roleLabels[role] ?? role}</span>
          </div>
          <button className="btn btn-header-signout" type="button" onClick={handleSignOut}>
            <LogOut size={15} />
            Sign out
          </button>
        </div>
      </header>

      <div className="shell-body">
        <nav className="icon-rail" aria-label="Primary navigation">
          {nav.map((item, index) => {
            const active =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const isLast = index === nav.length - 1
            return (
              <Link
                className={`nav-item ${active ? 'active' : ''}`}
                href={item.href}
                key={item.href}
                style={isLast ? { marginTop: 'auto' } : undefined}
                aria-label={item.label}
              >
                {navigationIcons[item.icon]}
                <span className="nav-tooltip">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="main-area">
          {children}
        </div>
      </div>
    </div>
  )
}
