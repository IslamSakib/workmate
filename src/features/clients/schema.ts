import { z } from "zod"

export const clientSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  company_name: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  country: z.string().optional(),
  notes: z.string().optional(),
})

export type ClientInput = z.infer<typeof clientSchema>
