import { useEffect, useState } from "react"
import { getSettings } from "@/features/settings/api"
import { useAuthStore } from "@/store/authStore"
import type { RateTable } from "@/lib/currency"
import type { CurrencyCode } from "@/types/database"

export interface CurrencySettings {
  /** Default currency: new records start in it and totals can be shown in it. */
  base: CurrencyCode
  /** Units of `base` per 1 unit of each other currency, as set in Settings. */
  rates: RateTable
  loaded: boolean
}

const FALLBACK: CurrencySettings = { base: "BDT", rates: {}, loaded: false }

export function useCurrencySettings(): CurrencySettings {
  const userId = useAuthStore((s) => s.user?.id)
  const [state, setState] = useState<CurrencySettings>(FALLBACK)

  useEffect(() => {
    if (!userId) return
    let active = true
    getSettings(userId)
      .then((s) => {
        if (!active) return
        setState(s ? { base: s.default_currency, rates: s.exchange_rates ?? {}, loaded: true } : { ...FALLBACK, loaded: true })
      })
      // Settings are optional here: fall back to BDT with no rates rather than blocking the page.
      .catch(() => active && setState({ ...FALLBACK, loaded: true }))
    return () => {
      active = false
    }
  }, [userId])

  return state
}
