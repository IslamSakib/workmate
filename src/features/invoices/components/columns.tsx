import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InvoiceStatus } from "@/components/shared/Status"
import { formatCurrency } from "@/lib/currency"
import type { InvoiceWithRelations } from "../types"

interface ColumnActions {
  onEdit: (invoice: InvoiceWithRelations) => void
  onDelete: (invoice: InvoiceWithRelations) => void
  onExport: (invoice: InvoiceWithRelations) => void
  onRecordPayment: (invoice: InvoiceWithRelations) => void
  onSendReminder: (invoice: InvoiceWithRelations) => void
  onCopyLink: (invoice: InvoiceWithRelations) => void
}

const KIND_LABEL = { standard: "Standard", advance: "Advance", milestone: "Milestone" } as const

/** Overdue is derived from the due date, never stored: sent or partly paid and past due. */
export function isOverdue(invoice: Pick<InvoiceWithRelations, "status" | "due_date">): boolean {
  if (!invoice.due_date) return false
  return (invoice.status === "sent" || invoice.status === "partial" || invoice.status === "overdue") &&
    invoice.due_date < new Date().toISOString().slice(0, 10)
}

export function balanceOf(invoice: Pick<InvoiceWithRelations, "total" | "amount_paid">): number {
  return Math.max(0, Number(invoice.total) - Number(invoice.amount_paid))
}

export function getInvoiceColumns({
  onEdit,
  onDelete,
  onExport,
  onRecordPayment,
  onSendReminder,
  onCopyLink,
}: ColumnActions): ColumnDef<InvoiceWithRelations, unknown>[] {
  return [
    { accessorKey: "invoice_number", header: "Invoice", meta: { primary: true } },
    {
      id: "client",
      header: "Client",
      accessorFn: (r) => r.clients?.client_name ?? "",
      cell: ({ row }) => row.original.clients?.client_name ?? "None",
    },
    {
      id: "type",
      header: "Type",
      meta: { secondary: true },
      accessorFn: (r) => KIND_LABEL[r.kind] ?? "Standard",
    },
    {
      accessorKey: "due_date",
      header: "Due",
      meta: { secondary: true },
      cell: ({ row }) => row.original.due_date || "-",
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => <span className="tabular-nums">{formatCurrency(Number(row.original.total), row.original.currency)}</span>,
    },
    {
      id: "balance",
      header: "Balance",
      accessorFn: (r) => balanceOf(r),
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">{formatCurrency(balanceOf(row.original), row.original.currency)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <InvoiceStatus status={row.original.status} overdue={isOverdue(row.original)} />,
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => {
        const invoice = row.original
        const canPay = invoice.status !== "draft" && invoice.status !== "scheduled"
        const canRemind = canPay && invoice.status !== "paid"
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                More
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {canPay && <DropdownMenuItem onClick={() => onRecordPayment(invoice)}>Payments</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => onExport(invoice)}>Download PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyLink(invoice)}>Copy share link</DropdownMenuItem>
              {canRemind && <DropdownMenuItem onClick={() => onSendReminder(invoice)}>Send reminder</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => onEdit(invoice)}>Edit</DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(invoice)}>
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
