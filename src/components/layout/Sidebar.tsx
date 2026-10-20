import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { NAV_GROUPS } from "./nav-items"

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav aria-label="Primary" className="flex flex-1 flex-col gap-5 overflow-y-auto p-3">
      {NAV_GROUPS.map((group) => (
        <div key={group.heading}>
          <p className="px-2 pb-1 text-xs uppercase tracking-wide text-sidebar-foreground/60">{group.heading}</p>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  "block rounded-md px-2 py-2 text-sm transition-colors lg:py-1.5",
                  isActive
                    ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="hidden w-56 shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground lg:flex lg:flex-col">
      <div className="flex h-12 items-center border-b border-sidebar-border px-4 text-base font-semibold tracking-tight text-sidebar-accent-foreground">WorkMate</div>
      <SidebarNav />
    </aside>
  )
}
