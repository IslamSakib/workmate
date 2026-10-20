import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/currency"
import type { ExpenseWithRefs } from "../types"
import { formatDate } from "@/lib/date"

interface ColumnActions {
  onEdit: (expense: ExpenseWithRefs) => void
  onDelete: (expense: ExpenseWithRefs) => void
}

export function getExpenseColumns({ onEdit, onDelete }: ColumnActions): ColumnDef<ExpenseWithRefs, unknown>[] {
  return [
    { accessorKey: "category", header: "Category" },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount, row.original.currency),
    },
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
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => formatDate(row.original.date),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="">More</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
