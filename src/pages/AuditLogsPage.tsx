import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { listAuditLogs } from "@/features/audit-logs/api"
import { getAuditLogColumns } from "@/features/audit-logs/components/columns"
import type { AuditLog } from "@/features/audit-logs/types"

const ENTITY_OPTIONS = [
  { value: "clients", label: "Client" },
  { value: "projects", label: "Project" },
  { value: "tasks", label: "Task" },
  { value: "time_entries", label: "Time Entry" },
  { value: "invoices", label: "Invoice" },
  { value: "retainers", label: "Retainer" },
  { value: "expenses", label: "Expense" },
]

const ACTION_OPTIONS = [
  { value: "insert", label: "Insert" },
  { value: "update", label: "Update" },
  { value: "delete", label: "Delete" },
]

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [entityFilter, setEntityFilter] = useState("all")
  const [actionFilter, setActionFilter] = useState("all")

  const load = async () => {
    setLoading(true)
    try {
      setLogs(
        await listAuditLogs({
          tableName: entityFilter === "all" ? undefined : entityFilter,
          action: actionFilter === "all" ? undefined : actionFilter,
        }),
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load audit logs")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityFilter, actionFilter])

  const columns = getAuditLogColumns()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit Logs</h1>
        <p className="text-sm text-muted-foreground">
          Searchable history of who changed what, when — immutable once recorded.
        </p>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <DataTable
          columns={columns}
          data={logs}
          searchKey="entity"
          searchPlaceholder="Search audit logs..."
          emptyMessage="No audit log entries yet."
          toolbar={
            <div className="flex items-center gap-2">
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Entity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All entities</SelectItem>
                  {ENTITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All actions</SelectItem>
                  {ACTION_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      )}
    </div>
  )
}
