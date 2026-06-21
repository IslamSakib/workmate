import { useNavigate } from "react-router-dom"
import { Play, FilePlus, UserPlus, FolderPlus } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export function QuickActions() {
  const navigate = useNavigate()

  const actions = [
    { label: "Start Timer", icon: Play, onClick: () => navigate("/timer") },
    { label: "New Client", icon: UserPlus, onClick: () => navigate("/clients") },
    { label: "New Project", icon: FolderPlus, onClick: () => navigate("/projects") },
    { label: "New Invoice", icon: FilePlus, onClick: () => navigate("/invoices") },
  ]

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
            onClick={action.onClick}
          >
            <action.icon className="size-5" />
            <span className="text-xs">{action.label}</span>
          </Button>
        ))}
      </CardContent>
    </Card>
  )
}
