import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { PageHeader } from "@/components/shared/PageHeader"
import { ErrorState } from "@/components/shared/States"
import { ExportCsvButton } from "@/components/shared/ExportCsvButton"
import { Money } from "@/components/shared/Money"
import { Stat } from "@/components/shared/Status"
import {
  createInvoice,
  deleteInvoice,
  deletePayment,
  getInvoiceItems,
  getInvoicePayments,
  listInvoices,
  promoteScheduledInvoices,
  recordPayment,
  recordReminderSent,
  updateInvoice,
} from "@/features/invoices/api"
import { InvoiceFormDialog } from "@/features/invoices/components/InvoiceFormDialog"
import { PastInvoiceDialog } from "@/features/invoices/components/PastInvoiceDialog"
import { RecordPaymentDialog, type PaymentInput } from "@/features/invoices/components/RecordPaymentDialog"
import { balanceOf, getInvoiceColumns, isOverdue } from "@/features/invoices/components/columns"
import type { BillableTask, InvoiceItem, InvoicePayment, InvoiceWithRelations } from "@/features/invoices/types"
import type { InvoiceInput } from "@/features/invoices/schema"
import { generateInvoicePdf, generateReceiptPdf } from "@/lib/pdf/invoicePdf"
import { formatCurrency, sumByCurrency } from "@/lib/currency"
import { getProfile, getSettings } from "@/features/settings/api"
import { useAuthStore } from "@/store/authStore"
import { cn } from "@/lib/utils"
import { formatDate } from "@/lib/date"

const TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "sent", label: "Sent" },
  { id: "partial", label: "Partial" },
  { id: "overdue", label: "Overdue" },
  { id: "paid", label: "Paid" },
] as const
type TabId = (typeof TABS)[number]["id"]

function inTab(i: InvoiceWithRelations, tab: TabId) {
  if (tab === "all") return true
  if (tab === "overdue") return isOverdue(i)
  if (tab === "sent") return i.status === "sent" && !isOverdue(i)
  if (tab === "partial") return i.status === "partial" && !isOverdue(i)
  return i.status === tab
}

