import { supabase } from "@/lib/supabaseClient"
import type { AuditLog } from "./types"

export async function listAuditLogs(filters?: {
  tableName?: string
  action?: string
}): Promise<AuditLog[]> {
  let query = supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(500)

  if (filters?.tableName) query = query.eq("table_name", filters.tableName)
  if (filters?.action) query = query.eq("action", filters.action)

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
