import { supabase } from "@/lib/supabaseClient"
import { useAuthStore } from "@/store/authStore"
import type { ClientInput } from "./schema"
import type { Client } from "./types"

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createClient(input: ClientInput): Promise<Client> {
  const accountId = useAuthStore.getState().accountId
  const { data: userData } = await supabase.auth.getUser()
  if (!accountId || !userData.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...input, user_id: accountId, created_by: userData.user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClient(id: string, input: ClientInput): Promise<Client> {
  const { data, error } = await supabase.from("clients").update(input).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase.from("clients").delete().eq("id", id)
  if (error) throw error
}

export async function inviteClientToPortal(clientId: string, invitedEmail: string): Promise<void> {
  const accountId = useAuthStore.getState().accountId
  if (!accountId) throw new Error("Not authenticated")

  const { error } = await supabase
    .from("client_portal_access")
    .insert({ account_id: accountId, client_id: clientId, invited_email: invitedEmail, status: "invited" })
  if (error) {
    if (error.code === "23505") throw new Error("This email already has portal access for this client.")
    throw error
  }
}
