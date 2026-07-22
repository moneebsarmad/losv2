'use client'

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Anchor,
  Award,
  CalendarDays,
  CheckCircle2,
  Compass,
  Handshake,
  Plus,
  Pencil,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  TrendingUp,
  X,
} from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { MetricCard } from '@/components/ui/MetricCard'

type Definition = {
  id: string
  code: string
  name: string
  short_description: string
  detailed_description: string
  display_order: number
}

type Period = {
  id: string
  code: string
  name: string
  starts_on: string
  ends_on: string
  status: string
  recipient_limit_per_award: number
  review_opens_at: string | null
  baseline_period_id: string | null
}

type CandidatePreview = {
  id: string
  student_name: string
  grade: number | null
  total_score: number | string
  rank_in_school: number | null
  review_status: string
}

type Recipient = {
  id: string
  status: string
  public_citation: string | null
  students?: { student_name: string; grade: number | null } | null
}

type OverviewPayload = {
  periods: Period[]
  period: Period | null
  definitions: Definition[]
  awards: Array<{
    definition: Definition
    eligibleCount: number
    candidates: CandidatePreview[]
    recipient: Recipient | null
    recipientCount: number
  }>
  latestRun: {
    id: string
    status: string
    completed_at: string | null
    created_at: string
    source_record_count: number
    candidate_count: number
    error_message: string | null
  } | null
  recentRuns?: Array<{
    id: string
    trigger_type: string
    status: string
    algorithm_version: string
    source_record_count: number
    candidate_count: number
    completed_at: string | null
    created_at: string
    error_message: string | null
  }>
  notifications: Array<{
    id: string
    title: string
    message: string
    created_at: string
    read_at: string | null
  }>
  summary?: {
    eligibleStudentCount: number
    awardsFinalised: number
    awardsRequiringReview: number
  }
  permissions: {
    canRefresh: boolean
    canReview: boolean
    canFinalise: boolean
    canConfigure: boolean
    canReopen: boolean
    canRevoke: boolean
    canExport: boolean
    canViewDiagnostics: boolean
  }
}

