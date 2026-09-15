import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ListChecks,
  Timer,
  BarChart3,
  FileText,
  FileSignature,
  Repeat,
  CalendarSync,
  Receipt,
  Settings,
  LineChart,
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
  { label: "Proposals", to: "/proposals", icon: FileSignature },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Tasks", to: "/tasks", icon: ListChecks },
  { label: "Timer", to: "/timer", icon: Timer },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Insights", to: "/insights", icon: LineChart },
  { label: "Invoices", to: "/invoices", icon: FileText },
  { label: "Recurring Invoices", to: "/recurring-invoices", icon: CalendarSync },
  { label: "Retainers", to: "/retainers", icon: Repeat },
  { label: "Expenses", to: "/expenses", icon: Receipt },
  { label: "Settings", to: "/settings", icon: Settings },
]
