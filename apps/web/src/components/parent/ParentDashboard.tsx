'use client'

import { useEffect, useState } from 'react'
import { MessageCircleQuestion } from 'lucide-react'
import { DistributionList } from '@/components/charts/DistributionList'
import { RecognitionFeed } from '@/components/recognition/RecognitionFeed'
import { LoadingState } from '@/components/ui/LoadingState'
import { MetricCard } from '@/components/ui/MetricCard'
import type { RecognitionLog, StudentSummary } from '@/types'

type Child = StudentSummary & {
  link?: { relationship?: string | null; is_primary?: boolean | null } | null
}

type DistributionRow = { name: string; value: number }

type ChildGrowthPayload = {
  profile: StudentSummary | null
  recognitions: RecognitionLog[]
  totals: {
    totalPoints: number
    recognitionCount: number
    strongestR: string | null
    strongestDomain: string | null
  }
  byR: DistributionRow[]
  byDomain: DistributionRow[]
  conversationPrompt: string
}

export function ParentDashboard() {
  const [children, setChildren] = useState<Child[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [growth, setGrowth] = useState<ChildGrowthPayload | null>(null)
  const [loadingChildren, setLoadingChildren] = useState(true)
  const [loadingGrowth, setLoadingGrowth] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadChildren() {
      const response = await fetch('/api/parent/children')
      const data = await response.json().catch(() => ({}))
      setLoadingChildren(false)
      if (!response.ok) {
        setError(data.error ?? 'Unable to load child links.')
        return
      }
      const nextChildren = data.children ?? []
      setChildren(nextChildren)
      setSelectedId(nextChildren[0]?.id ?? '')
    }

    loadChildren()
  }, [])

  useEffect(() => {
    if (!selectedId) return
    async function loadGrowth() {
      setLoadingGrowth(true)
      const response = await fetch(`/api/parent/children/${selectedId}/growth`)
      const data = await response.json().catch(() => ({}))
      setLoadingGrowth(false)
      if (!response.ok) {
        setError(data.error ?? 'Unable to load child growth.')
        return
      }
      setGrowth(data)
    }

    loadGrowth()
  }, [selectedId])

  if (error) {
    return (
      <main className="page">
        <div className="error">{error}</div>
      </main>
    )
  }

  if (loadingChildren) {
    return (
      <main className="page">
        <LoadingState label="Loading parent view..." />
      </main>
    )
  }

  if (children.length === 0) {
    return (
      <main className="page">
        <div className="card">
          <h1>No child linked</h1>
          <p className="muted">Ask an administrator to link this parent account to the correct student record.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Parent View</p>
          <h1 className="page-title">Formation you can reinforce at home.</h1>
          <p className="page-subtitle">Only parent-approved recognition notes are shown here.</p>
        </div>
        <div className="toolbar">
          {children.map((child) => (
            <button
              className={`btn ${selectedId === child.id ? 'btn-gold' : 'btn-soft'}`}
              key={child.id}
              onClick={() => setSelectedId(child.id)}
              type="button"
            >
              {child.student_name}
            </button>
          ))}
        </div>
      </header>

      {loadingGrowth || !growth ? (
        <LoadingState label="Loading child growth..." />
      ) : (
        <>
          <section className="grid grid-4">
            <MetricCard label="Points" value={growth.totals.totalPoints} helper="Parent-visible only" />
            <MetricCard label="Recognitions" value={growth.totals.recognitionCount} helper="Approved notes" />
            <MetricCard label="Strongest 3R" value={growth.totals.strongestR ?? '-'} />
            <MetricCard label="Strongest domain" value={growth.totals.strongestDomain ?? '-'} />
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <div className="toolbar" style={{ marginBottom: 10 }}>
              <MessageCircleQuestion size={20} color="#0f766e" />
              <h2 style={{ margin: 0 }}>Conversation prompt</h2>
            </div>
            <p className="note-box" style={{ margin: 0 }}>{growth.conversationPrompt}</p>
          </section>

          <section className="grid grid-2" style={{ marginTop: 16 }}>
            <div className="card">
              <p className="eyebrow">3Rs</p>
              <h2 style={{ marginTop: 6 }}>Growth by value</h2>
              <DistributionList rows={growth.byR} />
            </div>
            <div className="card">
              <p className="eyebrow">Domains</p>
              <h2 style={{ marginTop: 6 }}>Growth by setting</h2>
              <DistributionList rows={growth.byDomain} />
            </div>
          </section>

          <section className="card" style={{ marginTop: 16 }}>
            <p className="eyebrow">Recent</p>
            <h2 style={{ marginTop: 6 }}>Recognitions visible to parent</h2>
            <RecognitionFeed recognitions={growth.recognitions} />
          </section>
        </>
      )}
    </main>
  )
}