const awardIcons: Record<string, typeof Award> = {
  north_star: Compass,
  righteousness_beacon: ShieldCheck,
  responsibility_anchor: Anchor,
  respect_ambassador: Handshake,
  rising_star: TrendingUp,
  steadfast_star: CheckCircle2,
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`))
}

function daysRemaining(endsOn: string) {
  const today = new Date()
  const current = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())
  const end = Date.parse(`${endsOn}T00:00:00.000Z`)
  return Math.ceil((end - current) / 86_400_000)
}

function statusLabel(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function QuarterlyHonoursOverview() {
  const [payload, setPayload] = useState<OverviewPayload | null>(null)
  const [periodId, setPeriodId] = useState('')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const createDialog = useRef<HTMLDialogElement>(null)
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null)
  const reopenDialog = useRef<HTMLDialogElement>(null)
  const [reopenReason, setReopenReason] = useState('')
  const [periodForm, setPeriodForm] = useState({
    code: '',
    name: '',
    startsOn: '',
    endsOn: '',
    reviewOpensAt: '',
    baselinePeriodId: '',
    recipientLimit: '1',
  })

  const load = useCallback(async (selectedPeriodId = periodId) => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedPeriodId) params.set('periodId', selectedPeriodId)
    const response = await fetch(`/api/admin/quarterly-honours?${params}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.error ?? 'Unable to load Quarterly Star Honours.')
      setLoading(false)
      return
    }
    setPayload(data)
    setPeriodId(data.period?.id ?? '')
    setError(null)
    setLoading(false)
  }, [periodId])

  useEffect(() => {
    void load('')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function refreshScores() {
    if (!payload?.period) return
    setWorking(true)
    const response = await fetch('/api/admin/quarterly-honours/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ periodId: payload.period.id }),
    })
    const data = await response.json().catch(() => ({}))
    setWorking(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to refresh scores.')
      return
    }
    await load(payload.period.id)
  }

  function openCreatePeriod() {
    setEditingPeriodId(null)
    setPeriodForm({ code: '', name: '', startsOn: '', endsOn: '', reviewOpensAt: '', baselinePeriodId: '', recipientLimit: '1' })
    createDialog.current?.showModal()
  }

  function openEditPeriod(period: Period) {
    setEditingPeriodId(period.id)
    setPeriodForm({
      code: period.code,
      name: period.name,
      startsOn: period.starts_on,
      endsOn: period.ends_on,
      reviewOpensAt: period.review_opens_at ? new Date(period.review_opens_at).toISOString().slice(0, 16) : '',
      baselinePeriodId: period.baseline_period_id ?? '',
      recipientLimit: String(period.recipient_limit_per_award),
    })
    createDialog.current?.showModal()
  }

  async function savePeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWorking(true)
    const response = await fetch('/api/admin/quarterly-honours', {
      method: editingPeriodId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...periodForm, periodId: editingPeriodId }),
    })
    const data = await response.json().catch(() => ({}))
    setWorking(false)
    if (!response.ok) {
      setError(data.error ?? `Unable to ${editingPeriodId ? 'update' : 'create'} award period.`)
      return
    }
    createDialog.current?.close()
    await load(data.period.id)
  }

  async function dismissNotification(notificationId: string) {
    await fetch('/api/admin/quarterly-honours/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notificationId, dismiss: true }),
    })
    setPayload((current) =>
      current
        ? { ...current, notifications: current.notifications.filter((item) => item.id !== notificationId) }
        : current
    )
  }

  async function reopenPeriod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!payload?.period || !reopenReason.trim()) return
    setWorking(true)
    const response = await fetch('/api/admin/quarterly-honours/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reopen', periodId: payload.period.id, reason: reopenReason }),
    })
    const data = await response.json().catch(() => ({}))
    setWorking(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to reopen the award period.')
      return
    }
    reopenDialog.current?.close()
    setReopenReason('')
    await load(payload.period.id)
  }

  if (loading && !payload) {
    return <main className="page"><LoadingState label="Loading Quarterly Star Honours..." /></main>
  }

  const period = payload?.period ?? null
  const remaining = period ? daysRemaining(period.ends_on) : null
  const calculationStatus = payload?.latestRun?.status
    ? statusLabel(payload.latestRun.status)
    : 'Not calculated'

  return (
    <main className="page honours-page">
      <header className="page-header honours-page-header">
        <div>
          <p className="eyebrow">Admin / Quarterly Honours</p>
          <h1 className="page-title">Quarterly Star Honours</h1>
          {period ? (
            <p className="page-subtitle">
              {period.name} &middot; {formatDate(period.starts_on)} to {formatDate(period.ends_on)}
            </p>
          ) : null}
        </div>
        <div className="toolbar honours-toolbar">
          {payload?.periods.length ? (
            <select
              aria-label="Award period"
              className="select honours-period-select"
              value={periodId}
              onChange={(event) => {
                setPeriodId(event.target.value)
                void load(event.target.value)
              }}
            >
              {payload.periods.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          ) : null}
          {payload?.permissions.canConfigure ? (
            <><Link className="btn btn-soft" href="/dashboard/admin/quarterly-honours/configuration"><SlidersHorizontal size={17} /> Configure</Link>{period?.status === 'upcoming' ? <button className="btn btn-soft" type="button" onClick={() => openEditPeriod(period)}><Pencil size={17} /> Edit period</button> : null}<button className="btn btn-soft" type="button" onClick={openCreatePeriod}><Plus size={17} /> Period</button></>
          ) : null}
          {period && payload?.permissions.canRefresh && !['finalised', 'archived'].includes(period.status) ? (
            <button className="btn btn-primary" type="button" disabled={working} onClick={refreshScores}>
              <RefreshCw size={17} className={working ? 'spin' : ''} />
              {working ? 'Refreshing' : 'Refresh scores'}
            </button>
          ) : null}
          {period?.status === 'finalised' && payload?.permissions.canReopen ? (
            <button className="btn btn-soft" type="button" onClick={() => reopenDialog.current?.showModal()}>
              <RotateCcw size={17} /> Reopen period
            </button>
          ) : null}
        </div>
      </header>

      {error ? <div className="error honours-error">{error}</div> : null}

      {payload?.notifications.map((notification) => (
        <div className="honours-notification" key={notification.id}>
          <CalendarDays size={19} />
          <div><strong>{notification.title}</strong><p>{notification.message}</p></div>
          <button
            className="icon-button"
            type="button"
            title="Dismiss notification"
            aria-label="Dismiss notification"
            onClick={() => dismissNotification(notification.id)}
          ><X size={17} /></button>
        </div>
      ))}

      {!period ? (
        <EmptyState
          title="No quarterly award period configured"
          message={payload?.permissions.canConfigure ? 'Create the first period to begin calculation.' : 'A super administrator must configure the award period.'}
        />
      ) : (
        <>
          <section className="grid grid-4 honours-metrics" aria-label="Period status">
            <MetricCard label="Period status" value={statusLabel(period.status)} />
            <MetricCard label="Days remaining" value={remaining !== null && remaining >= 0 ? remaining : 'Ended'} />
            <MetricCard label="Eligible students" value={payload?.summary?.eligibleStudentCount ?? 0} helper="Across all six honours" />
            <MetricCard label="Finalised" value={`${payload?.summary?.awardsFinalised ?? 0} / 6`} helper={`${payload?.summary?.awardsRequiringReview ?? 6} decisions remain`} />
          </section>

          <section className={`honours-health ${payload?.latestRun?.status === 'failed' ? 'is-error' : ''}`}>
            <div>
              <span className="honours-health-label">Calculation health</span>
              <strong>{calculationStatus}</strong>
            </div>
            <div>
              <span className="honours-health-label">Last refresh</span>
              <strong>{payload?.latestRun?.completed_at ? new Date(payload.latestRun.completed_at).toLocaleString() : 'No completed run'}</strong>
            </div>
            <div>
              <span className="honours-health-label">Source records</span>
              <strong>{payload?.latestRun?.source_record_count ?? 0}</strong>
            </div>
            {payload?.latestRun?.error_message ? <p>{payload.latestRun.error_message}</p> : null}
          </section>

          {payload?.permissions.canViewDiagnostics && payload.recentRuns?.length ? (
            <section className="honours-table-section">
              <div className="honours-table-heading"><div><span className="eyebrow">Super admin</span><h2>Calculation runs</h2></div><span className="muted">Versioned technical history</span></div>
              <div className="table-wrap"><table className="data-table"><thead><tr><th>Started</th><th>Trigger</th><th>Status</th><th>Version</th><th>Source records</th><th>Eligible candidates</th><th>Error</th></tr></thead><tbody>{payload.recentRuns.map((run) => <tr key={run.id}><td>{new Date(run.created_at).toLocaleString()}</td><td>{statusLabel(run.trigger_type)}</td><td><span className={`status-chip status-${run.status}`}>{statusLabel(run.status)}</span></td><td>{run.algorithm_version}</td><td>{run.source_record_count}</td><td>{run.candidate_count}</td><td>{run.error_message ?? '-'}</td></tr>)}</tbody></table></div>
            </section>
          ) : null}

          <section className="honours-award-grid" aria-label="Award review queues">
            {payload?.awards.map((award) => {
              const Icon = awardIcons[award.definition.code] ?? Award
              return (
                <article className="honours-award-card" key={award.definition.id}>
                  <header>
                    <div className="honours-award-icon"><Icon size={22} /></div>
                    <div>
                      <h2>{award.definition.name}</h2>
                      <p>{award.definition.short_description}</p>
                    </div>
                    <span className={`status-chip status-${award.recipient?.status ?? 'review'}`}>
                      {award.recipient ? statusLabel(award.recipient.status) : 'Review'}
                    </span>
                  </header>

                  {award.recipient ? (
                    <div className="honours-recipient">
                      <span>{award.recipient.status === 'not_issued' ? 'No recipient issued' : 'Selected recipient'}</span>
                      <strong>{award.recipient.students?.student_name ?? 'Decision recorded'}</strong>
                      {award.recipientCount > 1 ? <small>{award.recipientCount} decisions recorded</small> : null}
                    </div>
                  ) : (
                    <div className="honours-preview-list">
                      {award.candidates.length ? award.candidates.map((candidate) => (
                        <Link
                          href={`/dashboard/admin/quarterly-honours/candidates/${candidate.id}`}
                          className="honours-preview-row"
                          key={candidate.id}
                        >
                          <span className="rank-badge">{candidate.rank_in_school ?? '-'}</span>
                          <span><strong>{candidate.student_name}</strong><small>Grade {candidate.grade ?? '-'}</small></span>
                          <b>{Number(candidate.total_score).toFixed(1)}</b>
                        </Link>
                      )) : <p className="muted honours-empty-copy">No eligible candidates in the current snapshot.</p>}
                    </div>
                  )}

                  <footer>
                    <span><strong>{award.eligibleCount}</strong> eligible</span>
                    <Link
                      className="btn btn-soft"
                      href={`/dashboard/admin/quarterly-honours/candidates?periodId=${period.id}&award=${award.definition.code}`}
                    >
                      Open candidates
                    </Link>
                  </footer>
                </article>
              )
            })}
          </section>
        </>
      )}

      <dialog className="honours-dialog" ref={createDialog}>
        <form onSubmit={savePeriod}>
          <header><div><p className="eyebrow">Configuration</p><h2>{editingPeriodId ? 'Edit award period' : 'New award period'}</h2></div><button className="icon-button" type="button" aria-label="Close" title="Close" onClick={() => createDialog.current?.close()}><X size={18} /></button></header>
          <div className="grid grid-2">
            <label className="field"><span>Code</span><input className="input" required value={periodForm.code} onChange={(event) => setPeriodForm({ ...periodForm, code: event.target.value })} placeholder="Q1-2026" /></label>
            <label className="field"><span>Name</span><input className="input" required value={periodForm.name} onChange={(event) => setPeriodForm({ ...periodForm, name: event.target.value })} placeholder="Quarter 1, 2026-27" /></label>
            <label className="field"><span>Starts</span><input className="input" type="date" required value={periodForm.startsOn} onChange={(event) => setPeriodForm({ ...periodForm, startsOn: event.target.value })} /></label>
            <label className="field"><span>Ends</span><input className="input" type="date" required value={periodForm.endsOn} onChange={(event) => setPeriodForm({ ...periodForm, endsOn: event.target.value })} /></label>
            <label className="field"><span>Review opens</span><input className="input" type="datetime-local" value={periodForm.reviewOpensAt} onChange={(event) => setPeriodForm({ ...periodForm, reviewOpensAt: event.target.value })} /></label>
            <label className="field"><span>Recipient limit per award</span><input className="input" type="number" min="1" max="20" value={periodForm.recipientLimit} onChange={(event) => setPeriodForm({ ...periodForm, recipientLimit: event.target.value })} /></label>
            <label className="field span-2"><span>Rising Star baseline period</span><select className="select" value={periodForm.baselinePeriodId} onChange={(event) => setPeriodForm({ ...periodForm, baselinePeriodId: event.target.value })}><option value="">Use previous completed period automatically</option>{payload?.periods.filter((item) => item.id !== editingPeriodId && ['finalised', 'archived'].includes(item.status)).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          </div>
          <footer className="toolbar"><button className="btn btn-soft" type="button" onClick={() => createDialog.current?.close()}>Cancel</button><button className="btn btn-primary" disabled={working} type="submit">{editingPeriodId ? 'Save period' : 'Create period'}</button></footer>
        </form>
      </dialog>

      <dialog className="honours-dialog honours-decision-dialog" ref={reopenDialog}>
        <form onSubmit={reopenPeriod}>
          <header><div><p className="eyebrow">Super admin</p><h2>Reopen award period</h2></div><button className="icon-button" type="button" aria-label="Close" title="Close" onClick={() => reopenDialog.current?.close()}><X size={18} /></button></header>
          <p className="muted">The final candidate snapshots remain frozen. Reopening restores the review workflow so corrections can be audited.</p>
          <label className="field"><span>Reason</span><textarea className="textarea" required value={reopenReason} onChange={(event) => setReopenReason(event.target.value)} /></label>
          <footer className="toolbar"><button className="btn btn-soft" type="button" onClick={() => reopenDialog.current?.close()}>Cancel</button><button className="btn btn-primary" type="submit" disabled={working || !reopenReason.trim()}>Reopen period</button></footer>
        </form>
      </dialog>
    </main>
  )
}
