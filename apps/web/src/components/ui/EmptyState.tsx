export function EmptyState({ title, message }: { title: string; message?: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 28 }}>
      <strong>{title}</strong>
      {message ? <p className="muted" style={{ marginBottom: 0 }}>{message}</p> : null}
    </div>
  )
}
