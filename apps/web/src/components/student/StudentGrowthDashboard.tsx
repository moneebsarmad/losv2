'use client'

import { useEffect, useState } from 'react'
import { BookOpenCheck, Goal, Sparkles } from 'lucide-react'
import { DistributionList } from '@/components/charts/DistributionList'
import { RingGrid } from '@/components/charts/RingGrid'
import { RecognitionFeed } from '@/components/recognition/RecognitionFeed'
import { LoadingState } from '@/components/ui/LoadingState'
import { MetricCard } from '@/components/ui/MetricCard'
import { R_VALUES } from '@/lib/constants/formation'
import type { RecognitionLog, StudentSummary } from '@/types'

type DistributionRow = { name: string; value: number }

type StudentGrowthPayload = {
  profile: StudentSummary | null
  recognitions: RecognitionLog[]
  totals?: {
    totalPoints: number
    recognitionCount: number
    strongestR: string | null
    strongestDomain: string | null
    areaToGrow: string | null
  }
  byR: DistributionRow[]
  byDomain: DistributionRow[]
  reflectionPrompt: string
}

export function StudentGrowthDashboard() {
  const [payload, setPayload] = useState<StudentGrowthPayload | null>(null)
  const [goal, setGoal] = useState('responsibility')
  const [reflection, setReflection] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadGrowth() {
      const response = await fetch('/api/student/growth')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Unable to load growth dashboard.')
        return
      }
      setPayload(data)
    }

    loadGrowth()
  }, [])

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
        <LoadingState label="Loading My Growth..." />
      </main>
    )
  }

  if (!payload.profile) {
    return (
      <main className="page">
        <div className="card">
          <h1>Student profile not linked</h1>
          <p className="muted">Ask an administrator to connect this login to a student roster record.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">My Growth</p>
          <h1 className="page-title">{payload.profile.student_name}</h1>
          <p className="page-subtitle">
            Grade {payload.profile.grade ?? '-'}
            {payload.profile.section ?? ''} · {payload.profile.house}
          </p>
        </div>
        <span className="pill">
          <Sparkles size={15} />
          3R Growth
        </span>
      </header>

      <section className="grid grid-4">
        <MetricCard label="Points" value={payload.totals?.totalPoints ?? 0} helper="Visible recognition only" />
        <MetricCard label="Recognitions" value={payload.totals?.recognitionCount ?? 0} helper="Approved for you" />
        <MetricCard label="Strongest 3R" value={payload.totals?.strongestR ?? '-'} />
        <MetricCard label="Growth focus" value={payload.totals?.areaToGrow ?? '-'} />
      </section>

      <section className="grid grid-2" style={{ marginTop: 16 }}>
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
      </section>

      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <BookOpenCheck size={20} color="#0f766e" />
            <h2 style={{ margin: 0 }}>Reflection</h2>
          </div>
          <p className="note-box">{payload.reflectionPrompt}</p>
          <textarea
            className="textarea"
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            placeholder="Write a private reflection for now."
          />
        </div>
        <div className="card">
          <div className="toolbar" style={{ marginBottom: 12 }}>
            <Goal size={20} color="#8a6d2f" />
            <h2 style={{ margin: 0 }}>This week I want to grow in</h2>
          </div>
          <div className="segmented">
            {R_VALUES.map((item) => (
              <button
                className={`choice ${goal === item.key ? 'active' : ''}`}
                key={item.key}
                onClick={() => setGoal(item.key)}
                type="button"
              >
                <strong>{item.name}</strong>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <p className="eyebrow">Recent</p>
        <h2 style={{ marginTop: 6 }}>Recognitions visible to me</h2>
        <RecognitionFeed recognitions={payload.recognitions} />
      </section>
    </main>
  )
}
