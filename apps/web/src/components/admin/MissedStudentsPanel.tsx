'use client'

import { useEffect, useMemo, useState } from 'react'
import { Target } from 'lucide-react'
import { LoadingState } from '@/components/ui/LoadingState'
import type { StudentSummary } from '@/types'

type MissedPayload = {
  missed: StudentSummary[]
}

function dateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export function MissedStudentsPanel() {
  const [start, setStart] = useState(dateDaysAgo(14))
  const [end, setEnd] = useState(new Date().toISOString().slice(0, 10))
  const [payload, setPayload] = useState<MissedPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    if (start) params.set('start', start)
    if (end) params.set('end', end)
    return params.toString()
  }, [end, start])

  useEffect(() => {
    async function loadMissed() {
      const response = await fetch(`/api/admin/missed-students?${query}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Unable to load missed students.')
        return
      }
      setPayload(data)
    }

    loadMissed()
  }, [query])

  return (
    <section className="card">
      <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <p className="eyebrow">Notice Gap</p>
          <h2 style={{ margin: '6px 0 0' }}>Students being missed</h2>
        </div>
        <Target size={22} color="#0f766e" />
      </div>
      <div className="filter-grid" style={{ marginBottom: 14 }}>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="missed-start">Start</label>
          <input id="missed-start" className="input" type="date" value={start} onChange={(event) => setStart(event.target.value)} />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label htmlFor="missed-end">End</label>
          <input id="missed-end" className="input" type="date" value={end} onChange={(event) => setEnd(event.target.value)} />
        </div>
      </div>
      {error ? <div className="error">{error}</div> : null}
      {!payload ? (
        <LoadingState label="Checking recognition gaps..." />
      ) : (
        <div className="list">
          {payload.missed.length === 0 ? (
            <p className="muted">No missed students in this range.</p>
          ) : (
            payload.missed.slice(0, 12).map((student) => (
              <div className="list-row" key={student.id}>
                <div>
                  <strong>{student.student_name}</strong>
                  <div className="muted">
                    Grade {student.grade ?? '-'}
                    {student.section ?? ''} · {student.house}
                  </div>
                </div>
                <span className="pill">0</span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  )
}
