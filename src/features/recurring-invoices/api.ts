import { supabase } from "@/lib/supabaseClient"
import { useAuthStore } from "@/store/authStore"
import type { RecurringInvoiceInput } from "./schema"
import type { RecurringInvoice, RecurringInvoiceWithRelations } from "./types"

export async function listRecurringInvoices(): Promise<RecurringInvoiceWithRelations[]> {
  const { data, error } = await supabase
    .from("recurring_invoices")
    .select("*, clients(client_name), projects(project_name)")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as RecurringInvoiceWithRelations[]
}

function toRow(input: RecurringInvoiceInput) {
  return {
    ...input,
    amount: input.billing_mode === "fixed" ? (input.amount ?? null) : null,
    ends_on: input.ends_on || null,
    description: input.description || null,
    notes: input.notes || null,
  }
}

export async function createRecurringInvoice(input: RecurringInvoiceInput): Promise<RecurringInvoice> {
  const accountId = useAuthStore.getState().accountId
  const { data: userData } = await supabase.auth.getUser()
  if (!accountId || !userData.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("recurring_invoices")
    .insert({
      ...toRow(input),
      next_run_date: input.start_date,
      user_id: accountId,
      created_by: userData.user.id,
      active: true,
    })
    .select()
    .single()
  if (error) throw error
  return data
}

/** The start date is fixed once periods have been generated, since run dates are derived from it. */
export async function updateRecurringInvoice(
  existing: RecurringInvoice,
  input: RecurringInvoiceInput,
): Promise<RecurringInvoice> {
  const row = toRow(input)
  const patch: Partial<typeof row> & { next_run_date?: string } = { ...row }
  if (existing.periods_generated > 0) delete patch.start_date
  else patch.next_run_date = input.start_date
  const { data, error } = await supabase.from("recurring_invoices").update(patch).eq("id", existing.id).select().single()
  if (error) throw error
  return data
}

export async function setRecurringActive(id: string, active: boolean): Promise<void> {
  const { error } = await supabase.from("recurring_invoices").update({ active }).eq("id", id)
  if (error) throw error
}

export async function deleteRecurringInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("recurring_invoices").delete().eq("id", id)
  if (error) throw error
}

/** Creates every invoice that is due (server-side, idempotent). Returns how many were created. */
export async function generateDueRecurringInvoices(): Promise<number> {
  const { data, error } = await supabase.rpc("generate_recurring_invoices")
  if (error) throw error
  return data ?? 0
}
