import { describe, expect, it } from "vitest"
import { applyAgreedRate, convertAmounts } from "./currency"

describe("convertAmounts", () => {
  const rates = { USD: 120, EUR: 130 }
  it("converts via base", () => {
    expect(convertAmounts({ USD: 10, BDT: 500 }, "BDT", "BDT", rates).total).toBe(1700)
  })
  it("cross-converts USD to EUR through base", () => {
    expect(convertAmounts({ USD: 130 }, "EUR", "BDT", rates).total).toBeCloseTo(120)
  })
  it("reports missing rates instead of dropping silently", () => {
    const r = convertAmounts({ GBP: 5, BDT: 100 }, "BDT", "BDT", rates)
    expect(r.total).toBe(100)
    expect(r.missing).toEqual(["GBP"])
  })
})

describe("applyAgreedRate", () => {
  it("uses the agreed rate", () => expect(applyAgreedRate(100, 118.5)).toBe(11850))
  it("returns null without one", () => expect(applyAgreedRate(100, null)).toBeNull())
})

import { addBaseTotal, baseToCurrency, EMPTY_BASE_TOTAL, rateToBase } from "./currency"

describe("agreed project rates", () => {
  const table = { USD: 120 }
  it("prefers the project's agreed rate over the Settings table", () => {
    expect(rateToBase("USD", "BDT", table, { rate: 118, base: "BDT" })).toBe(118)
  })
  it("ignores an agreed rate quoted against a different base", () => {
    expect(rateToBase("USD", "BDT", table, { rate: 0.9, base: "EUR" })).toBe(120)
  })
  it("returns null when no rate exists", () => {
    expect(rateToBase("GBP", "BDT", table)).toBeNull()
  })
  it("sums mixed currencies in base and reports the ones without a rate", () => {
    let t = addBaseTotal(EMPTY_BASE_TOTAL, 100, "USD", 118)
    t = addBaseTotal(t, 5000, "BDT", 1)
    t = addBaseTotal(t, 10, "GBP", null)
    expect(t.total).toBe(16800)
    expect(t.missing).toEqual(["GBP"])
  })
  it("re-expresses a base total in another currency", () => {
    expect(baseToCurrency(12000, "USD", "BDT", table)).toBe(100)
    expect(baseToCurrency(12000, "EUR", "BDT", table)).toBeNull()
  })
})
