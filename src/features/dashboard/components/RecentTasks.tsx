import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { RecentTaskRow } from "../types"

export function RecentTasks({ tasks }: { tasks: RecentTaskRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent Tasks</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">No tasks yet.</p>}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-3 text-sm">
            <div className="min-w-0">
              <p className="truncate font-medium">{task.task_name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {task.project_name ?? "No project"} · {task.client_name ?? "No client"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {(task.duration_minutes / 60).toFixed(1)}h
              </span>
              <Badge variant={task.billable ? "default" : "secondary"}>
                {task.billable ? "Billable" : "Non-billable"}
              </Badge>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
