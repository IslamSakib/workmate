import { useState } from "react"
import { format } from "date-fns"
import { Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { diffFields, type AuditLog } from "../types"

const ENTITY_LABELS: Record<string, string> = {
  clients: "Client",
  projects: "Project",
  tasks: "Task",
  time_entries: "Time Entry",
  invoices: "Invoice",
  retainers: "Retainer",
  expenses: "Expense",
}

function formatValue(value: unknown) {
  if (value === null || value === undefined) return "—"
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

export function ChangedFieldsCell({ log }: { log: AuditLog }) {
  const [open, setOpen] = useState(false)
  const diffs = diffFields(log.old_values, log.new_values)

  if (diffs.length === 0) {
    return <span className="text-muted-foreground">—</span>
  }

  return (
    <>
      <Button variant="ghost" size="sm" onClick={() => setOpen(true)}>
        <Eye className="size-4" />
        {diffs.length} field{diffs.length === 1 ? "" : "s"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {ENTITY_LABELS[log.table_name] ?? log.table_name} — {log.action}
            </DialogTitle>
            <DialogDescription>
              {format(new Date(log.created_at), "MMM d, yyyy h:mm a")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {diffs.map((d) => (
              <div key={d.field} className="space-y-1 rounded-md border p-3 text-sm">
                <div className="font-medium">{d.field}</div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-destructive line-through">{formatValue(d.old)}</span>
                  <span>→</span>
                  <span className="text-success">{formatValue(d.new)}</span>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
