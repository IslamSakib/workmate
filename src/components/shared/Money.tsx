import { formatCurrency, type CurrencyAmounts } from "@/lib/currency"
import type { CurrencyCode } from "@/types/database"

/** One line per currency; never a blended total. */
export function Money({ amounts }: { amounts: CurrencyAmounts }) {
  const entries = (Object.entries(amounts) as [CurrencyCode, number][]).filter(([, v]) => v !== 0)
  if (entries.length === 0) return <span>{formatCurrency(0)}</span>
  return (
    <div className="space-y-0.5">
      {entries.map(([code, v]) => (
        <div key={code}>{formatCurrency(v, code)}</div>
      ))}
    </div>
  )
}
