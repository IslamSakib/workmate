import { format, startOfMonth } from "date-fns"
import { supabase } from "@/lib/supabaseClient"
import { useAuthStore } from "@/store/authStore"
import type { RetainerInput } from "./schema"
import type { Retainer, RetainerUsage, RetainerWithClient } from "./types"

export async function listRetainers(): Promise<RetainerWithClient[]> {
  const { data, error } = await supabase
    .from("retainers")
    .select("*, clients(client_name)")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as RetainerWithClient[]
}

export async function createRetainer(input: RetainerInput): Promise<Retainer> {
  const accountId = useAuthStore.getState().accountId
  const { data: userData } = await supabase.auth.getUser()
  if (!accountId || !userData.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("retainers")
    .insert({ ...input, user_id: accountId, created_by: userData.user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateRetainer(id: string, input: RetainerInput): Promise<Retainer> {
  const { data, error } = await supabase.from("retainers").update(input).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteRetainer(id: string): Promise<void> {
  const { error } = await supabase.from("retainers").delete().eq("id", id)
  if (error) throw error
}

/**
 * Usage is derived from billable tasks logged for the retainer's client this
 * calendar month — there is no retainer_id column on tasks. A client with
 * both a retainer and separate non-retainer billable work will have all of
 * that month's hours counted here; acceptable for v1.
 */
export async function getRetainerUsage(
  retainers: RetainerWithClient[],
): Promise<Map<string, RetainerUsage>> {
  const usage = new Map<string, RetainerUsage>()
  if (retainers.length === 0) return usage

  const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd")
  const { data, error } = await supabase
    .from("tasks")
    .select("client_id, duration_seconds")
    .eq("billable", true)
    .gte("date", monthStart)
  if (error) throw error

  const hoursByClient = new Map<string, number>()
  for (const row of data ?? []) {
    if (!row.client_id) continue
    hoursByClient.set(row.client_id, (hoursByClient.get(row.client_id) ?? 0) + row.duration_seconds / 3600)
  }

  for (const retainer of retainers) {
    const usedHours = hoursByClient.get(retainer.client_id) ?? 0
    const includedHours = retainer.included_hours
    const overageHours = Math.max(0, usedHours - includedHours)
    usage.set(retainer.id, {
      used_hours: usedHours,
      included_hours: includedHours,
      remaining_hours: Math.max(0, includedHours - usedHours),
      overage_hours: overageHours,
      overage_amount: overageHours * retainer.overage_rate,
    })
  }

  return usage
}
