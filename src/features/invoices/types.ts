import type { Tables } from "@/types/database"

export type Invoice = Tables<"invoices">
export type InvoiceItem = Tables<"invoice_items">
export type InvoiceWithRelations = Invoice & {
  clients: { client_name: string; email: string | null } | null
  projects: { project_name: string } | null
}
