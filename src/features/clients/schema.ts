import { z } from "zod"

export const clientSchema = z.object({
  client_name: z.string().min(1, "Client name is required"),
  company_name: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  country: z.string().optional(),
  fx_rate: z.preprocess((v) => (v === "" || v == null || v === 0 || v === "0" ? null : v), z.coerce.number().positive("Rate must be greater than 0").nullable().optional()),
  fx_base: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]).nullable().optional(),
  notes: z.string().optional(),
})

export type ClientInput = z.infer<typeof clientSchema>
