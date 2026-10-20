import { describe, expect, it } from "vitest"
import { durationBetween } from "./schema"

describe("durationBetween", () => {
  it("counts an overnight task as running into the next day", () => {
    expect(durationBetween("22:39", "00:43")).toBe((2 * 60 + 4) * 60)
    expect(durationBetween("22:00", "00:00")).toBe(2 * 3600)
  })
  it("handles a same-day task and rejects zero length or missing times", () => {
    expect(durationBetween("09:00", "10:30")).toBe(5400)
    expect(durationBetween("09:00", "09:00")).toBeNull()
    expect(durationBetween("", "09:00")).toBeNull()
  })
})
