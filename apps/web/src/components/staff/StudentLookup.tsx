'use client'

import { useEffect, useState } from 'react'
import { Search } from 'lucide-react'
import type { StudentSummary } from '@/types'

export function StudentLookup() {
  const [query, setQuery] = useState('')
  const [students, setStudents] = useState<StudentSummary[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (query.trim().length < 2) {
      setStudents([])
      return
    }

    const timeout = setTimeout(async () => {
      const response = await fetch(`/api/students/search?q=${encodeURIComponent(query.trim())}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Unable to search students.')
        return
      }
      setError(null)
      setStudents(data.students ?? [])
    }, 160)

    return () => clearTimeout(timeout)
  }, [query])

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Roster</p>
          <h1 className="page-title">Student lookup</h1>
          <p className="page-subtitle">Find students by name before logging recognition or reviewing context.</p>
        </div>
      </header>

      <section className="card">
        <div className="field" style={{ marginTop: 0 }}>
          <label htmlFor="student-lookup">Search student</label>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: 12, top: 13, color: '#697386' }} />
            <input
              id="student-lookup"
              className="input"
              style={{ paddingLeft: 40 }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Type at least two letters"
            />
          </div>
        </div>
        {error ? <div className="error">{error}</div> : null}
        <div className="list">
          {students.length === 0 ? (
            <p className="muted">Search results will appear here.</p>
          ) : (
            students.map((student) => (
              <div className="list-row" key={student.id}>
                <div>
                  <strong>{student.student_name}</strong>
                  <div className="muted">
                    Grade {student.grade ?? '-'}
                    {student.section ?? ''} · {student.house}
                  </div>
                </div>
                <span className="pill">{student.student_id ?? 'Roster'}</span>
              </div>
            ))
          )}
        </div>
      </section>
    </main>
  )
}
