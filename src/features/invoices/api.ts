import { supabase } from "@/lib/supabaseClient"
import type { CurrencyCode } from "@/types/database"
import type { InvoiceInput } from "./schema"
import {
  FLAT_FEE_ITEM_ID,
  type BillableTask,
  type FixedFeeRevenueRow,
  type Invoice,
  type InvoiceItem,
  type InvoicePayment,
  type InvoiceWithRelations,
} from "./types"

function friendlyError(error: { code?: string; message: string }): Error {
  if (error.code === "23505") {
    return new Error("An invoice with this number already exists. Choose a different invoice number.")
  }
  return new Error(error.message)
}

export async function listInvoices(): Promise<InvoiceWithRelations[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, clients(client_name, email), projects(project_name)")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as InvoiceWithRelations[]
}

export async function getInvoiceItems(invoiceId: string): Promise<InvoiceItem[]> {
  const { data, error } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("task_date", { ascending: true })
  if (error) throw error
  return data ?? []
}

interface RawBillableTask {
  id: string
  task_name: string
  date: string
  duration_seconds: number
  projects: { project_name: string; hourly_rate: number | null } | null
}

export async function listBillableTasks(filters: {
  clientId?: string | null
  projectId?: string | null
  periodStart: string
  periodEnd: string
  excludeInvoiceId?: string
}): Promise<BillableTask[]> {
  let query = supabase
    .from("tasks")
    .select("id, task_name, date, duration_seconds, projects(project_name, hourly_rate)")
    .gte("date", filters.periodStart)
    .lte("date", filters.periodEnd)
    .eq("billable", true)
    .order("date", { ascending: true })

  query = filters.excludeInvoiceId
    ? query.or(`invoice_id.is.null,invoice_id.eq.${filters.excludeInvoiceId}`)
    : query.is("invoice_id", null)

  if (filters.clientId) query = query.eq("client_id", filters.clientId)
  if (filters.projectId) query = query.eq("project_id", filters.projectId)

  const { data, error } = await query
  if (error) throw error

  const rows = (data ?? []) as unknown as RawBillableTask[]
  const billableTasks = rows.map((t) => {
    const rate = Number(t.projects?.hourly_rate ?? 0)
    return {
      id: t.id,
      task_name: t.task_name,
      date: t.date,
      duration_seconds: t.duration_seconds,
      rate,
      amount: (t.duration_seconds / 3600) * rate,
      project_name: t.projects?.project_name ?? null,
    }
  })

  const flatFeeItem = filters.projectId
    ? await getFlatFeeItemFor(filters.projectId, filters.periodEnd, filters.excludeInvoiceId)
    : null

  return flatFeeItem ? [flatFeeItem, ...billableTasks] : billableTasks
}

/**
 * A fixed-price project bills as one lump sum, not per hour — offer it as a
 * single synthetic line item instead of the (always $0) per-task amounts.
 * Only offered once per project: if any other invoice for this project
 * already carries the flat-fee item (task_id is null), it's considered
 * already billed and isn't offered again.
 */
async function getFlatFeeItemFor(
  projectId: string,
  fallbackDate: string,
  excludeInvoiceId?: string,
): Promise<BillableTask | null> {
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("project_name, hourly_rate, fixed_price")
    .eq("id", projectId)
    .single()
  if (projectError) throw projectError
  if (project.hourly_rate || !project.fixed_price) return null

  const { data: invoices, error: invoicesError } = await supabase
    .from("invoices")
    .select("id")
    .eq("project_id", projectId)
  if (invoicesError) throw invoicesError

  const otherInvoiceIds = (invoices ?? []).map((i) => i.id).filter((id) => id !== excludeInvoiceId)
  if (otherInvoiceIds.length > 0) {
    const { count, error: itemsError } = await supabase
      .from("invoice_items")
      .select("id", { count: "exact", head: true })
      .eq("kind", "flat_fee")
      .in("invoice_id", otherInvoiceIds)
    if (itemsError) throw itemsError
    if ((count ?? 0) > 0) return null
  }

  return {
    id: FLAT_FEE_ITEM_ID,
    task_name: `Fixed price — ${project.project_name}`,
    date: fallbackDate,
    duration_seconds: 0,
    rate: 0,
    amount: Number(project.fixed_price),
    project_name: project.project_name,
    isFlatFee: true,
  }
}

/**
 * All flat-fee line items ever invoiced (task_id is null), with the
 * invoicing invoice's issue_date/client_id/project_id — lets revenue
 * reporting recognize a fixed-price project's income on the invoice rather
 * than never (per-task math is always $0 for a fixed-price project).
 */
