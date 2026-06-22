import type { Tables } from "@/types/database"

export type RecurringInvoice = Tables<"recurring_invoices">
export type RecurringInvoiceWithRelations = RecurringInvoice & {
  clients: { client_name: string } | null
  projects: { project_name: string } | null
}
