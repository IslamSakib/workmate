import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { CommandPalette } from "./CommandPalette"
import { generateDueRecurringInvoices } from "@/features/recurring-invoices/api"
import { hasMinRole } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"

export function AppShell() {
  const [commandOpen, setCommandOpen] = useState(false)
  const role = useAuthStore((s) => s.role)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((prev) => !prev)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [])

  useEffect(() => {
    if (hasMinRole(role, "manager")) {
      generateDueRecurringInvoices().catch(() => {})
    }
  }, [role])

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSearch={() => setCommandOpen(true)} />
        <main className="flex-1 overflow-x-hidden p-3 md:p-4">
          <Outlet />
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
