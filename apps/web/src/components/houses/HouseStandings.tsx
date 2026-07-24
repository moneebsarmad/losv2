'use client'

import { useEffect, useMemo, useState } from 'react'
import { Trophy } from 'lucide-react'
import { DistributionList } from '@/components/charts/DistributionList'
import { LoadingState } from '@/components/ui/LoadingState'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { HOUSE_COLORS, HOUSE_LOGOS } from '@/lib/constants/formation'

type DistributionRow = { name: string; value: number }

type HousePayload = {
  standings: DistributionRow[]
  byR: DistributionRow[]
  byDomain: DistributionRow[]
}

export function HouseStandings({ title = 'House standings' }: { title?: string }) {
  const [payload, setPayload] = useState<HousePayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadHouses() {
      const response = await fetch('/api/houses/standings')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Unable to load house standings.')
        return
      }
      setPayload(data)
    }

    loadHouses()
  }, [])

  const max = useMemo(() => Math.max(1, ...(payload?.standings ?? []).map((row) => row.value)), [payload])

  if (error) {
    return (
      <main className="page">
        <div className="error">{error}</div>
      </main>
    )
  }

  if (!payload) {
    return (
      <main className="page">
        <LoadingState label="Loading house standings..." />
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">House System</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-subtitle">The social engine stays central: every recognition strengthens student formation and house belonging.</p>
        </div>
        <span className="pill">
          <Trophy size={15} />
          Live points
        </span>
      </header>

      <section className="card">
        <div className="list">
          {payload.standings.length === 0 ? (
            <p className="muted">House points will appear after recognition or house events are logged.</p>
          ) : (
            payload.standings.map((house, index) => (
              <div className="rank-row" key={house.name}>
                <span className="rank-badge">{index + 1}</span>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div className="toolbar" style={{ justifyContent: 'space-between' }}>
                    <strong>
                      {HOUSE_LOGOS[house.name] ? <img className="house-logo" src={HOUSE_LOGOS[house.name]} alt="" /> : null}
                      <span className="house-dot" style={{ background: HOUSE_COLORS[house.name] ?? '#8a6d2f' }} />
                      {house.name}
                    </strong>
                    <span className="muted">{house.value.toLocaleString()} points</span>
                  </div>
                  <ProgressBar value={(house.value / max) * 100} color={HOUSE_COLORS[house.name]} />
                </div>
                <strong style={{ textAlign: 'right' }}>+{house.value.toLocaleString()}</strong>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <p className="eyebrow">Formation Layer</p>
          <h2 style={{ marginTop: 6 }}>House points by 3R</h2>
          <DistributionList rows={payload.byR} />
        </div>
        <div className="card">
          <p className="eyebrow">Formation Layer</p>
          <h2 style={{ marginTop: 6 }}>House points by domain</h2>
          <DistributionList rows={payload.byDomain} />
        </div>
      </section>
    </main>
  )
}
