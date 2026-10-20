import { useEffect, useState } from "react"
import { Outlet } from "react-router-dom"
import { Sidebar } from "./Sidebar"
import { Topbar } from "./Topbar"
import { MobileNav } from "./MobileNav"
import { CommandPalette } from "./CommandPalette"
import { toast } from "sonner"
import { generateDueRecurringInvoices } from "@/features/recurring-invoices/api"

export function AppShell() {
  const [commandOpen, setCommandOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

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

  // Server-side and idempotent: creates any invoices that came due while the app was closed.
  useEffect(() => {
    generateDueRecurringInvoices()
      .then((n) => n > 0 && toast.success(`${n} recurring invoice(s) created`))
      .catch((e) => toast.error(e instanceof Error ? e.message : "Recurring billing failed"))
  }, [])

  return (
    <div className="flex min-h-svh">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenSearch={() => setCommandOpen(true)} moreOpen={moreOpen} setMoreOpen={setMoreOpen} />
        <main className="mx-auto w-full max-w-7xl flex-1 space-y-4 p-3 pb-20 md:p-6 lg:pb-6">
          <Outlet />
        </main>
      </div>
      <MobileNav onMore={() => setMoreOpen(true)} />
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </div>
  )
}
