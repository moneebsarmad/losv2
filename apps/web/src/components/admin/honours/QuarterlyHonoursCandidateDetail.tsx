'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  CircleX,
  RotateCcw,
  Save,
  Star,
  UserCheck,
} from 'lucide-react'
import { LoadingState } from '@/components/ui/LoadingState'

type ComponentMetric = {
  label: string
  rawValue: number
  normalisedScore: number
  weight: number
  weightedContribution: number
}

type DetailPayload = {
  candidate: Record<string, any>
  review: Record<string, any> | null
  awardOverlaps: Array<Record<string, any>>
  awardRecipients: Array<Record<string, any>>
  domains: Array<{ id: string; key: string; name: string }>
  viewerRole: string
}

function relation<T>(value: T | T[] | null | undefined): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function label(value: string) {
  return value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function percentage(value: unknown) {
  const number = Number(value ?? 0)
  return `${Math.round(number <= 1 ? number * 100 : number)}%`
}

function metricNumber(value: unknown, digits = 1) {
  const number = Number(value ?? 0)
  return Number.isFinite(number) ? number.toFixed(digits) : '0.0'
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

export function QuarterlyHonoursCandidateDetail({ candidateId }: { candidateId: string }) {
  const [payload, setPayload] = useState<DetailPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [internalNotes, setInternalNotes] = useState('')
  const [citation, setCitation] = useState('')
  const [dismissalReason, setDismissalReason] = useState('')
  const [overrideReason, setOverrideReason] = useState('')
  const [revocationReason, setRevocationReason] = useState('')
  const [recipientSlot, setRecipientSlot] = useState('1')

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/quarterly-honours/candidates/${candidateId}`)
    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      setError(data.error ?? 'Unable to load candidate evidence.')
      return
    }
    setPayload(data)
    setInternalNotes(data.review?.internal_notes ?? '')
    setCitation(data.review?.public_citation_draft ?? '')
    setDismissalReason(data.review?.dismissal_reason ?? '')
    const periodRelation = relation<Record<string, any>>(data.candidate?.quarterly_award_periods)
    const limit = Number(periodRelation?.recipient_limit_per_award ?? 1)
    const ownRecipient = (data.awardRecipients ?? []).find(
      (item: Record<string, any>) => item.student_id === data.candidate?.student_id
    )
    const occupiedSlots = new Set((data.awardRecipients ?? []).map((item: Record<string, any>) => Number(item.recipient_slot)))
    const firstOpenSlot = Array.from({ length: limit }, (_, index) => index + 1).find((slot) => !occupiedSlots.has(slot)) ?? 1
    setRecipientSlot(String(ownRecipient?.recipient_slot ?? firstOpenSlot))
    setError(null)
  }, [candidateId])

  useEffect(() => { void load() }, [load])

  async function updateReview(reviewStatus: string) {
    if (reviewStatus === 'dismissed' && !dismissalReason.trim()) {
      setError('A dismissal reason is required.')
      return
    }
    setWorking(true)
    const response = await fetch(`/api/admin/quarterly-honours/candidates/${candidateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reviewStatus, internalNotes, dismissalReason, publicCitationDraft: citation }),
    })
    const data = await response.json().catch(() => ({}))
    setWorking(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to update candidate review.')
      return
    }
    setNotice(`Review updated to ${label(reviewStatus)}.`)
    await load()
  }

  async function workflow(action: string, extra: Record<string, unknown>) {
    setWorking(true)
    const response = await fetch('/api/admin/quarterly-honours/workflow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...extra }),
    })
    const data = await response.json().catch(() => ({}))
    setWorking(false)
    if (!response.ok) {
      setError(data.error ?? 'Unable to complete award workflow action.')
      return
    }
    setNotice(action === 'finalise' ? 'Award finalised.' : action === 'select' ? 'Recipient selected for final review.' : 'Award record updated.')
    setError(null)
    await load()
  }

  const candidate = payload?.candidate
  const metrics = (candidate?.raw_metrics ?? {}) as Record<string, any>
  const components = (candidate?.component_scores ?? {}) as Record<string, ComponentMetric>
  const evidence = (candidate?.evidence_summary ?? {}) as Record<string, any>
  const student = relation<Record<string, any>>(candidate?.students)
  const award = relation<Record<string, any>>(candidate?.quarterly_award_definitions)
  const period = relation<Record<string, any>>(candidate?.quarterly_award_periods)
  const scoreRun = relation<Record<string, any>>(candidate?.quarterly_award_score_runs)
  const rMetrics = (metrics.recognition_events_by_r ?? {}) as Record<string, Record<string, any>>
  const weeklyCounts = (metrics.weekly_recognition_counts ?? {}) as Record<string, number>
  const staffCounts = (metrics.recognitions_by_staff_member ?? {}) as Record<string, number>
  const staffNames = (metrics.recognising_staff_names ?? {}) as Record<string, string>
  const domainCounts = (metrics.recognition_count_by_domain ?? {}) as Record<string, number>
  const currentRecipient = payload?.awardOverlaps.find((item) => item.award_definition_id === candidate?.award_definition_id)
  const otherOverlaps = payload?.awardOverlaps.filter((item) => item.award_definition_id !== candidate?.award_definition_id) ?? []
  const awardRecipients = payload?.awardRecipients ?? []
  const recipientLimit = Number(period?.recipient_limit_per_award ?? 1)
  const selectedSlotOccupant = awardRecipients.find((item) => Number(item.recipient_slot) === Number(recipientSlot))
  const selectionSnapshotId = currentRecipient?.candidate_score_id as string | undefined
  const selectionSnapshotMismatch = Boolean(selectionSnapshotId && selectionSnapshotId !== candidate?.id)
  const reviewable = ['active', 'review_open'].includes(String(period?.status))
  const finalReviewOpen = period?.status === 'review_open'
  const canOverride = payload?.viewerRole === 'super_admin'
  const maxWeekCount = Math.max(1, ...Object.values(weeklyCounts).map(Number))
  const reviewStatus = payload?.review?.review_status ?? 'unreviewed'
  const candidateListUrl = period && award
    ? `/dashboard/admin/quarterly-honours/candidates?periodId=${candidate?.award_period_id ?? ''}&award=${award.code}`
    : '/dashboard/admin/quarterly-honours'

  const rRows = useMemo<Array<Record<string, any>>>(
    () => ['righteousness', 'responsibility', 'respect'].map((key) => ({ key, ...(rMetrics[key] ?? {}) })),
    [rMetrics]
  )

  if (!payload && !error) return <main className="page"><LoadingState label="Loading candidate evidence..." /></main>
  if (!candidate || !student || !award || !period) {
    return <main className="page"><div className="error">{error ?? 'Candidate snapshot is unavailable.'}</div></main>
  }

  return (
    <main className="page honours-page honours-detail-page">
      <header className="page-header honours-detail-header">
        <div>
          <Link className="back-link" href={candidateListUrl}><ArrowLeft size={16} /> {award.name} candidates</Link>
          <p className="eyebrow">{award.name}</p>
          <h1 className="page-title">{student.student_name}</h1>
          <p className="page-subtitle">Grade {student.grade ?? '-'}{student.section ? `, Section ${student.section}` : ''} &middot; {student.house}</p>
        </div>
        <div className="honours-score-lockup">
          <span>Total score</span>
          <strong>{metricNumber(candidate.total_score)}</strong>
          <small>{candidate.eligible ? `Rank ${candidate.rank_in_school ?? '-'}` : 'Not ranked'}</small>
        </div>
      </header>

      {error ? <div className="error honours-error">{error}</div> : null}
      {notice ? <div className="honours-success"><Check size={17} />{notice}</div> : null}

      <section className="honours-summary-band">
        <div><span>Eligibility</span><strong className={candidate.eligible ? 'text-success' : 'text-danger'}>{candidate.eligible ? 'Eligible' : 'Ineligible'}</strong></div>
        <div><span>Review</span><strong>{label(reviewStatus)}</strong></div>
        <div><span>Cohort</span><strong>{candidate.normalisation_cohort?.label ?? 'School-wide'}</strong><small>{candidate.normalisation_cohort?.size ?? 0} students</small></div>
        <div><span>Algorithm</span><strong>{candidate.algorithm_version}</strong></div>
        <div><span>Calculated</span><strong>{scoreRun?.completed_at ? new Date(scoreRun.completed_at).toLocaleString() : 'Snapshot run'}</strong></div>
      </section>

      {!candidate.eligible || candidate.eligibility_reasons?.length ? (
        <section className="honours-reasons" aria-label="Eligibility reasons">
          <h2>Eligibility review</h2>
          <ul>{(candidate.eligibility_reasons ?? []).map((reason: string) => <li key={reason}>{reason}</li>)}</ul>
        </section>
      ) : null}

      {candidate.fairness_flags?.length ? (
        <section className="honours-flags" aria-label="Fairness flags">
          <div><AlertTriangle size={18} /><h2>Fairness flags</h2></div>
          <div>{candidate.fairness_flags.map((flag: string) => <span className="fairness-flag" key={flag}>{label(flag)}</span>)}</div>
        </section>
      ) : null}

      {otherOverlaps.length ? (
        <section className="honours-conflict">
          <AlertTriangle size={19} />
          <div><strong>Award overlap</strong><p>This student is already selected for {otherOverlaps.map((item) => relation<Record<string, any>>(item.quarterly_award_definitions)?.name ?? 'another honour').join(', ')}. Finalisation is blocked unless a super administrator records an override reason.</p></div>
        </section>
      ) : null}

      {selectionSnapshotMismatch ? (
        <section className="honours-conflict">
          <AlertTriangle size={19} />
          <div><strong>Frozen selection snapshot</strong><p>This recipient was selected from an earlier score run. Finalise from the frozen evidence used at selection.</p><Link className="back-link" href={`/dashboard/admin/quarterly-honours/candidates/${selectionSnapshotId}`}>Open frozen snapshot</Link></div>
        </section>
      ) : null}

      <div className="honours-detail-grid">
        <div className="honours-detail-main">
          <section className="honours-detail-section">
            <header><p className="eyebrow">Score explanation</p><h2>Component breakdown</h2></header>
            <div className="table-wrap"><table className="data-table honours-components-table"><thead><tr><th>Component</th><th>Raw value</th><th>Normalised</th><th>Weight</th><th>Contribution</th></tr></thead><tbody>{Object.entries(components).map(([key, item]) => <tr key={key}><td><strong>{item.label}</strong></td><td>{metricNumber(item.rawValue)}</td><td>{metricNumber(item.normalisedScore)}</td><td>{percentage(item.weight)}</td><td><strong>{metricNumber(item.weightedContribution)}</strong></td></tr>)}</tbody></table></div>
          </section>

          <section className="honours-detail-section">
            <header><p className="eyebrow">Framework</p><h2>3R distribution</h2></header>
            <div className="honours-r-grid">{rRows.map((row) => <div className="honours-r-row" key={row.key}><strong>{label(row.key)}</strong><span>{row.events ?? 0} events</span><span>{row.points ?? 0} points</span><span>{metricNumber(row.ratePer10Days)} / 10 days</span><div className="bar"><span style={{ width: percentage(row.eventShare) }} /></div><small>{percentage(row.eventShare)} of events</small></div>)}</div>
          </section>

          <section className="honours-detail-section">
            <header><p className="eyebrow">Settings</p><h2>Domain coverage</h2></header>
            <div className="honours-domain-list">{payload.domains.map((domain) => { const count = Number(domainCounts[domain.key] ?? 0); return <div className={count ? 'is-covered' : 'is-missing'} key={domain.id}><span>{domain.name}</span><strong>{count}</strong><small>{count ? 'recognitions' : 'missing'}</small></div> })}</div>
          </section>

          <section className="honours-detail-section">
            <header><p className="eyebrow">Consistency</p><h2>Week-by-week evidence</h2></header>
            <div className="honours-timeline">{Object.entries(weeklyCounts).sort(([left], [right]) => left.localeCompare(right)).map(([week, count]) => <div key={week}><span>{formatDate(week)}</span><div className="honours-week-track"><i style={{ width: `${(Number(count) / maxWeekCount) * 100}%` }} /></div><strong>{count}</strong></div>)}</div>
            <div className="honours-inline-metrics"><span><strong>{metrics.active_recognition_week_count ?? 0}</strong> active weeks</span><span><strong>{percentage(metrics.consistency_percentage)}</strong> consistency</span><span><strong>{metrics.longest_gap_in_eligible_weeks ?? 0}</strong> longest gap</span></div>
          </section>

          <section className="honours-detail-section">
            <header><p className="eyebrow">Observers</p><h2>Staff evidence</h2></header>
            <div className="honours-staff-list">{Object.entries(staffCounts).sort(([, left], [, right]) => Number(right) - Number(left)).map(([staffId, count]) => <div key={staffId}><span>{staffNames[staffId] ?? 'Staff member'}</span><strong>{count}</strong></div>)}</div>
            <div className="honours-inline-metrics"><span><strong>{metrics.distinct_recognising_staff_count ?? 0}</strong> staff observers</span><span><strong>{percentage(metrics.maximum_staff_concentration)}</strong> maximum concentration</span></div>
          </section>

          {award.code === 'rising_star' ? (
            <section className="honours-detail-section">
              <header><p className="eyebrow">Personal baseline</p><h2>Growth evidence</h2></header>
              <div className="honours-growth-grid"><div><span>Baseline method</span><strong>{label(metrics.baseline_method ?? 'unavailable')}</strong></div><div><span>Recognition-rate change</span><strong>{metricNumber(metrics.growth_components?.rateDelta)}</strong></div><div><span>Consistency change</span><strong>{metricNumber(metrics.growth_components?.consistencyDelta)} pts</strong></div><div><span>3R breadth change</span><strong>{metrics.growth_components?.rBreadthDelta ?? 0}</strong></div><div><span>Domain breadth change</span><strong>{metrics.growth_components?.domainBreadthDelta ?? 0}</strong></div><div><span>Positive components</span><strong>{metrics.growth_components?.positiveComponents ?? 0}</strong></div></div>
            </section>
          ) : null}

          <section className="honours-detail-section">
            <header><p className="eyebrow">Representative evidence</p><h2>Recognition narratives</h2></header>
            <div className="honours-evidence-list">{(evidence.representative_recognitions ?? []).map((item: Record<string, any>) => <article key={item.id}><div><span>{formatDate(item.date)}</span><span>{item.r}</span><span>{item.domain}</span><span>{item.points} points</span>{item.significant ? <span className="status-chip status-selected">Significant</span> : null}</div><p>{item.note}</p><small>{item.staff ?? 'Staff source unavailable'}</small></article>)}</div>
          </section>
        </div>

        <aside className="honours-review-panel">
          <div><p className="eyebrow">Human decision</p><h2>Review actions</h2></div>
          <label className="field"><span>Internal notes</span><textarea className="textarea" value={internalNotes} onChange={(event) => setInternalNotes(event.target.value)} /></label>
          <label className="field"><span>Public award citation</span><textarea className="textarea" value={citation} onChange={(event) => setCitation(event.target.value)} placeholder="Recognised for..." /></label>
          <label className="field"><span>Dismissal reason</span><textarea className="textarea" value={dismissalReason} onChange={(event) => setDismissalReason(event.target.value)} /></label>
          {canOverride && (!candidate.eligible || otherOverlaps.length > 0) ? <label className="field"><span>Super-admin override reason</span><textarea className="textarea" value={overrideReason} onChange={(event) => setOverrideReason(event.target.value)} /></label> : null}

          {!currentRecipient ? (
            <div className="honours-review-actions">
              {!reviewable ? <p className="muted">This period is closed for candidate review.</p> : null}
              {recipientLimit > 1 ? <label className="field"><span>Recipient slot</span><select className="select" value={recipientSlot} onChange={(event) => setRecipientSlot(event.target.value)}>{Array.from({ length: recipientLimit }, (_, index) => <option key={index + 1} value={index + 1}>Slot {index + 1}</option>)}</select></label> : null}
              {selectedSlotOccupant ? <div className="honours-selected-note"><AlertTriangle size={18} /><span>Slot {recipientSlot} is held by {relation<Record<string, any>>(selectedSlotOccupant.students)?.student_name ?? 'another student'} ({label(selectedSlotOccupant.status)}).</span></div> : null}
              <button className="btn btn-soft" type="button" disabled={working || !reviewable} onClick={() => updateReview('unreviewed')}><Save size={16} /> Save notes</button>
              <button className="btn btn-soft" type="button" disabled={working || !reviewable} onClick={() => updateReview('shortlisted')}><Star size={16} /> Shortlist</button>
              <button className="btn btn-danger" type="button" disabled={working || !reviewable || !dismissalReason.trim()} onClick={() => updateReview('dismissed')}><CircleX size={16} /> Dismiss</button>
              <button className="btn btn-primary" type="button" disabled={working || !reviewable || selectedSlotOccupant?.status === 'finalised' || (!candidate.eligible && (!canOverride || !overrideReason.trim()))} onClick={() => workflow('select', { candidateScoreId: candidate.id, internalSelectionNote: internalNotes, publicCitation: citation, overrideReason, recipientSlot: Number(recipientSlot) })}><UserCheck size={16} /> Select recipient</button>
            </div>
          ) : currentRecipient.status === 'selected' ? (
            <div className="honours-review-actions">
              <div className="honours-selected-note"><UserCheck size={18} /><span>Selected for this award</span></div>
              {!finalReviewOpen ? <p className="muted">Finalisation becomes available when the period opens for final review.</p> : null}
              <button className="btn btn-primary" type="button" disabled={working || !finalReviewOpen || selectionSnapshotMismatch || !citation.trim() || (otherOverlaps.length > 0 && (!canOverride || !overrideReason.trim()))} onClick={() => workflow('finalise', { recipientId: currentRecipient.id, publicCitation: citation, overrideReason })}><Check size={16} /> Finalise award</button>
              {canOverride ? <><label className="field"><span>Revocation reason</span><textarea className="textarea" value={revocationReason} onChange={(event) => setRevocationReason(event.target.value)} /></label><button className="btn btn-soft" type="button" disabled={working || !revocationReason.trim()} onClick={() => workflow('revoke', { recipientId: currentRecipient.id, reason: revocationReason })}><RotateCcw size={16} /> Revoke selection</button></> : null}
            </div>
          ) : (
            <div className="honours-review-actions">
              <div className="honours-selected-note is-final"><Check size={18} /><span>Award finalised</span></div>
              {canOverride ? <><label className="field"><span>Correction reason</span><textarea className="textarea" value={revocationReason} onChange={(event) => setRevocationReason(event.target.value)} /></label><button className="btn btn-danger" type="button" disabled={working || !revocationReason.trim()} onClick={() => workflow('revoke', { recipientId: currentRecipient.id, reason: revocationReason })}><RotateCcw size={16} /> Revoke award</button></> : null}
            </div>
          )}
        </aside>
      </div>
    </main>
  )
}
