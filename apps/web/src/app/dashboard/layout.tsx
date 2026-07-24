'use client'

import type { ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../providers'
import { AppShell } from '@/components/app-shell/AppShell'
import { LoadingState } from '@/components/ui/LoadingState'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { toPortalRole } from '@/lib/auth/roles'
import type { PortalRole } from '@/types'

const supabase = createSupabaseBrowserClient()

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const userId = user?.id
  const userEmail = user?.email
  const [role, setRole] = useState<PortalRole | null>(null)
  const [displayName, setDisplayName] = useState('User')
  const [profileLoading, setProfileLoading] = useState(true)
  const loadedProfileUserId = useRef<string | null>(null)

  useEffect(() => {
    if (!loading && !userId) router.replace('/')
  }, [loading, router, userId])

  useEffect(() => {
    if (!userId) return

    const profileUserId = userId
    let cancelled = false

    async function loadProfile() {
      if (loadedProfileUserId.current !== profileUserId) setProfileLoading(true)

      const { data } = await supabase
        .from('profiles')
        .select('role, full_name, name, staff_name, student_name, email')
        .eq('id', profileUserId)
        .maybeSingle()

      if (cancelled) return

      const nextRole = toPortalRole(String(data?.role ?? ''))
      setRole(nextRole)

      const fallback = userEmail?.split('@')[0]?.replace(/[._-]+/g, ' ') || 'User'
      setDisplayName(
        String(data?.full_name ?? data?.name ?? data?.staff_name ?? data?.student_name ?? fallback)
          .trim()
          .replace(/\b\w/g, (letter) => letter.toUpperCase())
      )
      loadedProfileUserId.current = profileUserId
      setProfileLoading(false)
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [userEmail, userId])

  if (loading || profileLoading) {
    return (
      <main className="page">
        <LoadingState label="Loading League of Stars..." />
      </main>
    )
  }

  if (!user) return null

  if (!role) {
    return (
      <main className="page">
        <div className="card">
          <h1>Profile role not found</h1>
          <p className="muted">Please contact an administrator to finish setting up your account.</p>
        </div>
      </main>
    )
  }

  return (
    <AppShell role={role} userName={displayName}>
      {children}
    </AppShell>
  )
}
