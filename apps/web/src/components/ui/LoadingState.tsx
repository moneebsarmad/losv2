export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 28 }}>
      <strong>{label}</strong>
    </div>
  )
}
