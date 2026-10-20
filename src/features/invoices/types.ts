import type { CurrencyCode, Tables } from "@/types/database"

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
  /** True for the synthetic "flat fee" row representing a fixed-price
   * project's total — not a real task, links to no task_id when saved. */
  isFlatFee?: boolean
  /** task (default), flat_fee, amount (advance/milestone request) or advance_credit (negative). */
  kind?: "task" | "flat_fee" | "amount" | "advance_credit"
  credit_invoice_id?: string
}

/** One flat-fee line item (a fixed-price project's total), as actually
 * invoiced — used to recognize that revenue on the invoice's issue_date
 * rather than per logged task. */
export interface FixedFeeRevenueRow {
  invoice_id: string
  amount: number
  issue_date: string
  client_id: string | null
  project_id: string | null
  currency: CurrencyCode
  /** Rate snapshotted on the invoice when it was issued (agreed project rate), if any. */
  fx_rate: number | null
  fx_base: CurrencyCode | null
}

/** Stable id for the synthetic flat-fee row in the invoice form's task list. */
export const FLAT_FEE_ITEM_ID = "flat-fee"
