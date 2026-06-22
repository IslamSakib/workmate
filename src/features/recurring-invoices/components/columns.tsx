import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { RecurringInvoiceWithRelations } from "../types"

interface ColumnActions {
  onEdit: (recurringInvoice: RecurringInvoiceWithRelations) => void
  onDelete: (recurringInvoice: RecurringInvoiceWithRelations) => void
}

export function getRecurringInvoiceColumns({
  onEdit,
  onDelete,
}: ColumnActions): ColumnDef<RecurringInvoiceWithRelations, unknown>[] {
  return [
    {
      id: "client",
      header: "Client",
      accessorFn: (row) => row.clients?.client_name ?? "—",
    },
    {
      id: "project",
      header: "Project",
      accessorFn: (row) => row.projects?.project_name ?? "—",
    },
    {
      accessorKey: "frequency",
      header: "Frequency",
      cell: ({ row }) => <span className="capitalize">{row.original.frequency}</span>,
    },
    {
      accessorKey: "next_run_date",
      header: "Next Run",
      cell: ({ row }) => format(new Date(row.original.next_run_date), "MMM d, yyyy"),
    },
    {
      accessorKey: "active",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.active ? "default" : "secondary"}>
          {row.original.active ? "Active" : "Paused"}
        </Badge>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
