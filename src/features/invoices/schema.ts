import { z } from "zod"

export const invoiceSchema = z.object({
  invoice_number: z.string().min(1, "Invoice number is required"),
  client_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().nullable().optional(),
  period_start: z.string().min(1, "Billing period start is required"),
  period_end: z.string().min(1, "Billing period end is required"),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>
