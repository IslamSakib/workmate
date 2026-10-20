import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Status } from "@/components/shared/Status"
import { formatCurrency } from "@/lib/currency"
import type { RecurringInvoiceWithRelations } from "../types"

interface ColumnActions {
  onEdit: (r: RecurringInvoiceWithRelations) => void
  onDelete: (r: RecurringInvoiceWithRelations) => void
  onToggle: (r: RecurringInvoiceWithRelations) => void
}

const FREQ = { weekly: "Weekly", monthly: "Monthly", quarterly: "Every 3 months" } as const

const day = (d: string) => format(new Date(`${d}T00:00:00`), "d MMM yyyy")

export function getRecurringInvoiceColumns({
  onEdit,
  onDelete,
  onToggle,
}: ColumnActions): ColumnDef<RecurringInvoiceWithRelations, unknown>[] {
  return [
    {
      id: "client",
      header: "Client",
      meta: { primary: true },
      accessorFn: (r) => r.clients?.client_name ?? r.description ?? "No client",
    },
    {
      id: "billing",
      header: "Bills",
      cell: ({ row }) =>
        row.original.billing_mode === "fixed" && row.original.amount != null
          ? formatCurrency(Number(row.original.amount), row.original.currency)
          : "Logged tasks",
    },
    { accessorKey: "frequency", header: "Repeats", cell: ({ row }) => FREQ[row.original.frequency] },
    {
      accessorKey: "next_run_date",
      header: "Next invoice",
      cell: ({ row }) => (row.original.active ? day(row.original.next_run_date) : "-"),
    },
    {
      accessorKey: "ends_on",
      header: "Ends",
      meta: { secondary: true },
      cell: ({ row }) => (row.original.ends_on ? day(row.original.ends_on) : "Until stopped"),
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => {
        const r = row.original
        if (r.active) return <Status tone="good">Active</Status>
        const ended = r.ends_on && r.next_run_date > r.ends_on
        return <Status tone="neutral">{ended ? "Ended" : "Paused"}</Status>
      },
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              More
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onToggle(row.original)}>
              {row.original.active ? "Pause" : "Resume"}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(row.original)}>Edit</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
