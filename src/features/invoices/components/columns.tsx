import type { ColumnDef } from "@tanstack/react-table"
import { Download, Mail, MoreHorizontal, Pencil, Trash2, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type { InvoiceWithRelations } from "../types"

interface ColumnActions {
  onEdit: (invoice: InvoiceWithRelations) => void
  onDelete: (invoice: InvoiceWithRelations) => void
  onExport: (invoice: InvoiceWithRelations) => void
  onRecordPayment: (invoice: InvoiceWithRelations) => void
  onSendReminder: (invoice: InvoiceWithRelations) => void
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  scheduled: "outline",
  sent: "outline",
  partial: "outline",
  paid: "default",
  overdue: "destructive",
}

const STATUS_CLASS: Record<string, string> = {
  partial: "text-warning border-warning",
  paid: "bg-success text-success-foreground",
}

export function getInvoiceColumns({
  onEdit,
  onDelete,
  onExport,
  onRecordPayment,
  onSendReminder,
}: ColumnActions): ColumnDef<InvoiceWithRelations, unknown>[] {
  return [
    { accessorKey: "invoice_number", header: "Invoice #" },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) => row.original.clients?.client_name ?? "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={STATUS_VARIANT[row.original.status]}
          className={cn("capitalize", STATUS_CLASS[row.original.status])}
        >
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "total",
      header: "Total",
      cell: ({ row }) => formatCurrency(row.original.total, row.original.currency),
    },
    { accessorKey: "due_date", header: "Due", cell: ({ row }) => row.original.due_date || "—" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const invoice = row.original
        const canRecordPayment = invoice.status === "sent" || invoice.status === "overdue" || invoice.status === "partial"
        const canRemind = invoice.status === "sent" || invoice.status === "overdue" || invoice.status === "partial"
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(invoice)}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport(invoice)}>
                <Download className="size-4" />
                Export PDF
              </DropdownMenuItem>
              {canRecordPayment && (
                <DropdownMenuItem onClick={() => onRecordPayment(invoice)}>
                  <Wallet className="size-4" />
                  Record Payment
                </DropdownMenuItem>
              )}
              {canRemind && (
                <DropdownMenuItem onClick={() => onSendReminder(invoice)}>
                  <Mail className="size-4" />
                  Send Reminder
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(invoice)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
