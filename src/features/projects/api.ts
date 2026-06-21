import { supabase } from "@/lib/supabaseClient"
import type { ProjectInput } from "./schema"
import type { Project, ProjectWithClient } from "./types"

export async function listProjects(): Promise<ProjectWithClient[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*, clients(client_name)")
    .order("created_at", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as ProjectWithClient[]
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("projects")
    .insert({ ...input, user_id: userId })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateProject(id: string, input: ProjectInput): Promise<Project> {
  const { data, error } = await supabase.from("projects").update(input).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from("projects").delete().eq("id", id)
  if (error) throw error
}
