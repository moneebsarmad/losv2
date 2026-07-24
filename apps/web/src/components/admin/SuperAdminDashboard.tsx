'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { AdminOverviewDashboard } from '@/components/admin/AdminOverviewDashboard'

export function SuperAdminDashboard() {
  return (
    <>
      <div className="super-admin-banner">
        <Users size={16} />
        <span>
          You are signed in as <strong>Super Admin</strong> — full system access.{' '}
          <Link href="/dashboard/admin/users">Manage users →</Link>
        </span>
      </div>
      <AdminOverviewDashboard />
    </>
  )
}
