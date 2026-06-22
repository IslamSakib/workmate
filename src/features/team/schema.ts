import { z } from "zod"

export const inviteSchema = z.object({
  invited_email: z.string().email("Enter a valid email"),
  role: z.enum(["admin", "manager", "employee"]),
})

export type InviteInput = z.infer<typeof inviteSchema>
