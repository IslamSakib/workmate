import type { CurrencyCode } from "@/types/database"

export interface PublicInvoiceItem {
  task_name: string
  task_date: string
  duration_seconds: number
  rate: number
  amount: number
}

export interface PublicInvoice {
  invoice_number: string
  status: string
  issue_date: string
  due_date: string | null
  total: number
  currency: CurrencyCode
  amount_paid: number
  notes: string | null
  client_name: string | null
  project_name: string | null
  payment_url: string | null
  items: PublicInvoiceItem[]
}
