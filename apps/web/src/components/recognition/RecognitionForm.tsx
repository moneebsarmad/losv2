'use client'

import { useEffect, useMemo, useState } from 'react'
import { CheckCircle2, Search, Send } from 'lucide-react'
import { VISIBILITY_OPTIONS } from '@/lib/constants/formation'
import type { VisibilityKey } from '@/lib/constants/formation'
import type { PointValueRow, ReferenceRow, StudentSummary } from '@/types'

type ReferencePayload = {
  rValues: ReferenceRow[]
  domains: ReferenceRow[]
  pointValues: PointValueRow[]
}

export function RecognitionForm() {
  const [references, setReferences] = useState<ReferencePayload>({ rValues: [], domains: [], pointValues: [] })
  const [studentQuery, setStudentQuery] = useState('')
  const [studentResults, setStudentResults] = useState<StudentSummary[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentSummary | null>(null)
  const [rValueId, setRValueId] = useState('')
  const [domainId, setDomainId] = useState('')
  const [pointValue, setPointValue] = useState<number | ''>('')
  const [behaviourNote, setBehaviourNote] = useState('')
  const [visibility, setVisibility] = useState<VisibilityKey>('student_parent')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    async function loadReferences() {
      const response = await fetch('/api/reference')
      const payload = await response.json()
      setReferences({
        rValues: payload.rValues ?? [],
        domains: payload.domains ?? [],
        pointValues: payload.pointValues ?? [],
      })
    }

    loadReferences()
  }, [])

  useEffect(() => {
    if (selectedStudent || studentQuery.trim().length < 2) {
      setStudentResults([])
      return
    }

    const timeout = setTimeout(async () => {
      const response = await fetch(`/api/students/search?q=${encodeURIComponent(studentQuery.trim())}`)
      const payload = await response.json()
      setStudentResults(payload.students ?? [])
    }, 180)

    return () => clearTimeout(timeout)
  }, [selectedStudent, studentQuery])

  const canSubmit = useMemo(
    () => Boolean(selectedStudent && rValueId && domainId && pointValue && behaviourNote.trim() && visibility),
    [behaviourNote, domainId, pointValue, rValueId, selectedStudent, visibility]
  )

  async function submit() {
    if (!canSubmit || !selectedStudent || !pointValue) return
    setSaving(true)
    setError(null)
    setSuccess(null)

    const response = await fetch('/api/recognitions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        studentId: selectedStudent.id,
        rValueId,
        domainId,
        pointValue,
        behaviourNote,
        visibility,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    setSaving(false)

    if (!response.ok) {
      setError(payload.error ?? 'Failed to submit recognition.')
      return
    }

    setSuccess(`Recognition submitted for ${selectedStudent.student_name}.`)
    setStudentQuery('')
    setSelectedStudent(null)
    setRValueId('')
    setDomainId('')
    setPointValue('')
    setBehaviourNote('')
    setVisibility('student_parent')
  }

  return (
    <div className="grid" style={{ maxWidth: 980 }}>
      {success ? (
        <div className="card" style={{ borderColor: 'rgba(15,118,110,.25)', background: '#ecfdf7' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', color: '#0f766e', fontWeight: 800 }}>
            <CheckCircle2 size={20} />
            {success}
          </div>
        </div>
      ) : null}
      {error ? <div className="error">{error}</div> : null}

      <section className="card">
        <p className="eyebrow">Step 1</p>
        <h2 style={{ marginTop: 6 }}>Student</h2>
        {selectedStudent ? (
          <div className="list-row">
            <div>
              <strong>{selectedStudent.student_name}</strong>
              <div className="muted">
                Grade {selectedStudent.grade ?? '-'}
                {selectedStudent.section ?? ''} · {selectedStudent.house}
              </div>
            </div>
            <button className="btn btn-soft" type="button" onClick={() => setSelectedStudent(null)}>
              Change
            </button>
          </div>
        ) : (
          <>
            <div className="field">
              <label htmlFor="student-search">Search student</label>
              <div style={{ position: 'relative' }}>
                <Search size={18} style={{ position: 'absolute', left: 12, top: 13, color: '#697386' }} />
                <input
                  id="student-search"
                  className="input"
                  style={{ paddingLeft: 40 }}
                  value={studentQuery}
                  onChange={(event) => setStudentQuery(event.target.value)}
                  placeholder="Type a student name"
                />
              </div>
            </div>
            {studentResults.length > 0 ? (
              <div className="list">
                {studentResults.map((student) => (
                  <button
                    key={student.id}
                    type="button"
                    className="list-row"
                    onClick={() => {
                      setSelectedStudent(student)
                      setStudentQuery(student.student_name)
                    }}
                  >
                    <div style={{ textAlign: 'left' }}>
                      <strong>{student.student_name}</strong>
                      <div className="muted">
                        Grade {student.grade ?? '-'}
                        {student.section ?? ''} · {student.house}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}
      </section>

      <section className="card">
        <p className="eyebrow">Step 2</p>
        <h2 style={{ marginTop: 6 }}>3R</h2>
        <div className="segmented">
          {references.rValues.map((item) => (
            <button
              className={`choice ${rValueId === item.id ? 'active' : ''}`}
              type="button"
              key={item.id}
              onClick={() => setRValueId(item.id)}
            >
              <strong>{item.name}</strong>
              {item.description ? <div className="muted">{item.description}</div> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Step 3</p>
        <h2 style={{ marginTop: 6 }}>Domain</h2>
        <div className="segmented">
          {references.domains.map((item) => (
            <button
              className={`choice ${domainId === item.id ? 'active' : ''}`}
              type="button"
              key={item.id}
              onClick={() => setDomainId(item.id)}
            >
              <strong>{item.name}</strong>
              {item.description ? <div className="muted">{item.description}</div> : null}
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Step 4</p>
        <h2 style={{ marginTop: 6 }}>Point Value</h2>
        <div className="segmented">
          {references.pointValues.map((item) => (
            <button
              className={`choice ${pointValue === item.value ? 'active' : ''}`}
              type="button"
              key={item.value}
              onClick={() => setPointValue(item.value)}
            >
              <strong>{item.label}</strong>
              <div className="muted">{item.description}</div>
            </button>
          ))}
        </div>
      </section>

      <section className="card">
        <p className="eyebrow">Step 5</p>
        <h2 style={{ marginTop: 6 }}>Behaviour Note</h2>
        <textarea
          className="textarea"
          value={behaviourNote}
          onChange={(event) => setBehaviourNote(event.target.value)}
          placeholder="Describe the specific behaviour you observed."
        />
      </section>

      <section className="card">
        <p className="eyebrow">Step 6</p>
        <h2 style={{ marginTop: 6 }}>Visibility</h2>
        <div className="segmented">
          {VISIBILITY_OPTIONS.map((item) => (
            <button
              className={`choice ${visibility === item.key ? 'active' : ''}`}
              type="button"
              key={item.key}
              onClick={() => setVisibility(item.key)}
            >
              <strong>{item.label}</strong>
              <div className="muted">{item.description}</div>
            </button>
          ))}
        </div>
      </section>

      <button className="btn btn-gold full" type="button" disabled={!canSubmit || saving} onClick={submit}>
        {saving ? 'Submitting...' : 'Submit recognition'}
        <Send size={18} />
      </button>
    </div>
  )
}
