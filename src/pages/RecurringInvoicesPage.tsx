import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  createRecurringInvoice,
  deleteRecurringInvoice,
  listRecurringInvoices,
  updateRecurringInvoice,
} from "@/features/recurring-invoices/api"
import { RecurringInvoiceFormDialog } from "@/features/recurring-invoices/components/RecurringInvoiceFormDialog"
import { getRecurringInvoiceColumns } from "@/features/recurring-invoices/components/columns"
import type { RecurringInvoiceWithRelations } from "@/features/recurring-invoices/types"
import type { RecurringInvoiceInput } from "@/features/recurring-invoices/schema"

export default function RecurringInvoicesPage() {
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoiceWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RecurringInvoiceWithRelations | null>(null)
  const [deleting, setDeleting] = useState<RecurringInvoiceWithRelations | null>(null)
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
      setRecurringInvoices(await listRecurringInvoices())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load recurring invoices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: RecurringInvoiceInput) => {
    if (editing) {
      await updateRecurringInvoice(editing.id, values)
      toast.success("Recurring invoice updated")
    } else {
      await createRecurringInvoice(values)
      toast.success("Recurring invoice created")
    }
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteRecurringInvoice(deleting.id)
      toast.success("Recurring invoice deleted")
      setDeleting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete recurring invoice")
    }
  }

  const columns = getRecurringInvoiceColumns({
    onEdit: (recurringInvoice) => {
      setEditing(recurringInvoice)
      setFormOpen(true)
    },
    onDelete: (recurringInvoice) => setDeleting(recurringInvoice),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recurring Invoices</h1>
          <p className="text-sm text-muted-foreground">
            Templates that auto-generate invoices on a schedule from billable hours.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          New Recurring Invoice
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <DataTable
          columns={columns}
          data={recurringInvoices}
          searchKey="client"
          searchPlaceholder="Search recurring invoices..."
          emptyMessage="No recurring invoices yet. Add a template to auto-bill clients on a schedule."
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

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete recurring invoice?"
        description={`This will permanently delete this recurring invoice template for ${deleting?.clients?.client_name ?? "this client"}.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
