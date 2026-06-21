import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ListChecks,
  Timer,
  BarChart3,
  FileText,
  Settings,
  type LucideIcon,
} from "lucide-react"

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Tasks", to: "/tasks", icon: ListChecks },
  { label: "Timer", to: "/timer", icon: Timer },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Invoices", to: "/invoices", icon: FileText },
  { label: "Settings", to: "/settings", icon: Settings },
]
