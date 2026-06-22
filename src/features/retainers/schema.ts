import { z } from "zod"

export const retainerSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  monthly_fee: z.coerce.number().nonnegative(),
  included_hours: z.coerce.number().nonnegative(),
  overage_rate: z.coerce.number().nonnegative(),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  next_billing_date: z.string().min(1, "Next billing date is required"),
  active: z.boolean(),
  notes: z.string().optional(),
})

export type RetainerInput = z.infer<typeof retainerSchema>
