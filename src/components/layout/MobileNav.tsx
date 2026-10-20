import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"
import { MOBILE_TABS } from "./nav-items"

export function MobileNav({ onMore }: { onMore: () => void }) {
  const base = "flex min-h-14 flex-1 items-center justify-center text-xs font-medium"
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      {MOBILE_TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          className={({ isActive }) =>
            cn(base, isActive ? "font-semibold text-primary shadow-[inset_0_3px_0_var(--primary)]" : "text-muted-foreground")
          }
        >
          {t.label}
        </NavLink>
      ))}
      <button type="button" onClick={onMore} className={cn(base, "text-muted-foreground")}>
        More
      </button>
    </nav>
  )
}
