import { format } from "date-fns"
import { CalendarClock } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatCurrency } from "@/lib/currency"
import type { UpcomingDeadline } from "../types"

export function UpcomingDeadlines({ deadlines }: { deadlines: UpcomingDeadline[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {deadlines.length === 0 && (
          <p className="text-sm text-muted-foreground">No invoices due soon.</p>
        )}
        {deadlines.map((d) => (
          <div key={d.id} className="flex items-center gap-3 text-sm">
            <span
              className={
                d.overdue
                  ? "flex size-7 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
                  : "flex size-7 shrink-0 items-center justify-center rounded-full bg-warning/10 text-warning"
              }
            >
              <CalendarClock className="size-3.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate">
                {d.invoice_number} — {d.client_name ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {d.overdue ? "Overdue since" : "Due"} {format(new Date(d.due_date), "MMM d, yyyy")}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="font-medium">{formatCurrency(d.total)}</span>
              <Badge variant={d.overdue ? "destructive" : "outline"} className="text-xs">
                {d.overdue ? "Overdue" : "Upcoming"}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
