import { formatDate } from '@/lib/dashboard/aggregations'
import type { RecognitionLog } from '@/types'

export function RecognitionFeed({ recognitions }: { recognitions: RecognitionLog[] }) {
  if (recognitions.length === 0) {
    return <p className="muted">No recognitions yet.</p>
  }

  return (
    <div className="list">
      {recognitions.map((recognition) => (
        <div className="list-row" key={recognition.id}>
          <div>
            <strong>{recognition.student_name_snapshot}</strong>
            <div className="muted">
              {recognition.r_values?.name ?? '3R'} · {recognition.domains?.name ?? 'Domain'} · {formatDate(recognition.created_at)}
            </div>
            <p style={{ marginBottom: 0 }}>{recognition.behaviour_note}</p>
          </div>
          <span className="pill">+{recognition.point_value}</span>
        </div>
      ))}
    </div>
  )
}
