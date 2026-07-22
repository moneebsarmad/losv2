'use client'

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, ChevronRight, CircleSlash, Download, Filter, Search, X } from 'lucide-react'
import { EmptyState } from '@/components/ui/EmptyState'
import { LoadingState } from '@/components/ui/LoadingState'
import { HOUSE_NAMES } from '@/lib/constants/formation'

type Candidate = {
  id: string
  rank: number | null
  studentName: string
  grade: number | null
  section: string | null
  division: string
  house: string
  totalScore: number
  eligible: boolean
  eligibilityReasons: string[]
  fairnessFlags: string[]
  rsRepresented: number
  domainsRepresented: number
  configuredDomainCount: number
  distinctStaff: number
  activeWeeks: number
  eligibleWeeks: number
  consistency: number
  staffConcentration: number
  significantEvents: number
  reviewStatus: string
}

type OverviewReference = {
  periods: Array<{ id: string; name: string; status: string; recipient_limit_per_award: number }>
  period: { id: string; name: string; status: string; recipient_limit_per_award: number } | null
  definitions: Array<{ id: string; code: string; name: string }>
  permissions: { canExport: boolean; canFinalise: boolean }
}

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function QuarterlyHonoursCandidates() {
  const searchParams = useSearchParams()
  const [reference, setReference] = useState<OverviewReference | null>(null)
  const [candidates, setCandidates] = useState<Candidate[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [decisionWorking, setDecisionWorking] = useState(false)
  const [noRecipientReason, setNoRecipientReason] = useState('')
  const [noRecipientSlot, setNoRecipientSlot] = useState('1')
  const noRecipientDialog = useRef<HTMLDialogElement>(null)
  const initial = {
    periodId: searchParams.get('periodId') ?? '',
    award: searchParams.get('award') ?? 'north_star',
    grade: '',
    division: '',
    house: '',
    eligibleOnly: true,
    reviewStatus: '',
    search: '',
    sort: 'total_score',
    direction: 'desc',
  }
  const [filters, setFilters] = useState(initial)
  const [applied, setApplied] = useState(initial)

  useEffect(() => {
    async function loadReference() {
      const params = new URLSearchParams()
      if (initial.periodId) params.set('periodId', initial.periodId)
      const response = await fetch(`/api/admin/quarterly-honours?${params}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Unable to load award periods.')
        return
      }
      setReference(data)
      const periodId = initial.periodId || data.period?.id || ''
      setFilters((current) => current.periodId === periodId ? current : { ...current, periodId })
      setApplied((current) => current.periodId === periodId ? current : { ...current, periodId })
    }
    void loadReference()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const query = useMemo(() => {
    const params = new URLSearchParams({
      periodId: applied.periodId,
      award: applied.award,
      eligible: applied.eligibleOnly ? 'eligible' : 'all',
      sort: applied.sort,
      direction: applied.direction,
    })
    ;(['grade', 'division', 'house', 'reviewStatus', 'search'] as const).forEach((key) => {
      if (applied[key]) params.set(key, String(applied[key]))
    })
    return params
  }, [applied])

  useEffect(() => {
    if (!applied.periodId || !applied.award) return
    async function loadCandidates() {
      setCandidates(null)
      const response = await fetch(`/api/admin/quarterly-honours/candidates?${query}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Unable to load candidates.')
        return
      }
      setError(null)
      setCandidates(data.candidates ?? [])
    }
    void loadCandidates()
  }, [applied.award, applied.periodId, query])

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApplied(filters)
  }

  async function recordNoRecipient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const awardDefinitionId = reference?.definitions.find((definition) => definition.code === applied.award)?.id
    if (!awardDefinitionId || !applied.periodId || !noRecipientReason.trim()) return
    setDecisionWorking(true)
    const response = await fetch('/api/admin/quarterly-honours/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'no_recipient',
        periodId: applied.periodId,
        awardDefinitionId,
        reason: noRecipientReason,
        recipientSlot: Number(noRecipientSlot),
      }),
    })
    const data = await response.json().catch(() => ({}))
    setDecisionWorking(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to record the no-recipient decision.')
      return
    }
    noRecipientDialog.current?.close()
    window.location.assign('/dashboard/admin/quarterly-honours')
  }

  const awardName = reference?.definitions.find((definition) => definition.code === applied.award)?.name
  const selectedPeriod = reference?.periods.find((period) => period.id === applied.periodId) ?? reference?.period

  return (
    <main className="page honours-page">
      <header className="page-header honours-candidate-header">
        <div>
          <Link className="back-link" href="/dashboard/admin/quarterly-honours"><ArrowLeft size={16} /> Quarterly Honours</Link>
          <p className="eyebrow">Candidate review</p>
          <h1 className="page-title">{awardName ?? 'Award candidates'}</h1>
          <p className="page-subtitle">{selectedPeriod?.name ?? 'Quarterly award period'}</p>
        </div>
        <div className="toolbar">
          {reference?.permissions.canFinalise && selectedPeriod?.status === 'review_open' ? <button className="btn btn-soft" type="button" onClick={() => noRecipientDialog.current?.showModal()}><CircleSlash size={17} /> No recipient</button> : null}
          {reference?.permissions.canExport && applied.periodId ? (
            <a className="btn btn-soft" href={`/api/admin/quarterly-honours/export?periodId=${applied.periodId}&award=${applied.award}`}>
              <Download size={17} /> Export
            </a>
          ) : null}
        </div>
      </header>

      <form className="honours-filter-panel" onSubmit={apply}>
        <div className="honours-filter-title"><Filter size={16} /><strong>Filters</strong></div>
        <div className="filter-grid">
          <label className="field"><span>Period</span><select className="select" value={filters.periodId} onChange={(event) => setFilters({ ...filters, periodId: event.target.value })}>{reference?.periods.map((period) => <option key={period.id} value={period.id}>{period.name}</option>)}</select></label>
          <label className="field"><span>Award</span><select className="select" value={filters.award} onChange={(event) => setFilters({ ...filters, award: event.target.value })}>{reference?.definitions.map((definition) => <option key={definition.id} value={definition.code}>{definition.name}</option>)}</select></label>
          <label className="field"><span>Grade</span><select className="select" value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value })}><option value="">All grades</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((grade) => <option key={grade} value={grade}>Grade {grade}</option>)}</select></label>
          <label className="field"><span>Division</span><select className="select" value={filters.division} onChange={(event) => setFilters({ ...filters, division: event.target.value })}><option value="">All divisions</option><option value="middle_school">Middle School</option><option value="high_school">High School</option></select></label>
          <label className="field"><span>House</span><select className="select" value={filters.house} onChange={(event) => setFilters({ ...filters, house: event.target.value })}><option value="">All houses</option>{HOUSE_NAMES.map((house) => <option key={house} value={house}>{house}</option>)}</select></label>
          <label className="field"><span>Review status</span><select className="select" value={filters.reviewStatus} onChange={(event) => setFilters({ ...filters, reviewStatus: event.target.value })}><option value="">All statuses</option><option value="unreviewed">Unreviewed</option><option value="shortlisted">Shortlisted</option><option value="dismissed">Dismissed</option><option value="selected">Selected</option></select></label>
          <label className="field"><span>Sort</span><select className="select" value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="total_score">Total score</option><option value="weekly_consistency">Weekly consistency</option><option value="domain_breadth">Domain breadth</option><option value="staff_breadth">Staff breadth</option><option value="growth">Growth</option><option value="student_name">Student name</option><option value="grade">Grade</option></select></label>
          <label className="field"><span>Direction</span><select className="select" value={filters.direction} onChange={(event) => setFilters({ ...filters, direction: event.target.value })}><option value="desc">Highest first</option><option value="asc">Lowest first</option></select></label>
          <label className="field honours-search-field"><span>Student</span><div className="input-with-icon"><Search size={15} /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Search student" /></div></label>
          <label className="honours-checkbox"><input type="checkbox" checked={filters.eligibleOnly} onChange={(event) => setFilters({ ...filters, eligibleOnly: event.target.checked })} /><span>Eligible only</span></label>
          <button className="btn btn-primary" type="submit">Apply filters</button>
        </div>
      </form>

      {error ? <div className="error honours-error">{error}</div> : null}
      {!candidates ? <LoadingState label="Loading candidate snapshot..." /> : candidates.length === 0 ? (
        <EmptyState title="No candidates match these filters" message="Eligibility thresholds remain unchanged." />
      ) : (
        <section className="honours-table-section">
          <div className="honours-table-heading"><div><span className="eyebrow">Current snapshot</span><h2>{candidates.length} candidates</h2></div><span className="muted">Scores are cohort-normalised</span></div>
          <div className="table-wrap">
            <table className="data-table honours-candidate-table">
              <thead><tr><th>Rank</th><th>Student</th><th>Grade</th><th>Division</th><th>House</th><th>Score</th><th>Eligibility</th><th>Rs</th><th>Domains</th><th>Staff</th><th>Active weeks</th><th>Staff concentration</th><th>Significant</th><th>Review</th><th><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>{candidates.map((candidate) => (
                <tr key={candidate.id}>
                  <td><span className="rank-badge">{candidate.rank ?? '-'}</span></td>
                  <td><strong>{candidate.studentName}</strong>{candidate.section ? <small className="table-subtext">Section {candidate.section}</small> : null}</td>
                  <td>{candidate.grade ?? '-'}</td>
                  <td>{candidate.division}</td>
                  <td>{candidate.house}</td>
                  <td><strong className="score-value">{candidate.totalScore.toFixed(1)}</strong></td>
                  <td><span className={`status-chip ${candidate.eligible ? 'status-finalised' : 'status-not_issued'}`}>{candidate.eligible ? 'Eligible' : 'Ineligible'}</span></td>
                  <td>{candidate.rsRepresented} / 3</td>
                  <td>{candidate.domainsRepresented} / {candidate.configuredDomainCount || '-'}</td>
                  <td>{candidate.distinctStaff}</td>
                  <td>{candidate.activeWeeks} / {candidate.eligibleWeeks}</td>
                  <td>{Math.round(candidate.staffConcentration * 100)}%</td>
                  <td>{candidate.significantEvents}</td>
                  <td><span className="status-chip">{label(candidate.reviewStatus)}</span></td>
                  <td><Link className="icon-button table-action" href={`/dashboard/admin/quarterly-honours/candidates/${candidate.id}`} title="Open candidate detail" aria-label={`Open ${candidate.studentName} candidate detail`}><ChevronRight size={18} /></Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </section>
      )}

      <dialog className="honours-dialog honours-decision-dialog" ref={noRecipientDialog}>
        <form onSubmit={recordNoRecipient}>
          <header><div><p className="eyebrow">Final decision</p><h2>Leave this award unissued</h2></div><button className="icon-button" type="button" title="Close" aria-label="Close" onClick={() => noRecipientDialog.current?.close()}><X size={18} /></button></header>
          <p className="muted">Eligibility thresholds will remain unchanged and the decision will be retained in the audit history.</p>
          {(selectedPeriod?.recipient_limit_per_award ?? 1) > 1 ? <label className="field"><span>Recipient slot</span><select className="select" value={noRecipientSlot} onChange={(event) => setNoRecipientSlot(event.target.value)}>{Array.from({ length: selectedPeriod?.recipient_limit_per_award ?? 1 }, (_, index) => <option key={index + 1} value={index + 1}>Slot {index + 1}</option>)}</select></label> : null}
          <label className="field"><span>Reason</span><textarea className="textarea" required value={noRecipientReason} onChange={(event) => setNoRecipientReason(event.target.value)} /></label>
          <footer className="toolbar"><button className="btn btn-soft" type="button" onClick={() => noRecipientDialog.current?.close()}>Cancel</button><button className="btn btn-danger" type="submit" disabled={decisionWorking || !noRecipientReason.trim()}>Record no recipient</button></footer>
        </form>
      </dialog>
    </main>
  )
}
