'use client'

import { useEffect, useState } from 'react'
import { AdminOverviewDashboard } from '@/components/admin/AdminOverviewDashboard'
import { SuperAdminDashboard } from '@/components/admin/SuperAdminDashboard'
import { ParentDashboard } from '@/components/parent/ParentDashboard'
import { HouseMentorDashboard } from '@/components/staff/HouseMentorDashboard'
import { StaffDashboard } from '@/components/staff/StaffDashboard'
import { StudentGrowthDashboard } from '@/components/student/StudentGrowthDashboard'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/app/providers'
import { toPortalRole } from '@/lib/auth/roles'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { PortalRole } from '@/types'

const supabase = createSupabaseBrowserClient()

export default function DashboardPage() {
  const { user } = useAuth()
  const userId = user?.id
  const [role, setRole] = useState<PortalRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    let cancelled = false

    async function loadRole() {
      setLoading(true)
      const { data } = await supabase.from('profiles').select('role').eq('id', userId).maybeSingle()

      if (cancelled) return

      setRole(toPortalRole(String(data?.role ?? '')))
      setLoading(false)
    }

    void loadRole()

    return () => {
      cancelled = true
    }
  }, [userId])

  if (loading) {
    return (
      <main className="page">
        <LoadingState label="Routing dashboard..." />
      </main>
    )
  }

  if (role === 'super_admin') return <SuperAdminDashboard />
  if (role === 'admin') return <AdminOverviewDashboard />
  if (role === 'house_mentor') return <HouseMentorDashboard />
  if (role === 'student') return <StudentGrowthDashboard />
  if (role === 'parent') return <ParentDashboard />
  return <StaffDashboard />
}
