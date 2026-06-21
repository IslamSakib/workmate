import { supabase } from "@/lib/supabaseClient"
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
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...input, user_id: userId })
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

export async function duplicateTask(task: Task): Promise<Task> {
  const { data: userData } = await supabase.auth.getUser()
  const userId = userData.user?.id
  if (!userId) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("tasks")
    .insert({
      user_id: userId,
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
