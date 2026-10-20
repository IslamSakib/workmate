import { describe, expect, it } from "vitest"
import { pdfMoney, sanitize } from "./shared"

describe("pdf text safety", () => {
  it("replaces characters Helvetica cannot draw", () => {
    expect(sanitize("৳ 500 কাজ")).toBe("? 500 ???")
  })
  it("formats BDT with its code, not the taka sign", () => {
    expect(pdfMoney(89000, "BDT")).toBe("BDT 89,000.00")
  })
})
