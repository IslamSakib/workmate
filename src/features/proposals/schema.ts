import { z } from "zod"

export const proposalSchema = z.object({
  client_id: z.string().min(1, "Client is required"),
  project_name: z.string().min(1, "Project name is required"),
  description: z.string().optional(),
  amount: z.coerce.number().nonnegative(),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  status: z.enum(["draft", "sent", "accepted", "declined"]),
  valid_until: z.string().nullable().optional(),
})

export type ProposalInput = z.infer<typeof proposalSchema>
