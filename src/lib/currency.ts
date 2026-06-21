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
