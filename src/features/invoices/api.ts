import { supabase } from "@/lib/supabaseClient"
import type { InvoiceInput } from "./schema"
import type { BillableTask, Invoice, InvoiceItem, InvoiceWithRelations } from "./types"

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
  return rows.map((t) => {
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
}

function totalOf(items: BillableTask[]) {
  return items.reduce((acc, item) => acc + item.amount, 0)
}

export async function createInvoice(input: InvoiceInput, items: BillableTask[]): Promise<Invoice> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      user_id: userId,
      invoice_number: input.invoice_number,
      client_id: input.client_id,
      project_id: input.project_id,
      currency: input.currency,
      status: input.status,
      issue_date: input.issue_date,
      due_date: input.due_date,
      period_start: input.period_start,
      period_end: input.period_end,
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
    task_id: item.id,
    task_name: item.task_name,
    task_date: item.date,
    duration_seconds: item.duration_seconds,
    rate: item.rate,
    amount: item.amount,
  }))
  const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert)
  if (itemsError) throw itemsError

  const { error: linkError } = await supabase
    .from("tasks")
    .update({ invoice_id: invoiceId })
    .in(
      "id",
      items.map((item) => item.id),
    )
  if (linkError) throw linkError
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id)
  if (error) throw error
}
