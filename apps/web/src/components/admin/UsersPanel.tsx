'use client'

import { useEffect, useState } from 'react'
import { HOUSE_NAMES } from '@/lib/constants/formation'

type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  staff_name: string | null
  student_name: string | null
  role: string | null
  assigned_house: string | null
}

export function UsersPanel() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/admin/users')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Unable to load users.')
      } else {
        setUsers(data.users ?? [])
      }
      setLoading(false)
    }
    load()
  }, [])

  async function updateUser(id: string, patch: { role?: string; assigned_house?: string | null }) {
    setSaving(id)
    const response = await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await response.json().catch(() => ({}))
    if (response.ok) {
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)))
    } else {
      setError(data.error ?? 'Update failed.')
    }
    setSaving(null)
  }

  const displayName = (u: UserRow) =>
    u.full_name ?? u.staff_name ?? u.student_name ?? u.email ?? u.id

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">System Admin</p>
          <h1 className="page-title">Users</h1>
          <p className="page-subtitle">Manage roles and house assignments for all school accounts.</p>
        </div>
      </header>

      {error && <div className="error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading ? (
        <p className="muted">Loading users…</p>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Assigned house</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ opacity: saving === u.id ? 0.5 : 1 }}>
                    <td><strong>{displayName(u)}</strong></td>
                    <td className="muted">{u.email ?? '—'}</td>
                    <td>
                      <select
                        className="select"
                        style={{ minWidth: 160 }}
                        value={u.role ?? ''}
                        disabled={saving === u.id}
                        onChange={(e) => updateUser(u.id, { role: e.target.value })}
                      >
                        <option value="">— unset —</option>
                        <option value="super_admin">Super Admin</option>
                        <option value="admin">Admin</option>
                        <option value="house_mentor">House Mentor</option>
                        <option value="staff">Staff</option>
                        <option value="student">Student</option>
                        <option value="parent">Parent</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="select"
                        style={{ minWidth: 180 }}
                        value={u.assigned_house ?? ''}
                        disabled={saving === u.id}
                        onChange={(e) =>
                          updateUser(u.id, { assigned_house: e.target.value || null })
                        }
                      >
                        <option value="">— none —</option>
                        {HOUSE_NAMES.map((h) => (
                          <option key={h} value={h}>{h}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  )
}
