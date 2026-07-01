'use client'

import { useEffect, useState } from 'react'
import { AdminOverviewDashboard } from '@/components/admin/AdminOverviewDashboard'
import { ParentDashboard } from '@/components/parent/ParentDashboard'
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
  const [role, setRole] = useState<PortalRole | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    async function loadRole() {
      const { data } = await supabase.from('profiles').select('role').eq('id', user?.id).maybeSingle()
      setRole(toPortalRole(String(data?.role ?? '')))
      setLoading(false)
    }

    loadRole()
  }, [user])

  if (loading) {
    return (
      <main className="page">
        <LoadingState label="Routing dashboard..." />
      </main>
    )
  }

  if (role === 'admin') return <AdminOverviewDashboard />
  if (role === 'student') return <StudentGrowthDashboard />
  if (role === 'parent') return <ParentDashboard />
  return <StaffDashboard />
}
