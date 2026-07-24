'use client'

import { useEffect, useState } from 'react'
import { AdminOverviewDashboard } from '@/components/admin/AdminOverviewDashboard'
import { LoadingState } from '@/components/ui/LoadingState'
import { useAuth } from '@/app/providers'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const supabase = createSupabaseBrowserClient()

export function HouseMentorDashboard() {
  const { user } = useAuth()
  const [assignedHouse, setAssignedHouse] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    async function loadHouse() {
      const { data } = await supabase
        .from('profiles')
        .select('assigned_house')
        .eq('id', userId)
        .maybeSingle()
      setAssignedHouse(data?.assigned_house ?? null)
      setLoading(false)
    }

    loadHouse()
  }, [user])

  if (loading) {
    return (
      <main className="page">
        <LoadingState label="Loading house formation data..." />
      </main>
    )
  }

  if (!assignedHouse) {
    return (
      <main className="page">
        <div className="card">
          <p className="eyebrow">House Mentor</p>
          <h1 style={{ marginTop: 6 }}>No house assigned</h1>
          <p className="muted">
            Your account has the House Mentor role but no house has been assigned yet.
            Ask an administrator to set your assigned house in user settings.
          </p>
        </div>
      </main>
    )
  }

  return (
    <AdminOverviewDashboard
      title={`${assignedHouse} — Formation overview`}
      lockedHouse={assignedHouse}
    />
  )
}
