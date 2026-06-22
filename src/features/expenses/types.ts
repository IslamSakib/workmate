import type { Tables } from "@/types/database"

export type Expense = Tables<"expenses">
export type ExpenseWithRefs = Expense & {
  clients: { client_name: string } | null
  projects: { project_name: string } | null
}
