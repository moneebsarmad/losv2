export function RingIndicator({
  label,
  value,
  max,
  color,
}: {
  label: string
  value: number
  max: number
  color?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  const fill = color ?? 'var(--gold)'

  return (
    <div className="ring-indicator">
      <div
        className="ring-donut"
        style={
          {
            '--ring-pct': pct,
            '--ring-fill': fill,
          } as React.CSSProperties
        }
      >
        <span className="ring-inner">{value}</span>
      </div>
      <p className="ring-label">{label}</p>
    </div>
  )
}
