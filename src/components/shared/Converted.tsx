import { baseToCurrency, convertAmounts, CURRENCIES, formatCurrency, type BaseTotal, type CurrencyAmounts, type RateTable } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type { ShowIn } from "@/hooks/useShowIn"
import type { CurrencyCode } from "@/types/database"
import { Money } from "./Money"

/** "Show totals in" control: pick one currency or Original (no conversion). */
export function ShowInSelector({
  value,
  onChange,
  base,
  rates,
}: {
  value: ShowIn
  onChange: (v: ShowIn) => void
  base: CurrencyCode
  rates: RateTable
}) {
  // Offer the default currency, any currency that has a rate, and Original.
  const options: ShowIn[] = [
    base,
    ...CURRENCIES.map((c) => c.code).filter((c) => c !== base && rates[c]),
    "original",
  ]
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">Show totals in</span>
      <div role="group" aria-label="Show totals in" className="inline-flex overflow-hidden rounded-md border bg-card">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            aria-pressed={value === o}
            onClick={() => onChange(o)}
            className={cn(
              "border-r px-3 py-1.5 text-sm last:border-r-0",
              value === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {o === "original" ? "Original" : o}
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * A total in the chosen currency, with the original per-currency amounts underneath.
 * `baseTotal` (when given) already honours each project's agreed rate; otherwise the Settings table is used.
 * A currency with no rate is named, never silently dropped.
 */
export function Converted({
  amounts,
  baseTotal,
  mode,
  base,
  rates,
}: {
  amounts: CurrencyAmounts
  baseTotal?: BaseTotal
  mode: ShowIn
  base: CurrencyCode
  rates: RateTable
}) {
  if (mode === "original") return <Money amounts={amounts} />

  let total: number | null
  let missing: CurrencyCode[]
  if (baseTotal) {
    total = baseToCurrency(baseTotal.total, mode, base, rates)
    missing = baseTotal.missing
  } else {
    const r = convertAmounts(amounts, mode, base, rates)
    total = r.total
    missing = r.missing
  }

  const present = Object.entries(amounts).filter(([, v]) => v) as [CurrencyCode, number][]
  // Underneath the total, list the original amounts that were converted (not ones already in this currency).
  const originals = present.filter(([code]) => code !== mode)
  const mixed = originals.length > 0

  return (
    <div>
      <div>{total == null ? "No rate" : formatCurrency(total, mode)}</div>
      {mixed && (
        <div className="mt-0.5 space-y-0.5 text-xs font-normal text-muted-foreground">
          {originals.map(([code, v]) => (
            <div key={code}>{formatCurrency(v, code)}</div>
          ))}
        </div>
      )}
      {missing.length > 0 && (
        <p className="mt-0.5 text-xs font-normal text-warning">No rate for {missing.join(", ")}. Set one in Settings.</p>
      )}
    </div>
  )
}
