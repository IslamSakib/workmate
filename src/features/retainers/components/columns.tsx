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
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type { RetainerUsage, RetainerWithClient } from "../types"

interface ColumnActions {
  onEdit: (retainer: RetainerWithClient) => void
  onDelete: (retainer: RetainerWithClient) => void
  usage: Map<string, RetainerUsage>
}

function usageTone(usage: RetainerUsage | undefined) {
  if (!usage || usage.included_hours === 0) return "text-muted-foreground"
  if (usage.overage_hours > 0) return "text-destructive"
  if (usage.used_hours / usage.included_hours >= 0.8) return "text-warning"
  return "text-success"
}

export function getRetainerColumns({ onEdit, onDelete, usage }: ColumnActions): ColumnDef<RetainerWithClient, unknown>[] {
  return [
    {
      id: "client",
      header: "Client",
      accessorFn: (row) => row.clients?.client_name ?? "—",
    },
    {
      accessorKey: "monthly_fee",
      header: "Monthly Fee",
      cell: ({ row }) => formatCurrency(row.original.monthly_fee, row.original.currency),
    },
    {
      accessorKey: "included_hours",
      header: "Included Hours",
      cell: ({ row }) => `${row.original.included_hours.toFixed(1)}h`,
    },
    {
      id: "used_hours",
      header: "Used (this month)",
      cell: ({ row }) => {
        const u = usage.get(row.original.id)
        return <span className={cn(usageTone(u))}>{(u?.used_hours ?? 0).toFixed(1)}h</span>
      },
    },
    {
      id: "remaining",
      header: "Remaining / Overage",
      cell: ({ row }) => {
        const u = usage.get(row.original.id)
        if (!u) return "—"
        if (u.overage_hours > 0) {
          return (
            <span className="text-destructive">
              +{u.overage_hours.toFixed(1)}h ({formatCurrency(u.overage_amount, row.original.currency)})
            </span>
          )
        }
        return <span className={cn(usageTone(u))}>{u.remaining_hours.toFixed(1)}h left</span>
      },
    },
    {
      accessorKey: "next_billing_date",
      header: "Next Billing",
      cell: ({ row }) => format(new Date(row.original.next_billing_date), "MMM d, yyyy"),
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
