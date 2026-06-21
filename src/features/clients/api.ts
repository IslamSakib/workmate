import { supabase } from "@/lib/supabaseClient"
import type { ClientInput } from "./schema"
import type { Client } from "./types"

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function createClient(input: ClientInput): Promise<Client> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...input, user_id: userId })
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
