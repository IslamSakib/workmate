import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
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
  promoteScheduledInvoices,
  recordPayment,
  recordReminderSent,
  updateInvoice,
} from "@/features/invoices/api"
import { InvoiceFormDialog } from "@/features/invoices/components/InvoiceFormDialog"
import { RecordPaymentDialog } from "@/features/invoices/components/RecordPaymentDialog"
import { getInvoiceColumns } from "@/features/invoices/components/columns"
import type { BillableTask, InvoiceItem, InvoiceWithRelations } from "@/features/invoices/types"
import type { InvoiceInput } from "@/features/invoices/schema"
import { generateInvoicePdf } from "@/lib/pdf/invoicePdf"
import { formatCurrency } from "@/lib/currency"

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InvoiceWithRelations | null>(null)
  const [editingItems, setEditingItems] = useState<InvoiceItem[]>([])
  const [deleting, setDeleting] = useState<InvoiceWithRelations | null>(null)
  const [payingInvoice, setPayingInvoice] = useState<InvoiceWithRelations | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null)
      setEditingItems([])
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
      setInvoices(await listInvoices())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load invoices")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    promoteScheduledInvoices()
      .catch(() => {})
      .finally(load)
  }, [])

  const handleSubmit = async (values: InvoiceInput, items: BillableTask[]) => {
    if (editing) {
      await updateInvoice(editing.id, values, items)
      toast.success("Invoice updated")
    } else {
      await createInvoice(values, items)
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
        period_start: invoice.period_start,
        period_end: invoice.period_end,
        currency: invoice.currency,
        client_name: invoice.clients?.client_name ?? "—",
        client_email: invoice.clients?.email,
        project_name: invoice.projects?.project_name,
        items: items.map((i) => ({
          task_name: i.task_name,
          task_date: i.task_date,
          duration_seconds: i.duration_seconds,
          rate: Number(i.rate),
          amount: Number(i.amount),
        })),
        total: Number(invoice.total),
        notes: invoice.notes,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export PDF")
    }
  }

  const handleRecordPayment = async (amount: number, paidDate: string, method: string) => {
    if (!payingInvoice) return
    await recordPayment(payingInvoice.id, { amount, paid_date: paidDate, method: method || null })
    toast.success("Payment recorded")
    load()
  }

  const handleSendReminder = async (invoice: InvoiceWithRelations) => {
    const subject = encodeURIComponent(`Reminder: Invoice ${invoice.invoice_number}`)
    const body = encodeURIComponent(
      `Hi${invoice.clients?.client_name ? ` ${invoice.clients.client_name}` : ""},\n\nThis is a reminder that invoice ${invoice.invoice_number} for ${formatCurrency(Number(invoice.total) - Number(invoice.amount_paid), invoice.currency)} is ${invoice.status === "overdue" ? "overdue" : "due"}${invoice.due_date ? ` (due ${invoice.due_date})` : ""}. Please let us know if you have any questions.\n\nThanks!`,
    )
    const link = document.createElement("a")
    link.href = `mailto:${invoice.clients?.email ?? ""}?subject=${subject}&body=${body}`
    link.click()
    try {
      await recordReminderSent(invoice.id)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record reminder")
    }
  }

  const columns = getInvoiceColumns({
    onEdit: async (invoice) => {
      try {
        const items = await getInvoiceItems(invoice.id)
        setEditingItems(items)
        setEditing(invoice)
        setFormOpen(true)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load invoice")
      }
    },
    onDelete: (invoice) => setDeleting(invoice),
    onExport: handleExport,
    onRecordPayment: (invoice) => setPayingInvoice(invoice),
    onSendReminder: handleSendReminder,
  })

  return (
    <div className="space-y-4">
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

      <RecordPaymentDialog
        open={!!payingInvoice}
        onOpenChange={(open) => !open && setPayingInvoice(null)}
        invoice={payingInvoice}
        onSubmit={handleRecordPayment}
      />
    </div>
  )
}
