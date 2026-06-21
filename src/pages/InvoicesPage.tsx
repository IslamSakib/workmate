import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  createInvoice,
  deleteInvoice,
  getInvoiceItems,
  listInvoices,
  updateInvoice,
} from "@/features/invoices/api"
import { InvoiceFormDialog } from "@/features/invoices/components/InvoiceFormDialog"
import { getInvoiceColumns } from "@/features/invoices/components/columns"
import type { InvoiceItem, InvoiceWithRelations } from "@/features/invoices/types"
import type { InvoiceInput } from "@/features/invoices/schema"
import { generateInvoicePdf } from "@/lib/pdf/invoicePdf"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InvoiceWithRelations | null>(null)
  const [editingItems, setEditingItems] = useState<InvoiceItem[]>([])
  const [deleting, setDeleting] = useState<InvoiceWithRelations | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setInvoices(await listInvoices())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: InvoiceInput) => {
    if (editing) {
      await updateInvoice(editing.id, values)
      toast.success("Invoice updated")
    } else {
      await createInvoice(values)
      toast.success("Invoice created")
    }
    setEditing(null)
    setEditingItems([])
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteInvoice(deleting.id)
      toast.success("Invoice deleted")
      setDeleting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete invoice")
    }
  }

  const handleExport = async (invoice: InvoiceWithRelations) => {
    try {
      const items = await getInvoiceItems(invoice.id)
      await generateInvoicePdf({
        invoice_number: invoice.invoice_number,
        status: invoice.status,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        currency: invoice.currency,
        client_name: invoice.clients?.client_name ?? "—",
        client_email: invoice.clients?.email,
        project_name: invoice.projects?.project_name,
        items: items.map((i) => ({ description: i.description, quantity: i.quantity, rate: i.rate, amount: i.amount })),
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        discount: invoice.discount,
        total: invoice.total,
        notes: invoice.notes,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export PDF")
    }
  }

  const columns = getInvoiceColumns({
    onEdit: async (invoice) => {
      const items = await getInvoiceItems(invoice.id)
      setEditingItems(items)
      setEditing(invoice)
      setFormOpen(true)
    },
    onDelete: (invoice) => setDeleting(invoice),
    onExport: handleExport,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground">Bill clients and track payment status.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setEditingItems([])
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          New Invoice
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <DataTable
          columns={columns}
          data={invoices}
          searchKey="invoice_number"
          searchPlaceholder="Search invoices..."
          emptyMessage="No invoices yet. Create your first invoice to get paid."
        />
      )}

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) {
            setEditing(null)
            setEditingItems([])
          }
        }}
        invoice={editing}
        items={editingItems}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete invoice?"
        description={`This will permanently delete invoice ${deleting?.invoice_number}.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
