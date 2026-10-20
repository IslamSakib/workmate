import { z } from "zod"

export const profileSchema = z.object({
  display_name: z.string().min(1, "Name is required"),
})
export type ProfileInput = z.infer<typeof profileSchema>

const rate = z.preprocess(
  (v) => (v === "" || v == null ? undefined : v),
  z.coerce.number().positive("Must be greater than 0").optional(),
)

export const preferencesSchema = z.object({
  rate_USD: rate,
  rate_EUR: rate,
  rate_GBP: rate,
  rate_PHP: rate,
  rate_BDT: rate,
  default_currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  date_format: z.string().min(1),
  invoice_prefix: z.string().min(1),
  tax_rate_pct: z.coerce.number().min(0).max(100),
  payment_url: z.string().trim().optional(),
})
export type PreferencesInput = z.infer<typeof preferencesSchema>
export const RATE_FIELDS = ["USD", "EUR", "GBP", "PHP", "BDT"] as const
