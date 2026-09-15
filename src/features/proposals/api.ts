import { supabase } from "@/lib/supabaseClient"
import { useAuthStore } from "@/store/authStore"
import type { ProposalInput } from "./schema"
import type { Proposal, ProposalWithClient } from "./types"

export async function listProposals(): Promise<ProposalWithClient[]> {
  const { data, error } = await supabase
    .from("proposals")
    .select("*, clients(client_name)")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as ProposalWithClient[]
}

export async function createProposal(input: ProposalInput): Promise<Proposal> {
  const accountId = useAuthStore.getState().accountId
  const { data: userData } = await supabase.auth.getUser()
  if (!accountId || !userData.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("proposals")
    .insert({ ...input, user_id: accountId, created_by: userData.user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProposal(id: string, input: ProposalInput): Promise<Proposal> {
  const { data, error } = await supabase.from("proposals").update(input).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteProposal(id: string): Promise<void> {
  const { error } = await supabase.from("proposals").delete().eq("id", id)
  if (error) throw error
}

export async function markProposalProjectCreated(id: string, projectId: string): Promise<void> {
  const { error } = await supabase.from("proposals").update({ created_project_id: projectId }).eq("id", id)
  if (error) throw error
}
