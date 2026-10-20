import type { ReactNode } from "react"
import type { UseFormRegisterReturn } from "react-hook-form"
import { Input } from "@/components/ui/input"
import type { CurrencyCode } from "@/types/database"

/**
 * The rate agreed in a client's contract, for a foreign currency: "1 USD = ___ BDT".
 * Shown only when the currency differs from the default; empty means "use the Settings rate".
 */
export function ContractRateField({
  currency,
  base,
  tableRate,
  inputProps,
  error,
  footer,
}: {
  currency: CurrencyCode
  base: CurrencyCode
  tableRate?: number
  inputProps: UseFormRegisterReturn
  error?: string
  footer?: ReactNode
}) {
  if (currency === base) return null
  return (
    <fieldset className="space-y-2 rounded-md border border-primary bg-accent p-3 sm:col-span-2">
      <legend className="px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Contract exchange rate</legend>
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
        <span className="font-semibold tabular-nums">1 {currency} =</span>
        <Input
          type="number"
          step="any"
          min="0"
          inputMode="decimal"
          aria-label={`Contract rate, ${base} per ${currency}`}
          placeholder={tableRate ? String(tableRate) : "Rate"}
          {...inputProps}
        />
        <span className="font-semibold">{base}</span>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Optional. The rate in this client's contract, used for their invoices and reports.{" "}
        {tableRate ? `Leave empty to use your Settings rate (${tableRate}).` : "No Settings rate is set for this currency."}
      </p>
      {footer}
    </fieldset>
  )
}
