import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ListChecks, UserPlus } from "lucide-react"
import type { RecentActivityRow } from "../types"

const ICONS = {
  task: ListChecks,
  invoice: FileText,
  client: UserPlus,
  project: ListChecks,
} as const

export function RecentActivity({ activity }: { activity: RecentActivityRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}
        {activity.map((item) => {
          const Icon = ICONS[item.type]
          return (
            <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 text-sm">
              <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="truncate">{item.description}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
