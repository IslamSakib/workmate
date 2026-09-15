import type { ColumnDef } from "@tanstack/react-table"
import { Copy, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatDuration } from "@/lib/duration"
import type { TaskWithRelations } from "../types"

interface ColumnActions {
  onEdit: (task: TaskWithRelations) => void
  onDelete: (task: TaskWithRelations) => void
  onDuplicate: (task: TaskWithRelations) => void
  enableSelection?: boolean
}

export function getTaskColumns({
  onEdit,
  onDelete,
  onDuplicate,
  enableSelection,
}: ColumnActions): ColumnDef<TaskWithRelations, unknown>[] {
  return [
    ...(enableSelection
      ? [
          {
            id: "select",
            header: ({ table }) => (
              <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
              />
            ),
            cell: ({ row }) => (
              <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                aria-label="Select row"
              />
            ),
            enableSorting: false,
            enableHiding: false,
          } satisfies ColumnDef<TaskWithRelations, unknown>,
        ]
      : []),
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
      accessorKey: "duration_seconds",
      header: "Duration",
      cell: ({ row }) => formatDuration(row.original.duration_seconds),
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
      enableHiding: false,
      cell: ({ row }) => {
        const task = row.original
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(task)}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(task)}>
                <Copy className="size-4" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(task)}>
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
