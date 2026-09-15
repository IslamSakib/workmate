import type { CurrencyCode } from "@/types/database"

export const CURRENCIES: { code: CurrencyCode; label: string; locale: string }[] = [
  { code: "USD", label: "US Dollar", locale: "en-US" },
  { code: "BDT", label: "Bangladeshi Taka", locale: "bn-BD" },
  { code: "EUR", label: "Euro", locale: "de-DE" },
  { code: "GBP", label: "British Pound", locale: "en-GB" },
  { code: "PHP", label: "Philippine Peso", locale: "en-PH" },
]

const LOCALE_BY_CODE: Record<CurrencyCode, string> = CURRENCIES.reduce(
  (acc, c) => ({ ...acc, [c.code]: c.locale }),
  {} as Record<CurrencyCode, string>,
)

export function formatCurrency(amount: number, code: CurrencyCode = "USD") {
  return new Intl.NumberFormat(LOCALE_BY_CODE[code] ?? "en-US", {
    style: "currency",
    currency: code,
    currencyDisplay: "narrowSymbol",
  }).format(amount)
}

/**
 * Revenue/expense totals aggregated per currency rather than blended into
 * one number — projects, invoices, retainers, and expenses each carry their
 * own currency, so a single freelancer account can easily mix currencies.
 */
export type CurrencyAmounts = Partial<Record<CurrencyCode, number>>

export function sumByCurrency<T>(
  rows: T[],
  getAmount: (row: T) => number,
  getCurrency: (row: T) => CurrencyCode,
): CurrencyAmounts {
  const out: CurrencyAmounts = {}
  for (const row of rows) {
    const code = getCurrency(row)
    out[code] = (out[code] ?? 0) + getAmount(row)
  }
  return out
}

export function addCurrencyAmounts(a: CurrencyAmounts, b: CurrencyAmounts): CurrencyAmounts {
  const out: CurrencyAmounts = { ...a }
  for (const [code, amount] of Object.entries(b) as [CurrencyCode, number][]) {
    out[code] = (out[code] ?? 0) + amount
  }
  return out
}

export function subtractCurrencyAmounts(a: CurrencyAmounts, b: CurrencyAmounts): CurrencyAmounts {
  const out: CurrencyAmounts = { ...a }
  for (const [code, amount] of Object.entries(b) as [CurrencyCode, number][]) {
    out[code] = (out[code] ?? 0) - amount
  }
  return out
}

/** "$41.12" for a single currency, "$41.12 + ৳18,000.00" when more than one is in play. */
export function formatCurrencyAmounts(amounts: CurrencyAmounts): string {
  const entries = Object.entries(amounts) as [CurrencyCode, number][]
  if (entries.length === 0) return formatCurrency(0)
  return entries.map(([code, amount]) => formatCurrency(amount, code)).join(" + ")
}

/** Raw sum across currencies — only for internal logic (sign checks, sort order), never for display. */
export function totalOf(amounts: CurrencyAmounts): number {
  return Object.values(amounts).reduce((acc: number, v) => acc + (v ?? 0), 0)
}

export function roundAmounts(amounts: CurrencyAmounts): CurrencyAmounts {
  const out: CurrencyAmounts = {}
  for (const [code, amount] of Object.entries(amounts) as [CurrencyCode, number][]) {
    out[code] = Math.round(amount)
  }
  return out
}

/** Every currency code appearing in any of the given amount maps, in the app's declared order. */
export function currenciesIn(...maps: CurrencyAmounts[]): CurrencyCode[] {
  const present = new Set<CurrencyCode>()
  for (const map of maps) for (const code of Object.keys(map) as CurrencyCode[]) present.add(code)
  return CURRENCIES.map((c) => c.code).filter((code) => present.has(code))
}
