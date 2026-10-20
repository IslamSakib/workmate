import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { PageHeader } from "@/components/shared/PageHeader"
import { ErrorState } from "@/components/shared/States"
import {
  createRecurringInvoice,
  deleteRecurringInvoice,
  generateDueRecurringInvoices,
  listRecurringInvoices,
  setRecurringActive,
  updateRecurringInvoice,
} from "@/features/recurring-invoices/api"
import { RecurringInvoiceFormDialog } from "@/features/recurring-invoices/components/RecurringInvoiceFormDialog"
import { getRecurringInvoiceColumns } from "@/features/recurring-invoices/components/columns"
import { ChangeSalaryDialog } from "@/features/recurring-invoices/components/ChangeSalaryDialog"
import type { RecurringInvoiceWithRelations } from "@/features/recurring-invoices/types"
import type { RecurringInvoiceInput } from "@/features/recurring-invoices/schema"

export default function RecurringInvoicesPage() {
  const [rows, setRows] = useState<RecurringInvoiceWithRelations[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringInvoiceWithRelations | null>(null)
  const [raising, setRaising] = useState<RecurringInvoiceWithRelations | null>(null)
  const [deleting, setDeleting] = useState<RecurringInvoiceWithRelations | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = useCallback(async () => {
    setError(null)
    try {
      // Bill anything that has come due, then show the updated schedule.
      const made = await generateDueRecurringInvoices()
      if (made > 0) toast.success(`${made} invoice(s) created`)
      setRows(await listRecurringInvoices())
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load recurring invoices")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

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

  const handleSubmit = async (values: RecurringInvoiceInput) => {
    if (editing) {
      await updateRecurringInvoice(editing, values)
      toast.success("Saved")
    } else {
      await createRecurringInvoice(values)
      toast.success("Started")
    }
    setEditing(null)
    await load()
  }

  const toggle = async (r: RecurringInvoiceWithRelations) => {
    try {
      await setRecurringActive(r.id, !r.active)
      toast.success(r.active ? "Paused" : "Resumed")
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update")
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await deleteRecurringInvoice(deleting.id)
      toast.success("Deleted. Invoices already created are kept.")
      setDeleting(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete")
    }
  }

  const columns = getRecurringInvoiceColumns({
    onEdit: (r) => {
      setEditing(r)
      setFormOpen(true)
    },
    onDelete: setDeleting,
    onToggle: toggle,
    onChangeSalary: setRaising,
  })

  return (
    <>
      <PageHeader
        title="Jobs & recurring"
        description="Your jobs and regular billing. A job is paid after the month is worked, and its invoice is created for you each month."
        actions={
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            Add job or recurring
          </Button>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !rows ? (
        <Skeleton className="h-48" />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchKey="client"
          searchPlaceholder="Search"
          emptyMessage="Nothing here yet. Add your job or a retainer and its invoices will create themselves."
        />
      )}

      <RecurringInvoiceFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        recurringInvoice={editing}
        onSubmit={handleSubmit}
      />

      <ChangeSalaryDialog job={raising} onClose={() => setRaising(null)} onSaved={load} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this job or recurring invoice?"
        description="No more invoices will be created from it. Invoices already created are kept."
        onConfirm={remove}
      />
    </>
  )
}
