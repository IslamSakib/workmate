import { supabase } from "@/lib/supabaseClient"
import { useAuthStore } from "@/store/authStore"
import type { InviteInput } from "./schema"
import type { TeamMember, TeamRole } from "./types"

export async function listTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from("team_members")
    .select("*")
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function inviteTeamMember(input: InviteInput): Promise<TeamMember> {
  const accountId = useAuthStore.getState().accountId
  if (!accountId) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("team_members")
    .insert({ account_id: accountId, invited_email: input.invited_email, role: input.role, status: "invited" })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTeamMemberRole(id: string, role: TeamRole): Promise<TeamMember> {
  const { data, error } = await supabase.from("team_members").update({ role }).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function removeTeamMember(id: string): Promise<void> {
  const { error } = await supabase.from("team_members").delete().eq("id", id)
  if (error) throw error
}
