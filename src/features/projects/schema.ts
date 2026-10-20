import { z } from "zod"

// An empty number input submits as "" — coerce that to null instead of
// Number("") = 0, so clearing "Hourly rate" actually stores null (which is
// what marks a project as fixed-price, not hourly-at-zero). A literal "0"
// means the same thing here (nothing bills at $0/hour in this app), so it
// gets the same treatment — otherwise a fixed-price project with "0" typed
// into Hourly rate never gets recognized as fixed-price.
const emptyToNull = (val: unknown) => (val === "" || val === 0 || val === "0" ? null : val)

export const projectSchema = z.object({
  project_name: z.string().min(1, "Project name is required"),
  client_id: z.string().nullable().optional(),
  hourly_rate: z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable().optional()),
  fixed_price: z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable().optional()),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  /** Agreed rate: 1 unit of `currency` = fx_rate units of the default currency. Empty = use the Settings rate. */
  fx_rate: z.preprocess(emptyToNull, z.coerce.number().positive("Rate must be greater than 0").nullable().optional()),
  fx_base: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]).nullable().optional(),
  status: z.enum(["active", "paused", "completed", "cancelled"]),
  start_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  notes: z.string().optional(),
})

export type ProjectInput = z.infer<typeof projectSchema>
