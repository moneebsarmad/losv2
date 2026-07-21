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
    <div className="metric-card">
      <div className="metric-card-body">
        <span className="metric-label">{label}</span>
        {helper ? <span className="metric-helper">{helper}</span> : null}
      </div>
      <span className="metric-value">{value}</span>
    </div>
  )
}
