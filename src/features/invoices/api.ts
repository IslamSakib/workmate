import { supabase } from "@/lib/supabaseClient"
import { useAuthStore } from "@/store/authStore"
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
  if (project.hourly_rate != null || !project.fixed_price) return null

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
      .is("task_id", null)
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
  let invoiceQuery = supabase.from("invoices").select("id, issue_date, client_id, project_id")
  if (fromIssueDate) invoiceQuery = invoiceQuery.gte("issue_date", fromIssueDate)
  const { data: invoices, error: invoicesError } = await invoiceQuery
  if (invoicesError) throw invoicesError
  if (!invoices || invoices.length === 0) return []

  const { data: items, error: itemsError } = await supabase
    .from("invoice_items")
    .select("invoice_id, amount")
    .is("task_id", null)
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
      },
    ]
  })
}

function totalOf(items: BillableTask[]) {
  return items.reduce((acc, item) => acc + item.amount, 0)
}

export async function createInvoice(input: InvoiceInput, items: BillableTask[]): Promise<Invoice> {
  const accountId = useAuthStore.getState().accountId
  const { data: userData } = await supabase.auth.getUser()
  if (!accountId || !userData.user) throw new Error("Not authenticated")

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      user_id: accountId,
      created_by: userData.user.id,
      invoice_number: input.invoice_number,
      client_id: input.client_id,
      project_id: input.project_id,
      currency: input.currency,
      status: input.status,
      issue_date: input.issue_date,
      due_date: input.due_date,
      period_start: input.period_start,
      period_end: input.period_end,
      scheduled_date: input.scheduled_date,
      notes: input.notes,
      total: totalOf(items),
    })
    .select()
    .single()
  if (error) throw friendlyError(error)

  await linkInvoiceItems(invoice.id, items)

  return invoice
}

export async function updateInvoice(id: string, input: InvoiceInput, items: BillableTask[]): Promise<Invoice> {
  await supabase.from("tasks").update({ invoice_id: null }).eq("invoice_id", id)
  await supabase.from("invoice_items").delete().eq("invoice_id", id)

  const { data: invoice, error } = await supabase
    .from("invoices")
    .update({
      invoice_number: input.invoice_number,
      client_id: input.client_id,
      project_id: input.project_id,
      currency: input.currency,
      status: input.status,
      issue_date: input.issue_date,
      due_date: input.due_date,
      period_start: input.period_start,
      period_end: input.period_end,
      scheduled_date: input.scheduled_date,
      notes: input.notes,
      total: totalOf(items),
    })
    .eq("id", id)
    .select()
    .single()
  if (error) throw friendlyError(error)

  await linkInvoiceItems(id, items)

  return invoice
}

async function linkInvoiceItems(invoiceId: string, items: BillableTask[]) {
  if (items.length === 0) return

  const itemsToInsert = items.map((item) => ({
    invoice_id: invoiceId,
    task_id: item.isFlatFee ? null : item.id,
    task_name: item.task_name,
    task_date: item.date,
    duration_seconds: item.duration_seconds,
    rate: item.rate,
    amount: item.amount,
  }))
  const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert)
  if (itemsError) throw itemsError

  const realTaskIds = items.filter((item) => !item.isFlatFee).map((item) => item.id)
  if (realTaskIds.length > 0) {
    const { error: linkError } = await supabase
      .from("tasks")
      .update({ invoice_id: invoiceId })
      .in("id", realTaskIds)
    if (linkError) throw linkError
  }
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

/**
 * Recomputes amount_paid and status from the invoice_payments rows that
 * actually exist — always sets an explicit status (never "no change") so
 * deleting a payment correctly un-pays an invoice, not just adding one.
 */
async function recomputePaymentStatus(invoiceId: string): Promise<void> {
  const { data: payments, error: paymentsError } = await supabase
    .from("invoice_payments")
    .select("amount")
    .eq("invoice_id", invoiceId)
  if (paymentsError) throw paymentsError

  const { data: invoice, error: invoiceError } = await supabase
    .from("invoices")
    .select("total")
    .eq("id", invoiceId)
    .single()
  if (invoiceError) throw invoiceError

  const amountPaid = (payments ?? []).reduce((acc, p) => acc + Number(p.amount), 0)
  const status = amountPaid >= Number(invoice.total) ? "paid" : amountPaid > 0 ? "partial" : "sent"

  const { error: updateError } = await supabase
    .from("invoices")
    .update({ amount_paid: amountPaid, status })
    .eq("id", invoiceId)
  if (updateError) throw updateError
}

export async function recordPayment(
  invoiceId: string,
  payment: { amount: number; paid_date: string; method?: string | null; notes?: string | null },
): Promise<void> {
  const { error: insertError } = await supabase.from("invoice_payments").insert({
    invoice_id: invoiceId,
    amount: payment.amount,
    paid_date: payment.paid_date,
    method: payment.method,
    notes: payment.notes,
  })
  if (insertError) throw insertError

  await recomputePaymentStatus(invoiceId)
}

export async function deletePayment(paymentId: string, invoiceId: string): Promise<void> {
  const { error } = await supabase.from("invoice_payments").delete().eq("id", paymentId)
  if (error) throw error

  await recomputePaymentStatus(invoiceId)
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
