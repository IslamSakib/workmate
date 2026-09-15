import { format } from "date-fns"
import { supabase } from "@/lib/supabaseClient"

export type CalendarEventType = "invoice_due" | "project_due" | "proposal_deadline" | "recurring_invoice"

export interface CalendarEvent {
  date: string
  type: CalendarEventType
  label: string
  to: string
}

export async function getCalendarEvents(from: Date, to: Date): Promise<CalendarEvent[]> {
  const fromStr = format(from, "yyyy-MM-dd")
  const toStr = format(to, "yyyy-MM-dd")

  const [invoicesRes, projectsRes, proposalsRes, recurringRes] = await Promise.all([
    supabase
      .from("invoices")
      .select("invoice_number, due_date, status, clients(client_name)")
      .not("due_date", "is", null)
      .neq("status", "paid")
      .gte("due_date", fromStr)
      .lte("due_date", toStr),
    supabase
      .from("projects")
      .select("project_name, due_date")
      .not("due_date", "is", null)
      .neq("status", "completed")
      .neq("status", "cancelled")
      .gte("due_date", fromStr)
      .lte("due_date", toStr),
    supabase
      .from("proposals")
      .select("project_name, valid_until, clients(client_name)")
      .eq("status", "sent")
      .not("valid_until", "is", null)
      .gte("valid_until", fromStr)
      .lte("valid_until", toStr),
    supabase
      .from("recurring_invoices")
      .select("next_run_date, clients(client_name), projects(project_name)")
      .eq("active", true)
      .gte("next_run_date", fromStr)
      .lte("next_run_date", toStr),
  ])

  const events: CalendarEvent[] = []

  for (const i of (invoicesRes.data ?? []) as unknown as {
    invoice_number: string
    due_date: string
    clients: { client_name: string } | null
  }[]) {
    events.push({
      date: i.due_date,
      type: "invoice_due",
      label: `Invoice ${i.invoice_number} due${i.clients?.client_name ? ` — ${i.clients.client_name}` : ""}`,
      to: "/invoices",
    })
  }

  for (const p of (projectsRes.data ?? []) as unknown as { project_name: string; due_date: string }[]) {
    events.push({ date: p.due_date, type: "project_due", label: `${p.project_name} due`, to: "/projects" })
  }

  for (const p of (proposalsRes.data ?? []) as unknown as {
    project_name: string
    valid_until: string
    clients: { client_name: string } | null
  }[]) {
    events.push({
      date: p.valid_until,
      type: "proposal_deadline",
      label: `Proposal "${p.project_name}" expires${p.clients?.client_name ? ` — ${p.clients.client_name}` : ""}`,
      to: "/proposals",
    })
  }

  for (const r of (recurringRes.data ?? []) as unknown as {
    next_run_date: string
    clients: { client_name: string } | null
    projects: { project_name: string } | null
  }[]) {
    events.push({
      date: r.next_run_date,
      type: "recurring_invoice",
      label: `Recurring invoice generates${r.clients?.client_name ? ` — ${r.clients.client_name}` : r.projects?.project_name ? ` — ${r.projects.project_name}` : ""}`,
      to: "/recurring-invoices",
    })
  }

  return events.sort((a, b) => a.date.localeCompare(b.date))
}
