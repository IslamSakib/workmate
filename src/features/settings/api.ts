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
  const { rate_USD, rate_EUR, rate_GBP, rate_PHP, rate_BDT, ...rest } = input
  const all = { USD: rate_USD, EUR: rate_EUR, GBP: rate_GBP, PHP: rate_PHP, BDT: rate_BDT }
  // Rates are "default currency per 1 unit"; the default currency itself is always 1 and never stored.
  const exchange_rates = Object.fromEntries(
    Object.entries(all).filter(([code, v]) => code !== rest.default_currency && v),
  )
  const { error } = await supabase.from("settings").upsert({
    user_id: userId,
    ...rest,
    exchange_rates,
    rates_updated_at: new Date().toISOString(),
    payment_url: input.payment_url || null,
  })
  if (error) throw error
}
