import { useCallback, useState } from "react"
import type { CurrencyCode } from "@/types/database"

export type ShowIn = CurrencyCode | "original"

const KEY = "workmate.showIn"

function read(): ShowIn | null {
  try {
    return (localStorage.getItem(KEY) as ShowIn | null) ?? null
  } catch {
    return null // storage can be blocked; the choice just won't be remembered
  }
}

/**
 * Which currency totals are shown in: any currency, or "original" (one line per currency).
 * Remembered in this browser; falls back to the default currency until the user picks.
 */
export function useShowIn(base: CurrencyCode): [ShowIn, (v: ShowIn) => void] {
  const [stored, setStored] = useState<ShowIn | null>(read)
  const set = useCallback((v: ShowIn) => {
    setStored(v)
    try {
      localStorage.setItem(KEY, v)
    } catch {
      /* not remembered */
    }
  }, [])
  return [stored ?? base, set]
}
