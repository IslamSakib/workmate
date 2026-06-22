import { addMonths, addWeeks, format } from "date-fns"
import { supabase } from "@/lib/supabaseClient"
import { useAuthStore } from "@/store/authStore"
import { createInvoice, listBillableTasks } from "@/features/invoices/api"
import type { RecurringInvoiceFrequency } from "@/types/database"
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

export async function createRecurringInvoice(input: RecurringInvoiceInput): Promise<RecurringInvoice> {
  const accountId = useAuthStore.getState().accountId
  const { data: userData } = await supabase.auth.getUser()
  if (!accountId || !userData.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("recurring_invoices")
    .insert({ ...input, user_id: accountId, created_by: userData.user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRecurringInvoice(id: string, input: RecurringInvoiceInput): Promise<RecurringInvoice> {
  const { data, error } = await supabase.from("recurring_invoices").update(input).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteRecurringInvoice(id: string): Promise<void> {
  const { error } = await supabase.from("recurring_invoices").delete().eq("id", id)
  if (error) throw error
}

function advance(date: Date, frequency: RecurringInvoiceFrequency): Date {
  if (frequency === "weekly") return addWeeks(date, 1)
  if (frequency === "monthly") return addMonths(date, 1)
  return addMonths(date, 3)
}

/**
 * Generates invoices for any active template whose next_run_date has
 * passed, billing tasks for the period since the prior run. Called lazily
 * on app load (there's no server cron) — see AppShell. Skips creating an
 * invoice when there are no billable tasks for the period but still
 * advances next_run_date so the template doesn't get stuck reprocessing an
 * empty period forever.
 */
export async function generateDueRecurringInvoices(): Promise<number> {
  const today = format(new Date(), "yyyy-MM-dd")
  const { data: due, error } = await supabase
    .from("recurring_invoices")
    .select("*")
    .eq("active", true)
    .lte("next_run_date", today)
  if (error) throw error
  if (!due || due.length === 0) return 0

  let generated = 0
  for (const template of due) {
    const nextRunDate = new Date(template.next_run_date)
    const periodStart = format(
      frequencyBack(nextRunDate, template.frequency as RecurringInvoiceFrequency),
      "yyyy-MM-dd",
    )
    const periodEnd = template.next_run_date

    const items = await listBillableTasks({
      clientId: template.client_id,
      projectId: template.project_id,
      periodStart,
      periodEnd,
    })

    let lastGeneratedInvoiceId = template.last_generated_invoice_id
    if (items.length > 0) {
      const invoice = await createInvoice(
        {
          invoice_number: `REC-${format(nextRunDate, "yyyyMM")}-${template.id.slice(0, 6)}`,
          client_id: template.client_id,
          project_id: template.project_id,
          currency: template.currency,
          status: "draft",
          issue_date: today,
          due_date: null,
          period_start: periodStart,
          period_end: periodEnd,
        },
        items,
      )
      lastGeneratedInvoiceId = invoice.id
      generated += 1
    }

    const updatedNextRunDate = format(advance(nextRunDate, template.frequency as RecurringInvoiceFrequency), "yyyy-MM-dd")
    await supabase
      .from("recurring_invoices")
      .update({ next_run_date: updatedNextRunDate, last_generated_invoice_id: lastGeneratedInvoiceId })
      .eq("id", template.id)
  }

  return generated
}

function frequencyBack(date: Date, frequency: RecurringInvoiceFrequency): Date {
  if (frequency === "weekly") return addWeeks(date, -1)
  if (frequency === "monthly") return addMonths(date, -1)
  return addMonths(date, -3)
}
