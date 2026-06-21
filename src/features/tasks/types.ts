import type { Tables } from "@/types/database"

export type Task = Tables<"tasks">
export type TaskWithRelations = Task & {
  projects: { project_name: string } | null
  clients: { client_name: string } | null
}
