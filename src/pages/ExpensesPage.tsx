import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { createExpense, deleteExpense, listExpenses, updateExpense } from "@/features/expenses/api"
import { ExpenseFormDialog } from "@/features/expenses/components/ExpenseFormDialog"
import { getExpenseColumns } from "@/features/expenses/components/columns"
import type { ExpenseWithRefs } from "@/features/expenses/types"
import type { ExpenseInput } from "@/features/expenses/schema"
import { hasMinRole } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"

export default function ExpensesPage() {
  const role = useAuthStore((s) => s.role)
  const readOnly = !hasMinRole(role, "admin")
  const [expenses, setExpenses] = useState<ExpenseWithRefs[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ExpenseWithRefs | null>(null)
  const [deleting, setDeleting] = useState<ExpenseWithRefs | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null)
      setFormOpen(true)
      setSearchParams((prev) => {
        prev.delete("new")
        return prev
      })
    }
  }, [searchParams, setSearchParams])

  const load = async () => {
    setLoading(true)
    try {
      setExpenses(await listExpenses())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load expenses")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: ExpenseInput) => {
    if (editing) {
      await updateExpense(editing.id, values)
      toast.success("Expense updated")
    } else {
      await createExpense(values)
      toast.success("Expense created")
    }
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteExpense(deleting.id)
      toast.success("Expense deleted")
      setDeleting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete expense")
    }
  }

  const columns = getExpenseColumns({
    onEdit: (expense) => {
      setEditing(expense)
      setFormOpen(true)
    },
    onDelete: (expense) => setDeleting(expense),
    readOnly,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Expenses</h1>
          <p className="text-sm text-muted-foreground">Track business costs against revenue and profit.</p>
        </div>
        {!readOnly && (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            New Expense
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <DataTable
          columns={columns}
          data={expenses}
          searchKey="category"
          searchPlaceholder="Search expenses..."
          emptyMessage="No expenses yet. Log your first expense to track profitability."
        />
      )}

      <ExpenseFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        expense={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete expense?"
        description={`This will permanently delete this ${deleting?.category ?? ""} expense.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
