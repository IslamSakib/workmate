import { z } from "zod"

export const profileSchema = z.object({
  display_name: z.string().min(1, "Name is required"),
})
export type ProfileInput = z.infer<typeof profileSchema>

export const preferencesSchema = z.object({
  default_currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  date_format: z.string().min(1),
  invoice_prefix: z.string().min(1),
})
export type PreferencesInput = z.infer<typeof preferencesSchema>
