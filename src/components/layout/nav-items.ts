import {
  LayoutDashboard,
  Users,
  FolderKanban,
  ListChecks,
  Timer,
  BarChart3,
  FileText,
  Repeat,
  CalendarSync,
  Receipt,
  Settings,
  History,
  Users2,
  LineChart,
  type LucideIcon,
} from "lucide-react"
import type { TeamRole } from "@/types/database"

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  /** Minimum role required to see this item. Omitted = visible to everyone. */
  minRole?: TeamRole
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", to: "/clients", icon: Users },
  { label: "Projects", to: "/projects", icon: FolderKanban },
  { label: "Tasks", to: "/tasks", icon: ListChecks },
  { label: "Timer", to: "/timer", icon: Timer },
  { label: "Reports", to: "/reports", icon: BarChart3 },
  { label: "Insights", to: "/insights", icon: LineChart, minRole: "manager" },
  { label: "Invoices", to: "/invoices", icon: FileText, minRole: "manager" },
  { label: "Recurring Invoices", to: "/recurring-invoices", icon: CalendarSync, minRole: "manager" },
  { label: "Retainers", to: "/retainers", icon: Repeat, minRole: "manager" },
  { label: "Expenses", to: "/expenses", icon: Receipt, minRole: "manager" },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Team", to: "/team", icon: Users2 },
  { label: "Audit Logs", to: "/audit-logs", icon: History, minRole: "manager" },
]
