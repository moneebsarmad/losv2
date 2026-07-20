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
    { label: 'Dashboard', href: '/dashboard', icon: <Home size={18} /> },
    { label: 'Recognise', href: '/dashboard/recognize', icon: <ClipboardPlus size={18} /> },
    { label: 'Students', href: '/dashboard/students', icon: <UsersRound size={18} /> },
    { label: 'Houses', href: '/dashboard/houses', icon: <Trophy size={18} /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={18} /> },
  ],
  student: [
    { label: 'My Growth', href: '/dashboard/my-growth', icon: <UserRound size={18} /> },
    { label: 'My House', href: '/dashboard/my-house', icon: <Trophy size={18} /> },
    { label: 'Houses', href: '/dashboard/houses', icon: <BarChart3 size={18} /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={18} /> },
  ],
  parent: [
    { label: 'Child View', href: '/dashboard/parent', icon: <UserRound size={18} /> },
    { label: 'Houses', href: '/dashboard/houses', icon: <Trophy size={18} /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={18} /> },
  ],
  admin: [
    { label: 'Tarbiyah', href: '/dashboard', icon: <ShieldCheck size={18} /> },
    { label: 'Recognise', href: '/dashboard/recognize', icon: <ClipboardPlus size={18} /> },
    { label: 'Students', href: '/dashboard/students', icon: <UsersRound size={18} /> },
    { label: 'Houses', href: '/dashboard/houses', icon: <Trophy size={18} /> },
    { label: 'Reports', href: '/dashboard/admin/reports', icon: <BarChart3 size={18} /> },
    { label: 'Audit', href: '/dashboard/admin/audit', icon: <FileClock size={18} /> },
    { label: 'Settings', href: '/dashboard/settings', icon: <Settings size={18} /> },
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
      <aside className="sidebar">
        <div className="brand-lockup">
          <div className="brand-mark">
            <img src={SCHOOL_CREST} alt="" />
          </div>
          <div>
            <p className="eyebrow">{SCHOOL_NAME}</p>
            <strong>{APP_NAME}</strong>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary navigation">
          {nav.map((item) => {
            const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            return (
              <Link className={`nav-item ${active ? 'active' : ''}`} href={item.href} key={item.href}>
                {item.icon}
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
        <div style={{ marginTop: 'auto' }}>
          <p className="sidebar-tagline">
            3Rs power recognition. Houses power belonging.
          </p>
        </div>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div>
            <strong>{userName}</strong>
            <div className="muted" style={{ fontSize: 13, textTransform: 'capitalize' }}>{role}</div>
          </div>
          <button className="btn btn-soft" type="button" onClick={handleSignOut}>
            <LogOut size={17} />
            Sign out
          </button>
        </header>
        {children}
      </div>
    </div>
  )
}
