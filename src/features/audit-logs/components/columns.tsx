import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { ChangedFieldsCell } from "./ChangedFieldsCell"
import type { AuditLog } from "../types"

const ENTITY_LABELS: Record<string, string> = {
  clients: "Client",
  projects: "Project",
  tasks: "Task",
  time_entries: "Time Entry",
  invoices: "Invoice",
  retainers: "Retainer",
  expenses: "Expense",
}

const ACTION_TONES: Record<string, string> = {
  insert: "bg-success/10 text-success",
  update: "bg-info/10 text-info",
  delete: "bg-destructive/10 text-destructive",
}

export function getAuditLogColumns(): ColumnDef<AuditLog, unknown>[] {
  return [
    {
      id: "entity",
      header: "Entity",
      accessorFn: (row) => ENTITY_LABELS[row.table_name] ?? row.table_name,
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <Badge variant="outline" className={cn("border-0 capitalize", ACTION_TONES[row.original.action])}>
          {row.original.action}
        </Badge>
      ),
    },
    {
      id: "changed",
      header: "Changed Fields",
      cell: ({ row }) => <ChangedFieldsCell log={row.original} />,
    },
    {
      id: "record",
      header: "Record ID",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.record_id?.slice(0, 8) ?? "—"}
        </span>
      ),
    },
    {
      id: "actor",
      header: "Actor",
      cell: ({ row }) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.original.actor_id?.slice(0, 8) ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Timestamp",
      cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy h:mm a"),
    },
  ]
}
