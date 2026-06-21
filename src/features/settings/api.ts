import { supabase } from "@/lib/supabaseClient"
import type { Tables } from "@/types/database"
import type { PreferencesInput, ProfileInput } from "./schema"

export type Profile = Tables<"profiles">
export type Settings = Tables<"settings">

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
  if (error) throw error
  return data
}

export async function getSettings(userId: string): Promise<Settings | null> {
  const { data, error } = await supabase.from("settings").select("*").eq("user_id", userId).maybeSingle()
  if (error) throw error
  return data
}

export async function updateProfile(userId: string, input: ProfileInput): Promise<void> {
  const { error } = await supabase.from("profiles").upsert({ id: userId, ...input })
  if (error) throw error
}

export async function updateSettings(userId: string, input: PreferencesInput): Promise<void> {
  const { error } = await supabase.from("settings").upsert({ user_id: userId, ...input })
  if (error) throw error
}
