import { Repeat } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type { RetainerMetrics } from "../types"

export function RetainerUsageWidget({ retainers }: { retainers: RetainerMetrics }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Retainer Usage</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {retainers.usage.length === 0 && (
          <p className="text-sm text-muted-foreground">No active retainers.</p>
        )}
        {retainers.usage.map((r) => {
          const pct = r.included_hours > 0 ? Math.min(100, (r.used_hours / r.included_hours) * 100) : 0
          const overage = r.overage_amount > 0
          return (
            <div key={r.id} className="space-y-1.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 truncate">
                  <Repeat className="size-3.5 shrink-0 text-info" />
                  {r.client_name}
                </span>
                <span className={cn("text-xs", overage ? "text-destructive" : "text-muted-foreground")}>
                  {r.used_hours.toFixed(1)}h / {r.included_hours.toFixed(1)}h
                </span>
              </div>
              <Progress value={pct} className={cn(overage && "bg-destructive/20 [&>div]:bg-destructive")} />
              {overage && (
                <p className="text-xs text-warning">
                  +{formatCurrency(r.overage_amount)} overage this month
                </p>
              )}
            </div>
          )
        })}
        {retainers.totalOverageRevenue > 0 && (
          <p className="border-t pt-2 text-sm font-medium text-warning">
            Total overage revenue: {formatCurrency(retainers.totalOverageRevenue)}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
