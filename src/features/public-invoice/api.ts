import { supabase } from "@/lib/supabaseClient"
import type { PublicInvoice } from "./types"

/**
 * Reads via the get_public_invoice(token) security-definer function, not a
 * direct table select — there is no RLS policy granting anonymous SELECT on
 * invoices, so this is the only way to read invoice data while signed out.
 * Returns null for an unknown/invalid token (no error, so a wrong token
 * can't be used to distinguish "invalid" from "doesn't exist").
 */
export async function getPublicInvoice(token: string): Promise<PublicInvoice | null> {
  const { data, error } = await supabase.rpc("get_public_invoice", { p_token: token })
  if (error) throw error
  return (data as unknown as PublicInvoice | null) ?? null
}
