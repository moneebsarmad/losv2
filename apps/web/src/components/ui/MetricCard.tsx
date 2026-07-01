export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) {
  return (
    <div className="card metric">
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
      {helper ? <span className="muted">{helper}</span> : null}
    </div>
  )
}
