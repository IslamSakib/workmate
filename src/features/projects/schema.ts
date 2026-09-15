import { z } from "zod"

// An empty number input submits as "" — coerce that to null instead of
// Number("") = 0, so clearing "Hourly rate" actually stores null (which is
// what marks a project as fixed-price, not hourly-at-zero).
const emptyToNull = (val: unknown) => (val === "" ? null : val)

export const projectSchema = z.object({
  project_name: z.string().min(1, "Project name is required"),
  client_id: z.string().nullable().optional(),
  hourly_rate: z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable().optional()),
  fixed_price: z.preprocess(emptyToNull, z.coerce.number().nonnegative().nullable().optional()),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  status: z.enum(["active", "paused", "completed", "cancelled"]),
  start_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  notes: z.string().optional(),
})

export type ProjectInput = z.infer<typeof projectSchema>
