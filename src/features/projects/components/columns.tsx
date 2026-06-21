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
import { formatCurrency } from "@/lib/currency"
import type { ProjectWithClient } from "../types"

interface ColumnActions {
  onEdit: (project: ProjectWithClient) => void
  onDelete: (project: ProjectWithClient) => void
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  active: "default",
  paused: "secondary",
  completed: "outline",
  cancelled: "destructive",
}

export function getProjectColumns({ onEdit, onDelete }: ColumnActions): ColumnDef<ProjectWithClient, unknown>[] {
  return [
    { accessorKey: "project_name", header: "Project" },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) => row.original.clients?.client_name ?? "—",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={STATUS_VARIANT[row.original.status]} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: "rate",
      header: "Rate",
      cell: ({ row }) =>
        row.original.hourly_rate
          ? `${formatCurrency(row.original.hourly_rate, row.original.currency)}/hr`
          : row.original.fixed_price
            ? `${formatCurrency(row.original.fixed_price, row.original.currency)} fixed`
            : "—",
    },
    {
      accessorKey: "due_date",
      header: "Due",
      cell: ({ row }) => row.original.due_date || "—",
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