export default function InvoicesPage() {
  const user = useAuthStore((s) => s.user)
  const [invoices, setInvoices] = useState<InvoiceWithRelations[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>("all")
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<InvoiceWithRelations | null>(null)
  const [editingItems, setEditingItems] = useState<InvoiceItem[]>([])
  const [deleting, setDeleting] = useState<InvoiceWithRelations | null>(null)
  const [pastOpen, setPastOpen] = useState(false)
  const [paying, setPaying] = useState<InvoiceWithRelations | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  const load = useCallback(async () => {
    setError(null)
    try {
      const fetched = await listInvoices()
      setInvoices(fetched)
      return fetched
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load invoices")
      return []
    }
  }, [])

  useEffect(() => {
    promoteScheduledInvoices()
      .catch((e) => toast.error(e instanceof Error ? e.message : "Could not update scheduled invoices"))
      .finally(load)
  }, [load])

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

  const counts = useMemo(() => {
    const out: Record<TabId, number> = { all: 0, draft: 0, sent: 0, partial: 0, overdue: 0, paid: 0 }
    for (const i of invoices ?? []) for (const t of TABS) if (inTab(i, t.id)) out[t.id] += 1
    return out
  }, [invoices])

  const open = (invoices ?? []).filter((i) => ["sent", "partial", "overdue"].includes(i.status))
  const owed = sumByCurrency(open, balanceOf, (i) => i.currency)
  const late = open.filter(isOverdue)
  const lateAmounts = sumByCurrency(late, balanceOf, (i) => i.currency)

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
    await load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteInvoice(deleting.id)
      toast.success("Invoice deleted. Its tasks can be billed again.")
      setDeleting(null)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete invoice")
    }
  }

  const documentContext = async () => {
    if (!user) return { fromName: null, paymentUrl: null }
    const [profile, settings] = await Promise.all([getProfile(user.id), getSettings(user.id)])
    return { fromName: profile?.display_name ?? null, paymentUrl: settings?.payment_url ?? null }
  }

  const handleExport = async (invoice: InvoiceWithRelations) => {
    try {
      const [items, payments, ctx] = await Promise.all([
        getInvoiceItems(invoice.id),
        getInvoicePayments(invoice.id),
        documentContext(),
      ])
      await generateInvoicePdf({
        invoice_number: invoice.invoice_number,
        status: isOverdue(invoice) ? "overdue" : invoice.status,
        kind: invoice.kind,
        issue_date: invoice.issue_date,
        due_date: invoice.due_date,
        period_start: invoice.kind === "standard" ? invoice.period_start : null,
        period_end: invoice.kind === "standard" ? invoice.period_end : null,
        currency: invoice.currency,
        from_name: ctx.fromName,
        client_name: invoice.clients?.client_name ?? "-",
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
        amount_paid: Number(invoice.amount_paid),
        payments: payments.map((p) => ({ date: p.paid_date, amount: Number(p.amount), method: p.method, reference: p.reference })),
        notes: invoice.notes,
        payment_url: ctx.paymentUrl,
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to export PDF")
    }
  }

  const refreshPaying = async () => {
    const fetched = await load()
    setPaying((prev) => fetched.find((i) => i.id === prev?.id) ?? prev)
  }

  const handleRecordPayment = async (payment: PaymentInput) => {
    if (!paying) return
    await recordPayment(paying.id, payment)
    toast.success("Payment recorded")
    await refreshPaying()
  }

  const handleDeletePayment = async (paymentId: string) => {
    await deletePayment(paymentId)
    await refreshPaying()
  }

  const handleReceipt = async (payment: InvoicePayment, paidToDate: number) => {
    if (!paying) return
    try {
      const ctx = await documentContext()
      await generateReceiptPdf({
        invoice_number: paying.invoice_number,
        client_name: paying.clients?.client_name ?? "-",
        currency: paying.currency,
        from_name: ctx.fromName,
        invoice_total: Number(paying.total),
        paid_to_date: paidToDate,
        payment: { date: payment.paid_date, amount: Number(payment.amount), method: payment.method, reference: payment.reference },
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create receipt")
    }
  }

  const handleSendReminder = async (invoice: InvoiceWithRelations) => {
    const subject = encodeURIComponent(`Reminder: invoice ${invoice.invoice_number}`)
    const body = encodeURIComponent(
      `Hi${invoice.clients?.client_name ? ` ${invoice.clients.client_name}` : ""},\n\nThis is a reminder that invoice ${invoice.invoice_number} for ${formatCurrency(balanceOf(invoice), invoice.currency)} is ${isOverdue(invoice) ? "overdue" : "due"}${invoice.due_date ? ` (due ${formatDate(invoice.due_date)})` : ""}. Please let me know if you have any questions.\n\nThanks!`,
    )
    const link = document.createElement("a")
    link.href = `mailto:${invoice.clients?.email ?? ""}?subject=${subject}&body=${body}`
    link.click()
    try {
      await recordReminderSent(invoice.id)
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record reminder")
    }
  }

  const handleCopyLink = async (invoice: InvoiceWithRelations) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/i/${invoice.public_token}`)
      toast.success("Share link copied")
    } catch {
      toast.error("Could not copy the link. Your browser blocked clipboard access.")
    }
  }

  const columns = getInvoiceColumns({
    onEdit: async (invoice) => {
      try {
        setEditingItems(await getInvoiceItems(invoice.id))
        setEditing(invoice)
        setFormOpen(true)
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to load invoice")
      }
    },
    onDelete: setDeleting,
    onExport: handleExport,
    onRecordPayment: setPaying,
    onSendReminder: handleSendReminder,
    onCopyLink: handleCopyLink,
  })

  const visible = (invoices ?? []).filter((i) => inTab(i, tab))

  return (
    <>
      <PageHeader
        title="Invoices"
        description="Bill for tracked work, or ask for an advance or milestone payment. Record payments as they arrive."
        actions={
          <>
            <ExportCsvButton
              filename="invoices.csv"
              rows={invoices ?? []}
              columns={[
                { label: "Invoice", value: (i) => i.invoice_number },
                { label: "Type", value: (i) => i.kind },
                { label: "Client", value: (i) => i.clients?.client_name },
                { label: "Project", value: (i) => i.projects?.project_name },
                { label: "Status", value: (i) => (isOverdue(i) ? "overdue" : i.status) },
                { label: "Issued", value: (i) => i.issue_date },
                { label: "Due", value: (i) => i.due_date },
                { label: "Total", value: (i) => i.total },
                { label: "Paid", value: (i) => i.amount_paid },
                { label: "Balance", value: (i) => balanceOf(i) },
                { label: "Currency", value: (i) => i.currency },
              ]}
            />
            <Button variant="outline" onClick={() => setPastOpen(true)}>
              Add past invoice
            </Button>
            <Button
              onClick={() => {
                setEditing(null)
                setEditingItems([])
                setFormOpen(true)
              }}
            >
              New invoice
            </Button>
          </>
        }
      />

      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : !invoices ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat label="Owed to you" value={<Money amounts={owed} />} sub={`${open.length} open invoices, balance after payments`} />
            <Stat label="Overdue" value={<Money amounts={lateAmounts} />} sub={`${late.length} past their due date`} />
          </div>

          <div role="tablist" aria-label="Filter by status" className="flex gap-5 overflow-x-auto overflow-y-hidden border-b [scrollbar-width:none]">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "-mb-px shrink-0 border-b-2 py-2 text-sm",
                  tab === t.id ? "border-primary font-semibold text-primary" : "border-transparent text-muted-foreground",
                )}
              >
                {t.label} {counts[t.id]}
              </button>
            ))}
          </div>

          <DataTable
            columns={columns}
            data={visible}
            searchKey="invoice_number"
            searchPlaceholder="Search by number"
            emptyMessage={tab === "all" ? "No invoices yet. Create one to get paid." : "No invoices in this view."}
          />
        </>
      )}

      <InvoiceFormDialog
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o)
          if (!o) {
            setEditing(null)
            setEditingItems([])
          }
        }}
        invoice={editing}
        items={editingItems}
        onSubmit={handleSubmit}
      />

      <PastInvoiceDialog open={pastOpen} onOpenChange={setPastOpen} onSaved={load} />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete invoice?"
        description={`This permanently deletes invoice ${deleting?.invoice_number}, its payments and credit lines. Its tasks become billable again.`}
        onConfirm={handleDelete}
      />

      <RecordPaymentDialog
        open={!!paying}
        onOpenChange={(o) => !o && setPaying(null)}
        invoice={paying}
        onSubmit={handleRecordPayment}
        onDeletePayment={handleDeletePayment}
        onReceipt={handleReceipt}
      />
    </>
  )
}
