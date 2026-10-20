const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** "2026-08-01" (or a timestamp) -> "1 Aug 2026". Read as a plain calendar date, so no timezone shifts. Empty input -> fallback. */
export function formatDate(iso?: string | null, fallback = "-"): string {
  const m = iso && /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso || fallback
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`
}