export async function listFixedFeeRevenue(fromIssueDate?: string): Promise<FixedFeeRevenueRow[]> {
  let invoiceQuery = supabase.from("invoices").select("id, issue_date, client_id, project_id, currency, fx_rate, fx_base")
  if (fromIssueDate) invoiceQuery = invoiceQuery.gte("issue_date", fromIssueDate)
  const { data: invoices, error: invoicesError } = await invoiceQuery
  if (invoicesError) throw invoicesError
  if (!invoices || invoices.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("invoice_id, amount")
    .eq("kind", "flat_fee")
    .in(
      "invoice_id",
      invoices.map((i) => i.id),
    )
  if (itemsError) throw itemsError

  const invoiceById = new Map(invoices.map((i) => [i.id, i]))
  return (items ?? []).flatMap((item) => {
    const invoice = invoiceById.get(item.invoice_id)
    if (!invoice) return []
    return [
      {
        invoice_id: item.invoice_id,
        amount: Number(item.amount),
        issue_date: invoice.issue_date,
        client_id: invoice.client_id,
        project_id: invoice.project_id,
        currency: invoice.currency,
        fx_rate: invoice.fx_rate == null ? null : Number(invoice.fx_rate),
        fx_base: invoice.fx_base,
      },
    ]
  })
}

type RpcLine =
  | { kind: "task"; task_id: string }
  | { kind: "flat_fee" | "amount"; name: string; amount: number }
  | { kind: "advance_credit"; credit_invoice_id: string }

function toRpcLines(items: BillableTask[]): RpcLine[] {
  return items.map((i): RpcLine => {
    if (i.kind === "advance_credit") return { kind: "advance_credit", credit_invoice_id: i.credit_invoice_id as string }
    if (i.kind === "amount") return { kind: "amount", name: i.task_name, amount: i.amount }
    if (i.isFlatFee) return { kind: "flat_fee", name: i.task_name, amount: i.amount }
    return { kind: "task", task_id: i.id }
  })
}

function rpcPayload(input: InvoiceInput, items: BillableTask[]) {
  return { ...input, kind: input.kind ?? "standard", items: toRpcLines(items) }
}

/** The database assigns the number from the account's prefix and counter (atomic, never repeats). */
export async function nextInvoiceNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("next_invoice_number")
  if (error) throw error
  return data
}

// Totals, rounding, task linking and credit checks all happen inside one database transaction
// (create_invoice / update_invoice, migration 0018), so a failure never leaves a half-written invoice.
export async function createInvoice(input: InvoiceInput, items: BillableTask[]): Promise<Invoice> {
  const { data, error } = await supabase.rpc("create_invoice", { p: rpcPayload(input, items) })
  if (error) throw friendlyError(error)
  return data as Invoice
}

export async function updateInvoice(id: string, input: InvoiceInput, items: BillableTask[]): Promise<Invoice> {
  const { data, error } = await supabase.rpc("update_invoice", { p_id: id, p: rpcPayload(input, items) })
  if (error) throw friendlyError(error)
  return data as Invoice
}

export interface CreditableAdvance {
  id: string
  invoice_number: string
  kind: "advance" | "milestone"
  /** What has actually been received so far; this is what the final invoice credits. */
  amount_paid: number
  currency: CurrencyCode
}

/**
 * Advance/milestone invoices with money received that no other invoice has credited yet,
 * so they can be deducted on the final invoice. Credits already on `excludeInvoiceId` stay selectable.
 */
export async function listCreditableAdvances(filters: {
  projectId?: string | null
  clientId?: string | null
  currency: CurrencyCode
  excludeInvoiceId?: string
}): Promise<CreditableAdvance[]> {
  if (!filters.projectId && !filters.clientId) return []
  let q = supabase
    .from("invoices")
    .select("id, invoice_number, kind, amount_paid, currency")
    .in("kind", ["advance", "milestone"])
    .gt("amount_paid", 0)
    .eq("currency", filters.currency)
  q = filters.projectId ? q.eq("project_id", filters.projectId) : q.eq("client_id", filters.clientId as string)
  const { data, error } = await q
  if (error) throw error
  const advances = (data ?? []) as unknown as CreditableAdvance[]
  if (advances.length === 0) return []

  const { data: used, error: usedError } = await supabase
    .from("invoice_items")
    .select("credit_invoice_id, invoice_id")
    .eq("kind", "advance_credit")
    .in("credit_invoice_id", advances.map((a) => a.id))
  if (usedError) throw usedError
  const taken = new Set((used ?? []).filter((u) => u.invoice_id !== filters.excludeInvoiceId).map((u) => u.credit_invoice_id))
  return advances.filter((a) => !taken.has(a.id)).map((a) => ({ ...a, amount_paid: Number(a.amount_paid) }))
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id)
  if (error) throw error
}

export async function getInvoicePayments(invoiceId: string): Promise<InvoicePayment[]> {
  const { data, error } = await supabase
    .from("invoice_payments")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("paid_date", { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function recordPayment(
  invoiceId: string,
  payment: {
    amount: number
    paid_date: string
    method?: string | null
    reference?: string | null
    fx_rate?: number | null
    notes?: string | null
  },
): Promise<void> {
  // A database trigger keeps amount_paid and the status in sync and rejects overpayment.
  const { error } = await supabase.from("invoice_payments").insert({ invoice_id: invoiceId, ...payment })
  if (error) throw error
}

export async function deletePayment(paymentId: string): Promise<void> {
  const { error } = await supabase.from("invoice_payments").delete().eq("id", paymentId)
  if (error) throw error
}

/** Flips this account's scheduled invoices whose scheduled_date has passed to "sent". Lazy housekeeping, no toast. */
export async function promoteScheduledInvoices(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from("invoices")
    .update({ status: "sent" })
    .eq("status", "scheduled")
    .lte("scheduled_date", today)
  if (error) throw error
}

export async function recordReminderSent(invoiceId: string): Promise<void> {
  const { data: invoice, error: fetchError } = await supabase
    .from("invoices")
    .select("reminder_count")
    .eq("id", invoiceId)
    .single()
  if (fetchError) throw fetchError

  const { error } = await supabase
    .from("invoices")
    .update({ last_reminder_sent_at: new Date().toISOString(), reminder_count: invoice.reminder_count + 1 })
    .eq("id", invoiceId)
  if (error) throw error
}
