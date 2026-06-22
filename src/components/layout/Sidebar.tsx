import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { hasMinRole } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"
import { NAV_ITEMS } from "./nav-items"

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const role = useAuthStore((s) => s.role)
  const visibleItems = NAV_ITEMS.filter((item) => hasMinRole(role, item.minRole ?? "employee"))

  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2.5">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          onClick={onNavigate}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )
          }
        >
          <item.icon className="size-4 shrink-0" />
          {item.label}
        </NavLink>
      ))}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-60 shrink-0 border-r bg-sidebar md:flex md:flex-col">
      <div className="flex h-12 items-center border-b px-4 text-lg font-semibold tracking-tight">
        WorkMate
      </div>
      <SidebarNav />
    </aside>
  )
}
