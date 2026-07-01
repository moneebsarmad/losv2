'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ClipboardPlus, Target, Trophy, UsersRound } from 'lucide-react'
import { DistributionList } from '@/components/charts/DistributionList'
import { RecognitionFeed } from '@/components/recognition/RecognitionFeed'
import { LoadingState } from '@/components/ui/LoadingState'
import { MetricCard } from '@/components/ui/MetricCard'
import type { RecognitionLog, StudentSummary } from '@/types'

type DistributionRow = { name: string; value: number }

type StaffDashboardPayload = {
  recentRecognitions: RecognitionLog[]
  houseImpact: DistributionRow[]
  notRecognizedRecently: StudentSummary[]
  totals: {
    recentSubmittedByMe: number
    activeStudents: number
    studentsNotRecognizedRecently: number
  }
}

export function StaffDashboard() {
  const [payload, setPayload] = useState<StaffDashboardPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      const response = await fetch('/api/staff/dashboard')
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        setError(data.error ?? 'Unable to load staff dashboard.')
        return
      }
      setPayload(data)
    }

    loadDashboard()
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
        <LoadingState label="Loading staff dashboard..." />
      </main>
    )
  }

  return (
    <main className="page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Staff Dashboard</p>
          <h1 className="page-title">Recognition starts here.</h1>
          <p className="page-subtitle">Log behaviour-specific 3R recognition and keep houses moving through daily formation.</p>
        </div>
        <Link className="btn btn-gold" href="/dashboard/recognize">
          <ClipboardPlus size={18} />
          Recognise Student
        </Link>
      </header>

      <section className="grid grid-3">
        <MetricCard label="Submitted by me" value={payload.totals.recentSubmittedByMe} helper="Most recent logs" />
        <MetricCard label="Active students" value={payload.totals.activeStudents} helper="Available roster" />
        <MetricCard label="Missed recently" value={payload.totals.studentsNotRecognizedRecently} helper="Past 14 days" />
      </section>

      <section className="grid grid-2" style={{ marginTop: 16 }}>
        <div className="card">
          <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p className="eyebrow">House Engine</p>
              <h2 style={{ margin: '6px 0 0' }}>My house impact</h2>
            </div>
            <Trophy size={22} color="#ba8f22" />
          </div>
          <DistributionList rows={payload.houseImpact} empty="Your recognitions will add to house energy here." />
        </div>

        <div className="card">
          <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <p className="eyebrow">Notice Gap</p>
              <h2 style={{ margin: '6px 0 0' }}>Students to notice</h2>
            </div>
            <Target size={22} color="#0f766e" />
          </div>
          <div className="list">
            {payload.notRecognizedRecently.length === 0 ? (
              <p className="muted">Every active student has recent recognition in this window.</p>
            ) : (
              payload.notRecognizedRecently.map((student) => (
                <div className="list-row" key={student.id}>
                  <div>
                    <strong>{student.student_name}</strong>
                    <div className="muted">
                      Grade {student.grade ?? '-'}
                      {student.section ?? ''} · {student.house}
                    </div>
                  </div>
                  <UsersRound size={18} color="#697386" />
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="toolbar" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <p className="eyebrow">Recent</p>
            <h2 style={{ margin: '6px 0 0' }}>My recognitions</h2>
          </div>
          <Link className="btn btn-soft" href="/dashboard/recognize">
            Add another
          </Link>
        </div>
        <RecognitionFeed recognitions={payload.recentRecognitions} />
      </section>
    </main>
  )
}
