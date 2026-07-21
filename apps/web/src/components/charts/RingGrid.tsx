import { RingIndicator } from '@/components/ui/RingIndicator'
import { HOUSE_COLORS } from '@/lib/constants/formation'

export function RingGrid({
  rows,
  useHouseColors = false,
  color,
  empty = 'No data yet.',
}: {
  rows: Array<{ name: string; value: number }>
  useHouseColors?: boolean
  color?: string
  empty?: string
}) {
  const max = Math.max(1, ...rows.map((r) => r.value))

  if (rows.length === 0) return <p className="muted">{empty}</p>

  return (
    <div className="ring-grid">
      {rows.map((row) => (
        <RingIndicator
          key={row.name}
          label={row.name}
          value={row.value}
          max={max}
          color={useHouseColors ? HOUSE_COLORS[row.name] : color}
        />
      ))}
    </div>
  )
}
