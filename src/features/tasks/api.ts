import { supabase } from "@/lib/supabaseClient"
import { useAuthStore } from "@/store/authStore"
import type { TaskInput } from "./schema"
import type { Task, TaskWithRelations } from "./types"

export async function listTasks(): Promise<TaskWithRelations[]> {
  const { data, error } = await supabase
    .from("tasks")
    .select("*, projects(project_name), clients(client_name)")
    .order("date", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as TaskWithRelations[]
}

export async function createTask(input: TaskInput): Promise<Task> {
  const accountId = useAuthStore.getState().accountId
  const { data: userData } = await supabase.auth.getUser()
  if (!accountId || !userData.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: accountId, created_by: userData.user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateTask(id: string, input: TaskInput): Promise<Task> {
  const { data, error } = await supabase.from("tasks").update(input).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from("tasks").delete().eq("id", id)
  if (error) throw error
}

export async function submitTask(id: string): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ approval_status: "submitted", submitted_at: new Date().toISOString(), rejection_reason: null })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function approveTask(id: string): Promise<Task> {
  const { data: userData } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from("tasks")
    .update({ approval_status: "approved", approved_by: userData.user?.id, approved_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function rejectTask(id: string, reason: string): Promise<Task> {
  const { data, error } = await supabase
    .from("tasks")
    .update({ approval_status: "rejected", rejection_reason: reason })
    .eq("id", id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function duplicateTask(task: Task): Promise<Task> {
  const accountId = useAuthStore.getState().accountId
  const { data: userData } = await supabase.auth.getUser()
  if (!accountId || !userData.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: accountId,
      created_by: userData.user.id,
      project_id: task.project_id,
      client_id: task.client_id,
      task_name: task.task_name,
      date: task.date,
      start_time: task.start_time,
      end_time: task.end_time,
      duration_seconds: task.duration_seconds,
      billable: task.billable,
      notes: task.notes,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
