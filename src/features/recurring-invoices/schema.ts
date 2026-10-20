import { z } from "zod"

export const recurringInvoiceSchema = z
  .object({
    client_id: z.string().nullable().optional(),
    project_id: z.string().nullable().optional(),
    currency: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]),
    frequency: z.enum(["weekly", "monthly", "quarterly"]),
    billing_mode: z.enum(["fixed", "tasks"]),
    amount: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().positive().optional()),
    description: z.string().optional(),
    start_date: z.string().min(1, "Start date is required"),
    due_days: z.coerce.number().int().min(0).max(365),
    issue_as: z.enum(["draft", "sent"]),
    ends_on: z.string().nullable().optional(),
    notes: z.string().optional(),
    fx_rate: z.preprocess((v) => (v === "" || v == null || v === 0 || v === "0" ? null : v), z.coerce.number().positive("Rate must be greater than 0").nullable().optional()),
    fx_base: z.enum(["USD", "BDT", "EUR", "GBP", "PHP"]).nullable().optional(),
  })
  .refine((v) => v.billing_mode !== "fixed" || (v.amount ?? 0) > 0, {
    path: ["amount"],
    message: "Enter the amount to bill each period",
  })
  .refine((v) => !v.ends_on || v.ends_on >= v.start_date, {
    path: ["ends_on"],
    message: "End date must be after the start date",
  })

export type RecurringInvoiceInput = z.infer<typeof recurringInvoiceSchema>
