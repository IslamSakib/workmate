import { z } from "zod"

export const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce.number().min(0.01, "Quantity must be greater than 0"),
  rate: z.coerce.number().min(0, "Rate must be 0 or more"),
})

export const invoiceSchema = z.object({
  invoice_number: z.string().min(1, "Invoice number is required"),
  client_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  status: z.enum(["draft", "sent", "paid", "overdue"]),
  issue_date: z.string().min(1, "Issue date is required"),
  due_date: z.string().nullable().optional(),
  tax: z.coerce.number().min(0).default(0),
  discount: z.coerce.number().min(0).default(0),
  notes: z.string().optional(),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item"),
})

export type InvoiceInput = z.infer<typeof invoiceSchema>
export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>
