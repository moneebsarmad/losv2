'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/app/providers'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

const supabase = createSupabaseBrowserClient()

type Profile = {
  role?: string | null
  full_name?: string | null
  name?: string | null
  staff_name?: string | null
  student_name?: string | null
  email?: string | null
}

export function SettingsPanel() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!user?.id) return
    const userId = user.id

    async function loadProfile() {
      const { data } = await supabase
        .from('profiles')
        .select('role, full_name, name, staff_name, student_name, email')
        .eq('id', userId)
        .maybeSingle()
      setProfile(data)
    }

    loadProfile()
  }, [user])

  const displayName = profile?.full_name ?? profile?.name ?? profile?.staff_name ?? profile?.student_name ?? user?.email ?? 'User'

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1 className="page-title">Account</h1>
          <p className="page-subtitle">Account identity and role are managed by BHA administration.</p>
        </div>
      </header>

      <section className="grid grid-2">
        <div className="card">
          <p className="eyebrow">Profile</p>
          <h2 style={{ marginTop: 6 }}>{displayName}</h2>
          <p className="muted">{profile?.email ?? user?.email}</p>
          <span className="pill" style={{ textTransform: 'capitalize' }}>{profile?.role ?? 'Role pending'}</span>
        </div>
        <div className="card">
          <p className="eyebrow">Visibility</p>
          <h2 style={{ marginTop: 6 }}>Recognition privacy</h2>
          <p className="muted">
            Staff choose whether each recognition note is staff-only, student-visible, parent-visible, or visible to both.
          </p>
        </div>
      </section>
    </main>
  )
}
