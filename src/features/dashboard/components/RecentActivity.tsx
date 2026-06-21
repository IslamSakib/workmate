import { formatDistanceToNow } from "date-fns"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ListChecks, UserPlus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { RecentActivityRow } from "../types"

const ICONS = {
  task: ListChecks,
  invoice: FileText,
  client: UserPlus,
  project: ListChecks,
} as const

const TONES = {
  task: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400",
  invoice: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400",
  client: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400",
  project: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400",
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
              <span className={cn("mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full", TONES[item.type])}>
                <Icon className="size-3.5" />
              </span>
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
