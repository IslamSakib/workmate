import { supabase } from "@/lib/supabaseClient"
import type { PublicProposal } from "./types"

/** Same pattern as get_public_invoice — see src/features/public-invoice/api.ts. */
export async function getPublicProposal(token: string): Promise<PublicProposal | null> {
  const { data, error } = await supabase.rpc("get_public_proposal", { p_token: token })
  if (error) throw error
  return (data as unknown as PublicProposal | null) ?? null
}

/**
 * The only anonymous write path in this app. Scoped server-side to exactly
 * one row and one transition (sent -> accepted) — see accept_public_proposal
 * in 0015_proposals.sql. Returns false rather than throwing when the
 * proposal isn't in an acceptable state (already decided, expired, or not
 * yet sent), so the UI can show a normal "can't accept this" message.
 */
export async function acceptPublicProposal(token: string, acceptedName: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("accept_public_proposal", {
    p_token: token,
    p_accepted_name: acceptedName,
  })
  if (error) throw error
  return Boolean((data as { success?: boolean } | null)?.success)
}
