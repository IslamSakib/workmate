import type { ColumnDef } from "@tanstack/react-table"
import { Check, Copy, MoreHorizontal, Pencil, Send, Trash2, X } from "lucide-react"
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
import { cn } from "@/lib/utils"
import type { TaskApprovalStatus } from "@/types/database"
import type { TaskWithRelations } from "../types"

const APPROVAL_VARIANT: Record<TaskApprovalStatus, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  submitted: "outline",
  approved: "default",
  rejected: "destructive",
}

const APPROVAL_CLASS: Record<TaskApprovalStatus, string> = {
  draft: "",
  submitted: "text-warning border-warning",
  approved: "bg-success text-success-foreground",
  rejected: "",
}

interface ColumnActions {
  onEdit: (task: TaskWithRelations) => void
  onDelete: (task: TaskWithRelations) => void
  onDuplicate: (task: TaskWithRelations) => void
  onSubmit?: (task: TaskWithRelations) => void
  onApprove?: (task: TaskWithRelations) => void
  onReject?: (task: TaskWithRelations) => void
  canApprove?: boolean
  enableSelection?: boolean
}

export function getTaskColumns({
  onEdit,
  onDelete,
  onDuplicate,
  onSubmit,
  onApprove,
  onReject,
  canApprove,
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
      accessorKey: "approval_status",
      header: "Approval",
      cell: ({ row }) => {
        const status = row.original.approval_status
        return (
          <Badge variant={APPROVAL_VARIANT[status]} className={cn("capitalize", APPROVAL_CLASS[status])}>
            {status}
          </Badge>
        )
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const task = row.original
        const isOwnDraftOrRejected =
          onSubmit && (task.approval_status === "draft" || task.approval_status === "rejected")
        const isSubmitted = task.approval_status === "submitted"
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isOwnDraftOrRejected && (
                <DropdownMenuItem onClick={() => onSubmit?.(task)}>
                  <Send className="size-4" />
                  Submit for approval
                </DropdownMenuItem>
              )}
              {canApprove && isSubmitted && (
                <>
                  <DropdownMenuItem onClick={() => onApprove?.(task)}>
                    <Check className="size-4" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onReject?.(task)}>
                    <X className="size-4" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
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
