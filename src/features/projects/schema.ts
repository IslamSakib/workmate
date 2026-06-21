import { z } from "zod"

export const projectSchema = z.object({
  project_name: z.string().min(1, "Project name is required"),
  client_id: z.string().nullable().optional(),
  hourly_rate: z.coerce.number().nonnegative().nullable().optional(),
  fixed_price: z.coerce.number().nonnegative().nullable().optional(),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  status: z.enum(["active", "paused", "completed", "cancelled"]),
  start_date: z.string().nullable().optional(),
  due_date: z.string().nullable().optional(),
  notes: z.string().optional(),
})

export type ProjectInput = z.infer<typeof projectSchema>
