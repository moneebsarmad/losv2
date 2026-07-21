'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Download, RefreshCw } from 'lucide-react'
import { DistributionList } from '@/components/charts/DistributionList'
import { RingGrid } from '@/components/charts/RingGrid'
import { RecognitionFeed } from '@/components/recognition/RecognitionFeed'
import { LoadingState } from '@/components/ui/LoadingState'
import { MetricCard } from '@/components/ui/MetricCard'
import { MissedStudentsPanel } from '@/components/admin/MissedStudentsPanel'
import { HOUSE_NAMES } from '@/lib/constants/formation'
import type { PointValueRow, RecognitionLog, ReferenceRow } from '@/types'

type DistributionRow = { name: string; value: number }

type ReferencePayload = {
  rValues: ReferenceRow[]
  domains: ReferenceRow[]
  pointValues: PointValueRow[]
}

type AdminOverviewPayload = {
  totals: {
    recognitionCount: number
    totalPoints: number
    uniqueStudents: number
    activeStaff: number
  }
  byHouse: DistributionRow[]
  byR: DistributionRow[]
  byDomain: DistributionRow[]
  byStaff: DistributionRow[]
  highVolumeStudents: DistributionRow[]
  recentRecognitions: RecognitionLog[]
}

function dateDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

export function AdminOverviewDashboard({ title = 'Tarbiyah overview' }: { title?: string }) {
  const [references, setReferences] = useState<ReferencePayload>({ rValues: [], domains: [], pointValues: [] })
  const [filters, setFilters] = useState({
    start: dateDaysAgo(30),
    end: new Date().toISOString().slice(0, 10),
    house: '',
    grade: '',
    staff: '',
    r: '',
    domain: '',
  })
  const [appliedFilters, setAppliedFilters] = useState(filters)
  const [payload, setPayload] = useState<AdminOverviewPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    const params = new URLSearchParams()
    Object.entries(appliedFilters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    return params.toString()
  }, [appliedFilters])

  useEffect(() => {
    async function loadReferences() {
      const response = await fetch('/api/reference')
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        setReferences({
          rValues: data.rValues ?? [],
          domains: data.domains ?? [],
          pointValues: data.pointValues ?? [],
        })
      }
    }

    loadReferences()
  }, [])

  useEffect(() => {
    async function loadOverview() {
      setPayload(null)
      const response = await fetch(`/api/admin/formation-overview?${query}`)
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Unable to load admin overview.')
        return
      }
      setError(null)
      setPayload(data)
    }

    loadOverview()
  }, [query])

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAppliedFilters(filters)
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Admin / Tarbiyah</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">Who is being formed, who is being noticed, and who is being missed?</p>
        </div>
        <div className="toolbar">
          <Link className="btn btn-soft" href="/dashboard/admin/audit">
            Audit trail
          </Link>
          <a className="btn btn-gold" href={`/api/admin/export?${query}`}>
            <Download size={18} />
            Export CSV
          </a>
        </div>
      </header>

      <form className="card" onSubmit={apply}>
        <div className="filter-grid">
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="start">Start</label>
            <input id="start" className="input" type="date" value={filters.start} onChange={(event) => setFilters({ ...filters, start: event.target.value })} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="end">End</label>
            <input id="end" className="input" type="date" value={filters.end} onChange={(event) => setFilters({ ...filters, end: event.target.value })} />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="house">House</label>
            <select id="house" className="select" value={filters.house} onChange={(event) => setFilters({ ...filters, house: event.target.value })}>
              <option value="">All houses</option>
              {HOUSE_NAMES.map((house) => (
                <option key={house} value={house}>{house}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="grade">Grade</label>
            <input id="grade" className="input" value={filters.grade} onChange={(event) => setFilters({ ...filters, grade: event.target.value })} placeholder="Any" />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="r-filter">3R</label>
            <select id="r-filter" className="select" value={filters.r} onChange={(event) => setFilters({ ...filters, r: event.target.value })}>
              <option value="">All 3Rs</option>
              {references.rValues.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="domain-filter">Domain</label>
            <select id="domain-filter" className="select" value={filters.domain} onChange={(event) => setFilters({ ...filters, domain: event.target.value })}>
              <option value="">All domains</option>
              {references.domains.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="staff">Staff</label>
            <input id="staff" className="input" value={filters.staff} onChange={(event) => setFilters({ ...filters, staff: event.target.value })} placeholder="Name contains" />
          </div>
          <button className="btn btn-primary" type="submit" style={{ alignSelf: 'end' }}>
            <RefreshCw size={17} />
            Apply
          </button>
        </div>
      </form>

      {error ? <div className="error" style={{ marginTop: 16 }}>{error}</div> : null}
      {!payload ? (
        <LoadingState label="Loading Tarbiyah data..." />
      ) : (
        <>
          <section className="grid grid-4" style={{ marginTop: 16 }}>
            <MetricCard label="Recognitions" value={payload.totals.recognitionCount} helper="Selected range" />
            <MetricCard label="Points" value={payload.totals.totalPoints} helper="Formation signals" />
            <MetricCard label="Students noticed" value={payload.totals.uniqueStudents} />
            <MetricCard label="Active staff" value={payload.totals.activeStaff} />
          </section>

          <section className="grid grid-2" style={{ marginTop: 16 }}>
            <div className="card">
              <p className="eyebrow">Houses</p>
              <h2 style={{ marginTop: 6 }}>Recognition by house</h2>
              <RingGrid rows={payload.byHouse} useHouseColors />
            </div>
            <div className="card">
              <p className="eyebrow">3Rs</p>
              <h2 style={{ marginTop: 6 }}>Recognition by value</h2>
              <RingGrid rows={payload.byR} />
            </div>
            <div className="card">
              <p className="eyebrow">Domains</p>
              <h2 style={{ marginTop: 6 }}>Recognition by setting</h2>
              <RingGrid rows={payload.byDomain} color="var(--nav)" />
            </div>
            <div className="card">
              <p className="eyebrow">Staff</p>
              <h2 style={{ marginTop: 6 }}>Recognition by staff member</h2>
              <DistributionList rows={payload.byStaff} />
            </div>
          </section>

          <section className="grid grid-2" style={{ marginTop: 16 }}>
            <MissedStudentsPanel />
            <div className="card">
              <p className="eyebrow">Volume Watch</p>
              <h2 style={{ marginTop: 6 }}>Students with high recognition volume</h2>
              <DistributionList rows={payload.highVolumeStudents} empty="No high-volume pattern in this range." />
            </div>
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <p className="eyebrow">Recent</p>
            <h2 style={{ marginTop: 6 }}>Recognition log</h2>
            <RecognitionFeed recognitions={payload.recentRecognitions} />
          </section>
        </>
      )}
    </main>
  )
}
