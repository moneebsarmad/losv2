'use client'

import { useEffect, useState } from 'react'
import { LoadingState } from '@/components/ui/LoadingState'
import { formatDate } from '@/lib/dashboard/aggregations'

type AuditLog = {
  id: string
  user_id: string | null
  action: string
  table_name: string | null
  record_id: string | null
  created_at: string
}

export function AuditLogTable() {
  const [rows, setRows] = useState<AuditLog[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadAudit() {
      const response = await fetch('/api/admin/audit')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Unable to load audit trail.')
        return
      }
      setRows(data.auditLogs ?? [])
    }

    loadAudit()
  }, [])

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1 className="page-title">Audit trail</h1>
          <p className="page-subtitle">Recent tracked actions in the League of Stars system.</p>
        </div>
      </header>

      {error ? <div className="error">{error}</div> : null}
      {!rows ? (
        <LoadingState label="Loading audit trail..." />
      ) : (
        <section className="card">
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Action</th>
                  <th>Table</th>
                  <th>Record</th>
                  <th>User</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={5}>No audit entries yet.</td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.created_at)}</td>
                      <td>{row.action}</td>
                      <td>{row.table_name ?? '-'}</td>
                      <td>{row.record_id ?? '-'}</td>
                      <td>{row.user_id ?? '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  )
}
