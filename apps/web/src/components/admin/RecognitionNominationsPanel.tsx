'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Clock3, RefreshCw, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/dashboard/aggregations'

type NominationRow = {
  id: string
  explanation: string
  witness_information: string | null
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn'
  observed_at: string
  created_at: string
  review_note: string | null
  approved_award_id: string | null
  nominator_name: string
  reviewer_name: string | null
  student: {
    student_name: string
    grade: number | null
    section: string | null
    house: string
  } | null
  definition: {
    code: string
    label: string
    fixed_points: number
    r_values: { key: string; name: string } | null
  } | null
  domain: { key: string; name: string } | null
  related_nominations: Array<{ id: string; status: string; created_at: string }>
  status_history: Array<{ id: string; action: string; created_at: string }>
}

const STATUS_OPTIONS = ['pending', 'approved', 'rejected', 'withdrawn', 'all'] as const

export function RecognitionNominationsPanel() {
  const [status, setStatus] = useState<(typeof STATUS_OPTIONS)[number]>('pending')
  const [rows, setRows] = useState<NominationRow[] | null>(null)
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setRows(null)
    const response = await fetch(`/api/admin/recognition-nominations?status=${status}`)
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) setError(payload.error ?? 'Unable to load nominations.')
    else {
      setRows(payload.nominations ?? [])
      setError(null)
    }
  }, [status])

  useEffect(() => {
    load()
  }, [load])

  async function review(id: string, decision: 'approved' | 'rejected') {
    const reviewNote = reviewNotes[id]?.trim() ?? ''
    if (decision === 'rejected' && reviewNote.length < 5) {
      setError('Add a brief review note before rejecting a nomination.')
      return
    }
    setSaving(id)
    setError(null)
    const response = await fetch('/api/admin/recognition-nominations', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        nomination_id: id,
        decision,
        review_note: reviewNote || null,
      }),
    })
    const payload = await response.json().catch(() => ({}))
    setSaving(null)
    if (!response.ok) {
      setError(payload.error ?? 'Unable to review this nomination.')
      return
    }
    await load()
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Recognition governance</p>
          <h1 className="page-title">Exceptional nominations</h1>
          <p className="page-subtitle">
            Review exceptional +50 recognition. Pending nominations never affect student or House totals.
          </p>
        </div>
        <button className="btn btn-soft" type="button" onClick={load}>
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      <div className="segmented governance-status-filter" aria-label="Nomination status">
        {STATUS_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`choice ${status === option ? 'active' : ''}`}
            aria-pressed={status === option}
            onClick={() => setStatus(option)}
          >
            <strong>{option.charAt(0).toUpperCase() + option.slice(1)}</strong>
          </button>
        ))}
      </div>

      {error ? <div className="error" role="alert">{error}</div> : null}
      {!rows ? (
        <div className="card">Loading nominations…</div>
      ) : rows.length === 0 ? (
        <div className="card">
          <Clock3 size={22} />
          <h2>No {status === 'all' ? '' : status} nominations</h2>
          <p className="muted">Nominations will appear here with their explanation and review history.</p>
        </div>
      ) : (
        <div className="grid">
          {rows.map((row) => (
            <article className="card nomination-review-card" key={row.id}>
              <div className="nomination-card-heading">
                <div>
                  <span className={`status-badge status-${row.status}`}>{row.status}</span>
                  <h2>{row.student?.student_name ?? 'Student'}</h2>
                  <p className="muted">
                    Grade {row.student?.grade ?? '—'}
                    {row.student?.section ? ` ${row.student.section}` : ''} · {row.student?.house ?? 'House'}
                  </p>
                </div>
                <span className="pill">+{row.definition?.fixed_points ?? 50}</span>
              </div>

              <dl className="review-grid">
                <div>
                  <dt>3R</dt>
                  <dd>{row.definition?.r_values?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt>Exceptional behaviour</dt>
                  <dd>{row.definition?.label ?? '—'}</dd>
                </div>
                <div>
                  <dt>Domain</dt>
                  <dd>{row.domain?.name ?? '—'}</dd>
                </div>
                <div>
                  <dt>Nominating staff</dt>
                  <dd>{row.nominator_name}</dd>
                </div>
                <div>
                  <dt>Observed</dt>
                  <dd>{formatDate(row.observed_at)}</dd>
                </div>
                <div>
                  <dt>Submitted</dt>
                  <dd>{formatDate(row.created_at)}</dd>
                </div>
                <div className="review-note">
                  <dt>Explanation</dt>
                  <dd>{row.explanation}</dd>
                </div>
                <div className="review-note">
                  <dt>Witness information</dt>
                  <dd>{row.witness_information || 'None provided'}</dd>
                </div>
              </dl>

              <details>
                <summary>
                  Related and status history ({row.related_nominations.length} related · {row.status_history.length} events)
                </summary>
                <div className="nomination-history">
                  {row.related_nominations.length ? (
                    <div>
                      <strong>Previous related nominations</strong>
                      {row.related_nominations.map((related) => (
                        <p key={related.id} className="muted">
                          {formatDate(related.created_at)} · {related.status}
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="muted">No previous related nominations.</p>
                  )}
                  <div>
                    <strong>Status history</strong>
                    {row.status_history.map((entry) => (
                      <p key={entry.id} className="muted">
                        {formatDate(entry.created_at)} · {entry.action.replaceAll('_', ' ')}
                      </p>
                    ))}
                  </div>
                </div>
              </details>

              {row.status === 'pending' ? (
                <div className="nomination-review-actions">
                  <div className="field">
                    <label htmlFor={`review-note-${row.id}`}>Review note</label>
                    <textarea
                      id={`review-note-${row.id}`}
                      className="textarea"
                      maxLength={500}
                      value={reviewNotes[row.id] ?? ''}
                      onChange={(event) =>
                        setReviewNotes((current) => ({ ...current, [row.id]: event.target.value }))
                      }
                      placeholder="Required for rejection; optional for approval."
                    />
                  </div>
                  <div className="toolbar">
                    <button
                      type="button"
                      className="btn btn-gold"
                      disabled={saving === row.id}
                      onClick={() => review(row.id, 'approved')}
                    >
                      <CheckCircle2 size={18} />
                      Approve +50
                    </button>
                    <button
                      type="button"
                      className="btn btn-soft"
                      disabled={saving === row.id}
                      onClick={() => review(row.id, 'rejected')}
                    >
                      <XCircle size={18} />
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <p className="muted">
                  Reviewed by {row.reviewer_name ?? 'an administrator'}
                  {row.review_note ? ` · ${row.review_note}` : ''}
                  {row.approved_award_id ? ` · Award ${row.approved_award_id}` : ''}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

