import { supabase } from "@/lib/supabaseClient"
import type { InvoiceInput } from "./schema"
import type { Invoice, InvoiceItem, InvoiceWithRelations } from "./types"

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
    .order("sort_order", { ascending: true })
  if (error) throw error
  return data ?? []
}

function computeTotals(input: InvoiceInput) {
  const subtotal = input.items.reduce((acc, item) => acc + item.quantity * item.rate, 0)
  const total = subtotal + input.tax - input.discount
  return { subtotal, total }
}

export async function createInvoice(input: InvoiceInput): Promise<Invoice> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  const { subtotal, total } = computeTotals(input)

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
      subtotal,
      tax: input.tax,
      discount: input.discount,
      total,
      notes: input.notes,
    })
    .select()
    .single()
  if (error) throw error

  const itemsToInsert = input.items.map((item, index) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    rate: item.rate,
    amount: item.quantity * item.rate,
    sort_order: index,
  }))
  const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert)
  if (itemsError) throw itemsError

  return invoice
}

export async function updateInvoice(id: string, input: InvoiceInput): Promise<Invoice> {
  const { subtotal, total } = computeTotals(input)

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
      subtotal,
      tax: input.tax,
      discount: input.discount,
      total,
      notes: input.notes,
    })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error

  await supabase.from("invoice_items").delete().eq("invoice_id", id)
  const itemsToInsert = input.items.map((item, index) => ({
    invoice_id: id,
    description: item.description,
    quantity: item.quantity,
    rate: item.rate,
    amount: item.quantity * item.rate,
    sort_order: index,
  }))
  const { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert)
  if (itemsError) throw itemsError

  return invoice
}

export async function deleteInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("invoices").delete().eq("id", id)
  if (error) throw error
}
