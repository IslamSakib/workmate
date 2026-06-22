import { z } from "zod"

export const recurringInvoiceSchema = z.object({
  client_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  frequency: z.enum(["weekly", "monthly", "quarterly"]),
  next_run_date: z.string().min(1, "Next run date is required"),
  active: z.boolean(),
  notes: z.string().optional(),
})

export type RecurringInvoiceInput = z.infer<typeof recurringInvoiceSchema>
