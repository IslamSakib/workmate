import type { Tables } from "@/types/database"

export type RecurringInvoice = Tables<"recurring_invoices">
export type RecurringInvoiceWithRelations = RecurringInvoice & {
  clients: { client_name: string } | null
  projects: { project_name: string } | null
  recurring_amount_changes: { effective_from: string; amount: number }[]
}

/** The amount that applies today: latest raise already in effect, else the base amount. */
export function currentAmount(r: RecurringInvoiceWithRelations, today = new Date().toISOString().slice(0, 10)): number | null {
  const change = [...(r.recurring_amount_changes ?? [])]
    .filter((c) => c.effective_from <= today)
    .sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0]
  return change ? Number(change.amount) : r.amount == null ? null : Number(r.amount)
}
