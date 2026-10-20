import type { CurrencyCode } from "@/types/database"

export const CURRENCIES: { code: CurrencyCode; label: string; locale: string }[] = [
  { code: "USD", label: "US Dollar", locale: "en-US" },
  { code: "BDT", label: "Bangladeshi Taka", locale: "en-US" },
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

/** Units of the base currency per 1 unit of each currency (base itself is implicitly 1). */
export type RateTable = Partial<Record<CurrencyCode, number>>

export interface ConvertResult {
  /** Total in the target currency, counting only amounts that had a rate. */
  total: number
  /** Currencies that had an amount but no usable rate; shown to the user, never silently dropped. */
  missing: CurrencyCode[]
}

/**
 * Convert `amounts` into `target` via the base currency. `rates[X]` is how many `base`
 * units one X is worth; a project's agreed rate is applied by the caller before this
 * (it simply produces already-converted amounts), so this handles the shared table only.
 */
export function convertAmounts(
  amounts: CurrencyAmounts,
  target: CurrencyCode,
  base: CurrencyCode,
  rates: RateTable,
): ConvertResult {
  const toBase = (code: CurrencyCode) => (code === base ? 1 : rates[code])
  const targetInBase = toBase(target)
  const missing: CurrencyCode[] = []
  let total = 0
  for (const [code, amount] of Object.entries(amounts) as [CurrencyCode, number][]) {
    if (!amount) continue
    if (code === target) {
      total += amount
      continue
    }
    const from = toBase(code)
    if (!from || !targetInBase) {
      missing.push(code)
      continue
    }
    total += (amount * from) / targetInBase
  }
  return { total, missing }
}

/** Amount of a project's currency expressed in `project.fx_base` using its agreed rate, else null. */
export function applyAgreedRate(amount: number, agreedRate: number | null | undefined): number | null {
  return agreedRate && agreedRate > 0 ? amount * agreedRate : null
}

export interface BaseTotal {
  /** Amount expressed in the default (base) currency. */
  total: number
  /** Currencies that had money but no rate (neither agreed nor in Settings). */
  missing: CurrencyCode[]
}

export const EMPTY_BASE_TOTAL: BaseTotal = { total: 0, missing: [] }

/** Base units per 1 unit of `code`: a project's agreed rate wins over the Settings rate table. */
export function rateToBase(
  code: CurrencyCode,
  base: CurrencyCode,
  rates: RateTable,
  agreed?: { rate: number | null; base: CurrencyCode | null } | null,
): number | null {
  if (code === base) return 1
  if (agreed?.rate && agreed.rate > 0 && agreed.base === base) return agreed.rate
  return rates[code] ?? null
}

export function addBaseTotal(acc: BaseTotal, amount: number, code: CurrencyCode, rate: number | null): BaseTotal {
  if (!amount) return acc
  if (rate == null) return { total: acc.total, missing: acc.missing.includes(code) ? acc.missing : [...acc.missing, code] }
  return { total: acc.total + amount * rate, missing: acc.missing }
}

/** Re-express a base-currency total in another currency using the Settings table. Null when no rate exists. */
export function baseToCurrency(total: number, target: CurrencyCode, base: CurrencyCode, rates: RateTable): number | null {
  if (target === base) return total
  const r = rates[target]
  return r ? total / r : null
}
