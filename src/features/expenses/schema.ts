import { z } from "zod"

export const EXPENSE_CATEGORIES = [
  "Software",
  "Equipment",
  "Travel",
  "Marketing",
  "Contractor",
  "Office",
  "Other",
] as const

export const expenseSchema = z.object({
  client_id: z.string().nullable().optional(),
  project_id: z.string().nullable().optional(),
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().nonnegative(),
  currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
  date: z.string().min(1, "Date is required"),
  description: z.string().optional(),
})

export type ExpenseInput = z.infer<typeof expenseSchema>
