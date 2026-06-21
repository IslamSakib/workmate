import { supabase } from "@/lib/supabaseClient"

export interface RecentSession {
  id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number
  task_name: string | null
  project_name: string | null
  client_name: string | null
}

interface RawSession {
  id: string
  started_at: string
  ended_at: string | null
  duration_seconds: number
  tasks: { task_name: string } | null
  projects: { project_name: string } | null
  clients: { client_name: string } | null
}

export async function listRecentSessions(limit = 8): Promise<RecentSession[]> {
  const { data, error } = await supabase
    .from("time_entries")
    .select(
      "id, started_at, ended_at, duration_seconds, tasks(task_name), projects(project_name), clients(client_name)",
    )
    .eq("is_running", false)
    .order("started_at", { ascending: false })
    .limit(limit)
  if (error) throw error
  const rows = (data ?? []) as unknown as RawSession[]
  return rows.map((d) => ({
    id: d.id,
    started_at: d.started_at,
    ended_at: d.ended_at,
    duration_seconds: d.duration_seconds,
    task_name: d.tasks?.task_name ?? null,
    project_name: d.projects?.project_name ?? null,
    client_name: d.clients?.client_name ?? null,
  }))
}
