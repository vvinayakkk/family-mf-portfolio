export function fmt(v: number | null | undefined, d = 1): string {
  if (v == null || Number.isNaN(Number(v))) return '—'
  return Number(v).toFixed(d)
}

export function inr(v: number | null | undefined): string {
  if (v == null) return '—'
  return Math.round(v).toLocaleString('en-IN')
}

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function numOrNegInf(v: number | null | undefined): number {
  return v == null ? Number.NEGATIVE_INFINITY : v
}
