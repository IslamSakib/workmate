import { supabase } from "@/lib/supabaseClient"
import type { PortalInvoiceItem, PortalProject, PortalTask } from "./types"
import type { InvoiceWithRelations } from "@/features/invoices/types"

export async function getPortalProjects(): Promise<PortalProject[]> {
  const { data, error } = await supabase.from("projects").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPortalTasks(): Promise<PortalTask[]> {
  const { data, error } = await supabase.from("tasks").select("*").order("date", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function getPortalInvoices(): Promise<InvoiceWithRelations[]> {
  const { data, error } = await supabase
    .from("invoices")
    .select("*, clients(client_name, email), projects(project_name)")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as InvoiceWithRelations[]
}

export async function getPortalInvoiceItems(invoiceId: string): Promise<PortalInvoiceItem[]> {
  const { data, error } = await supabase
    .from("invoice_items")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("task_date", { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function approveProjectDeliverable(projectId: string): Promise<void> {
  const { error } = await supabase.rpc("approve_project_deliverable", { target_project_id: projectId })
  if (error) throw error
}
