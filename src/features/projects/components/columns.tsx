import type { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Status, type StatusTone } from "@/components/shared/Status"
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

const STATUS_TONE: Record<string, StatusTone> = {
  active: "good",
  paused: "neutral",
  completed: "info",
  cancelled: "bad",
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
      cell: ({ row }) => <Status tone={STATUS_TONE[row.original.status]}>{row.original.status}</Status>,
    },
    {
      id: "rate",
      header: "Rate",
      cell: ({ row }) => {
        const p = row.original
        const price = p.hourly_rate
          ? `${formatCurrency(p.hourly_rate, p.currency)}/hr`
          : p.fixed_price
            ? `${formatCurrency(p.fixed_price, p.currency)} fixed`
            : "-"
        return (
          <div>
            <div className="tabular-nums">{price}</div>
            {p.fx_rate && p.fx_base && (
              <div className="text-xs text-muted-foreground tabular-nums">
                1 {p.currency} = {p.fx_rate} {p.fx_base}
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "due_date",
      header: "Due",
      cell: ({ row }) => row.original.due_date || "—",
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
