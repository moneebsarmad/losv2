export function ProgressBar({ value, color }: { value: number; color?: string }) {
  const width = Math.max(0, Math.min(100, value))
  return (
    <div className="bar">
      <span style={{ width: `${width}%`, background: color }} />
    </div>
  )
}
