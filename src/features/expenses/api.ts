import { supabase } from "@/lib/supabaseClient"
import { useAuthStore } from "@/store/authStore"
import type { ExpenseInput } from "./schema"
import type { Expense, ExpenseWithRefs } from "./types"

export async function listExpenses(): Promise<ExpenseWithRefs[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*, clients(client_name), projects(project_name)")
    .order("date", { ascending: false })
  if (error) throw error
  return (data ?? []) as unknown as ExpenseWithRefs[]
}

export async function createExpense(input: ExpenseInput): Promise<Expense> {
  const accountId = useAuthStore.getState().accountId
  const { data: userData } = await supabase.auth.getUser()
  if (!accountId || !userData.user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("expenses")
    .insert({ ...input, user_id: accountId, created_by: userData.user.id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateExpense(id: string, input: ExpenseInput): Promise<Expense> {
  const { data, error } = await supabase.from("expenses").update(input).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id)
  if (error) throw error
}
