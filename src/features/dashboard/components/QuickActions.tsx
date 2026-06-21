import { useNavigate } from "react-router-dom"
import { Play, FilePlus, UserPlus, FolderPlus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const actions = [
  { label: "Start Timer", icon: Play, to: "/timer", tone: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400" },
  { label: "New Client", icon: UserPlus, to: "/clients", tone: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400" },
  { label: "New Project", icon: FolderPlus, to: "/projects", tone: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/15 dark:text-violet-400" },
  { label: "New Invoice", icon: FilePlus, to: "/invoices", tone: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400" },
]

export function QuickActions() {
  const navigate = useNavigate()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {actions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            className="h-auto flex-col gap-2 py-4"
            onClick={() => navigate(action.to)}
          >
            <span className={cn("flex size-9 items-center justify-center rounded-full", action.tone)}>
              <action.icon className="size-5" />
            </span>
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
