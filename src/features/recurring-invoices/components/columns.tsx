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
import { currentAmount, type RecurringInvoiceWithRelations } from "../types"

interface ColumnActions {
  onEdit: (r: RecurringInvoiceWithRelations) => void
  onDelete: (r: RecurringInvoiceWithRelations) => void
  onToggle: (r: RecurringInvoiceWithRelations) => void
  onChangeSalary: (r: RecurringInvoiceWithRelations) => void
}

const TYPE = { full_time: "Full-time job", part_time: "Part-time job" } as const
const FREQ = { weekly: "Weekly", monthly: "Monthly", quarterly: "Every 3 months" } as const

const day = (d: string) => format(new Date(`${d}T00:00:00`), "d MMM yyyy")

export function getRecurringInvoiceColumns({
  onEdit,
  onDelete,
  onToggle,
  onChangeSalary,
}: ColumnActions): ColumnDef<RecurringInvoiceWithRelations, unknown>[] {
  return [
    {
      id: "client",
      header: "Employer / client",
      meta: { primary: true },
      accessorFn: (r) => r.clients?.client_name ?? r.description ?? "No client",
    },
    {
      id: "type",
      header: "Type",
      accessorFn: (r) => (r.employment_type ? TYPE[r.employment_type] : "Client billing"),
    },
    {
      id: "billing",
      header: "Pay",
      cell: ({ row }) => {
        const amount = row.original.billing_mode === "fixed" ? currentAmount(row.original) : null
        if (amount == null) return "Hours logged"
        return `${formatCurrency(amount, row.original.currency)}${row.original.employment_type ? " / month" : ""}`
      },
    },
    { accessorKey: "frequency", header: "Repeats", cell: ({ row }) => (row.original.employment_type ? "Monthly, after the month" : FREQ[row.original.frequency]) },
    {
      accessorKey: "next_run_date",
      header: "Next payday",
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
            {row.original.billing_mode === "fixed" && (
              <DropdownMenuItem onClick={() => onChangeSalary(row.original)}>
                {row.original.employment_type ? "Change salary" : "Change amount"}
              </DropdownMenuItem>
            )}
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
