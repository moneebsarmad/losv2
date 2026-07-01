import { ProgressBar } from '@/components/ui/ProgressBar'

export function DistributionList({
  rows,
  empty = 'No data yet.',
}: {
  rows: Array<{ name: string; value: number }>
  empty?: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))

  if (rows.length === 0) {
    return <p className="muted">{empty}</p>
  }

  return (
    <div className="list">
      {rows.map((row) => (
        <div key={row.name} style={{ display: 'grid', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <strong>{row.name}</strong>
            <span>{row.value.toLocaleString()}</span>
          </div>
          <ProgressBar value={(row.value / max) * 100} />
        </div>
      ))}
    </div>
  )
}
