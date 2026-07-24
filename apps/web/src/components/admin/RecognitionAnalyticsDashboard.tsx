'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RefreshCw, RotateCcw } from 'lucide-react'
import { DistributionList } from '@/components/charts/DistributionList'
import { MetricCard } from '@/components/ui/MetricCard'
import { HOUSE_NAMES } from '@/lib/constants/formation'
import type { RecognitionReferencePayload } from '@/types'

type DistributionRow = { name: string; value: number }
type StaffRow = {
  name: string
  awards: number
  points: number
  averagePoints: number
  twentyPercent: number
  uniqueStudents: number
}
type RecentAward = {
  id: string
  recognitionDate: string
  student: string
  house: string
  staff: string
  behaviour: string
  domain: string
  points: number
  framework: string
  mode: string
}
type AnalyticsPayload = {
  totals: {
    awards: number
    points: number
    uniqueStudents: number
    activeStaff: number
    possibleDuplicates: number
  }
  byR: DistributionRow[]
  byDomain: DistributionRow[]
  byBehaviour: DistributionRow[]
  byGraduateValue: DistributionRow[]
  byPointTier: DistributionRow[]
  byHouse: DistributionRow[]
  byStudent: DistributionRow[]
  byFramework: DistributionRow[]
  byMode: DistributionRow[]
  staff: StaffRow[]
  nominations: { pending: number; approved: number; rejected: number; withdrawn: number }
  recentAwards: RecentAward[]
}

function dateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export function RecognitionAnalyticsDashboard() {
  const [references, setReferences] = useState<RecognitionReferencePayload>({
    rValues: [],
    domains: [],
    definitions: [],
    graduateValues: [],
  })
  const initialFilters = {
    start: dateDaysAgo(30),
    end: new Date().toISOString().slice(0, 10),
    grade: '',
    student: '',
    house: '',
    staff: '',
    r: '',
    behaviour: '',
    graduate_value: '',
    domain: '',
    points: '',
    framework: '',
    mode: '',
  }
  const [filters, setFilters] = useState(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState(initialFilters)
  const [payload, setPayload] = useState<AnalyticsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reversing, setReversing] = useState<string | null>(null)
  const [refreshRevision, setRefreshRevision] = useState(0)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(appliedFilters).forEach(([key, value]) => value && params.set(key, value))
    return params.toString()
  }, [appliedFilters])

  useEffect(() => {
    fetch('/api/reference')
      .then((response) => response.json())
      .then((data) =>
        setReferences({
          rValues: data.rValues ?? [],
          domains: data.domains ?? [],
          definitions: data.definitions ?? [],
          graduateValues: data.graduateValues ?? [],
        })
      )
      .catch(() => setError('Unable to load recognition filters.'))
  }, [])

  useEffect(() => {
    async function load() {
      setPayload(null)
      const response = await fetch(`/api/admin/recognition-analytics?${query}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) setError(data.error ?? 'Unable to load recognition analytics.')
      else {
        setPayload(data)
        setError(null)
      }
    }
    load()
  }, [query, refreshRevision])

  function apply(event: FormEvent) {
    event.preventDefault()
    setAppliedFilters(filters)
  }

  async function reverseAward(award: RecentAward) {
    const reason = window.prompt(
      `Reverse ${award.points} points for ${award.student}? Enter the required reason (10–500 characters).`
    )?.trim()
    if (!reason) return
    if (reason.length < 10) {
      setError('A reversal reason of at least 10 characters is required.')
      return
    }
    setReversing(award.id)
    const response = await fetch(`/api/admin/recognitions/${award.id}/reverse`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    const data = await response.json().catch(() => ({}))
    setReversing(null)
    if (!response.ok) {
      setError(data.error ?? 'Unable to reverse this award.')
      return
    }
    setRefreshRevision((current) => current + 1)
  }

  const behaviourOptions = references.definitions.filter(
    (definition) => !filters.r || definition.r_value_code === filters.r
  )

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Recognition governance</p>
          <h1 className="page-title">Consistency & anti-inflation analytics</h1>
          <p className="page-subtitle">
            Monitor balance, reach, fixed-tier usage, exceptional approvals, and possible duplicate patterns.
          </p>
        </div>
        <Link className="btn btn-gold" href="/dashboard/admin/recognition-nominations">
          Review nominations
        </Link>
      </header>

      <form className="card" onSubmit={apply}>
        <div className="filter-grid recognition-filter-grid">
          <label className="field">Start<input className="input" type="date" value={filters.start} onChange={(event) => setFilters({ ...filters, start: event.target.value })} /></label>
          <label className="field">End<input className="input" type="date" value={filters.end} onChange={(event) => setFilters({ ...filters, end: event.target.value })} /></label>
          <label className="field">Grade<input className="input" inputMode="numeric" value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value })} placeholder="Any" /></label>
          <label className="field">Student<input className="input" value={filters.student} onChange={(event) => setFilters({ ...filters, student: event.target.value })} placeholder="Name contains" /></label>
          <label className="field">House<select className="select" value={filters.house} onChange={(event) => setFilters({ ...filters, house: event.target.value })}><option value="">All houses</option>{HOUSE_NAMES.map((house) => <option key={house}>{house}</option>)}</select></label>
          <label className="field">Staff<input className="input" value={filters.staff} onChange={(event) => setFilters({ ...filters, staff: event.target.value })} placeholder="Name contains" /></label>
          <label className="field">3R<select className="select" value={filters.r} onChange={(event) => setFilters({ ...filters, r: event.target.value, behaviour: '' })}><option value="">All 3Rs</option>{references.rValues.map((r) => <option key={r.id} value={r.key}>{r.name}</option>)}</select></label>
          <label className="field">Behaviour<select className="select" value={filters.behaviour} onChange={(event) => setFilters({ ...filters, behaviour: event.target.value })}><option value="">All behaviours</option>{behaviourOptions.map((definition) => <option key={definition.code} value={definition.code}>{definition.label}</option>)}</select></label>
          <label className="field">Graduate Value<select className="select" value={filters.graduate_value} onChange={(event) => setFilters({ ...filters, graduate_value: event.target.value })}><option value="">All values</option>{references.graduateValues.map((value) => <option key={value.code} value={value.code}>{value.display_label}</option>)}</select></label>
          <label className="field">Domain<select className="select" value={filters.domain} onChange={(event) => setFilters({ ...filters, domain: event.target.value })}><option value="">All domains</option>{references.domains.map((domain) => <option key={domain.key} value={domain.key}>{domain.name}</option>)}</select></label>
          <label className="field">Point tier<select className="select" value={filters.points} onChange={(event) => setFilters({ ...filters, points: event.target.value })}><option value="">All tiers</option>{[5, 10, 20, 50].map((points) => <option key={points} value={points}>+{points}</option>)}</select></label>
          <label className="field">Framework<select className="select" value={filters.framework} onChange={(event) => setFilters({ ...filters, framework: event.target.value })}><option value="">All versions</option><option value="recognition_v2">Recognition v2</option><option value="legacy">Legacy</option></select></label>
          <label className="field">Mode<select className="select" value={filters.mode} onChange={(event) => setFilters({ ...filters, mode: event.target.value })}><option value="">Direct & exceptional</option><option value="direct">Direct</option><option value="nomination">Exceptional</option></select></label>
          <button className="btn btn-primary" type="submit"><RefreshCw size={17} />Apply</button>
        </div>
      </form>

      {error ? <div className="error" role="alert">{error}</div> : null}
      {!payload ? (
        <div className="card">Loading recognition analytics…</div>
      ) : (
        <>
          <section className="grid grid-4">
            <MetricCard label="Awards" value={payload.totals.awards} />
            <MetricCard label="Points" value={payload.totals.points} />
            <MetricCard label="Students recognised" value={payload.totals.uniqueStudents} />
            <MetricCard label="Possible duplicates" value={payload.totals.possibleDuplicates} helper="Monitor; not blocked" />
          </section>

          <section className="grid grid-3">
            <div className="card"><h2>By 3R</h2><DistributionList rows={payload.byR} /></div>
            <div className="card"><h2>By domain</h2><DistributionList rows={payload.byDomain} /></div>
            <div className="card"><h2>By House</h2><DistributionList rows={payload.byHouse} /></div>
            <div className="card"><h2>By behaviour</h2><DistributionList rows={payload.byBehaviour.slice(0, 12)} /></div>
            <div className="card"><h2>By Graduate Value</h2><DistributionList rows={payload.byGraduateValue} /></div>
            <div className="card"><h2>By point tier</h2><DistributionList rows={payload.byPointTier} /></div>
            <div className="card"><h2>Direct vs exceptional</h2><DistributionList rows={payload.byMode} /></div>
            <div className="card"><h2>Framework version</h2><DistributionList rows={payload.byFramework} /></div>
            <div className="card"><h2>Recognition concentration</h2><DistributionList rows={payload.byStudent.slice(0, 12)} /></div>
          </section>

          <section className="card">
            <h2>Staff consistency</h2>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Staff</th><th>Awards</th><th>Points</th><th>Avg / award</th><th>+20 share</th><th>Unique students</th></tr></thead>
                <tbody>{payload.staff.map((row) => <tr key={row.name}><td><strong>{row.name}</strong></td><td>{row.awards}</td><td>{row.points}</td><td>{row.averagePoints}</td><td>{row.twentyPercent}%</td><td>{row.uniqueStudents}</td></tr>)}</tbody>
              </table>
            </div>
          </section>

          <section className="grid grid-4">
            <MetricCard label="Pending nominations" value={payload.nominations.pending} />
            <MetricCard label="Approved nominations" value={payload.nominations.approved} />
            <MetricCard label="Rejected nominations" value={payload.nominations.rejected} />
            <MetricCard label="Withdrawn nominations" value={payload.nominations.withdrawn} />
          </section>

          <section className="card">
            <h2>Recent active awards</h2>
            <p className="muted">Reversal keeps the original transaction and adds an audited reason.</p>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Date</th><th>Student</th><th>Behaviour</th><th>Domain</th><th>Staff</th><th>Points</th><th>Action</th></tr></thead>
                <tbody>{payload.recentAwards.map((award) => <tr key={award.id}><td>{award.recognitionDate}</td><td><strong>{award.student}</strong><div className="muted">{award.house}</div></td><td>{award.behaviour}</td><td>{award.domain}</td><td>{award.staff}</td><td>+{award.points}</td><td><button type="button" className="btn btn-soft" disabled={reversing === award.id} onClick={() => reverseAward(award)}><RotateCcw size={16} />Reverse</button></td></tr>)}</tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  )
}
