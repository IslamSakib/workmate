import type { ColumnDef } from "@tanstack/react-table"
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { TaskWithRelations } from "../types"

interface ColumnActions {
  onEdit: (task: TaskWithRelations) => void
  onDelete: (task: TaskWithRelations) => void
  onDuplicate: (task: TaskWithRelations) => void
}

export function getTaskColumns({ onEdit, onDelete, onDuplicate }: ColumnActions): ColumnDef<TaskWithRelations, unknown>[] {
  return [
    { accessorKey: "task_name", header: "Task" },
    { accessorKey: "date", header: "Date" },
    {
      id: "project",
      header: "Project",
      cell: ({ row }) => row.original.projects?.project_name ?? "—",
    },
    {
      id: "client",
      header: "Client",
      cell: ({ row }) => row.original.clients?.client_name ?? "—",
    },
    {
      accessorKey: "duration_minutes",
      header: "Duration",
      cell: ({ row }) => `${(row.original.duration_minutes / 60).toFixed(2)}h`,
    },
    {
      accessorKey: "billable",
      header: "Billable",
      cell: ({ row }) => (
        <Badge variant={row.original.billable ? "default" : "secondary"}>
          {row.original.billable ? "Billable" : "Non-billable"}
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
            <DropdownMenuItem onClick={() => onDuplicate(row.original)}>
              <Copy className="size-4" />
              Duplicate
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
