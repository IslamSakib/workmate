import type { Tables } from "@/types/database"

export type Invoice = Tables<"invoices">
export type InvoiceItem = Tables<"invoice_items">
export type InvoicePayment = Tables<"invoice_payments">
export type InvoiceWithRelations = Invoice & {
  clients: { client_name: string; email: string | null } | null
  projects: { project_name: string } | null
}

export interface BillableTask {
  id: string
  task_name: string
  date: string
  duration_seconds: number
  rate: number
  amount: number
  project_name: string | null
}
