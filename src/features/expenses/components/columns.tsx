import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/currency"
import type { ExpenseWithRefs } from "../types"

interface ColumnActions {
  onEdit: (expense: ExpenseWithRefs) => void
  onDelete: (expense: ExpenseWithRefs) => void
  readOnly?: boolean
}

export function getExpenseColumns({ onEdit, onDelete, readOnly }: ColumnActions): ColumnDef<ExpenseWithRefs, unknown>[] {
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
      cell: ({ row }) => format(new Date(row.original.date), "MMM d, yyyy"),
    },
    ...(readOnly
      ? []
      : [
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
          } satisfies ColumnDef<ExpenseWithRefs, unknown>,
        ]),
  ]
}
