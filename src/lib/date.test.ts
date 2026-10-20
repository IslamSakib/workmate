import { describe, expect, it } from "vitest"
import { formatDate } from "./date"

describe("formatDate", () => {
  it("writes the month name", () => {
    expect(formatDate("2026-08-01")).toBe("1 Aug 2026")
    expect(formatDate("2026-12-31T23:00:00Z")).toBe("31 Dec 2026")
  })
  it("falls back for empty input", () => {
    expect(formatDate(null)).toBe("-")
    expect(formatDate("", "—")).toBe("—")
  })
})
