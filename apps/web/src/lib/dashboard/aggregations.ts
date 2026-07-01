import type { RecognitionLog } from '@/types'

export function groupSum<T extends Record<string, unknown>>(
  rows: T[],
  keyFn: (row: T) => string,
  valueFn: (row: T) => number
) {
  return rows.reduce<Record<string, number>>((acc, row) => {
    const key = keyFn(row) || 'Unknown'
    acc[key] = (acc[key] ?? 0) + valueFn(row)
    return acc
  }, {})
}

export function asSortedDistribution(record: Record<string, number>) {
  return Object.entries(record)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name))
}

export function getRecognitionRName(row: RecognitionLog) {
  return row.r_values?.name ?? 'Unknown'
}

export function getRecognitionDomainName(row: RecognitionLog) {
  return row.domains?.name ?? 'Unknown'
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NA'
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('')
}

export function formatDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
