import { Outlet, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { LogOut, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/authStore"

export function PortalShell() {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { resolvedTheme, setTheme } = useTheme()

  const handleSignOut = async () => {
    await signOut()
    navigate("/login")
  }

  return (
    <div className="flex min-h-svh flex-col">
      <header className="flex h-12 items-center justify-between border-b px-4">
        <span className="text-lg font-semibold tracking-tight">WorkMate</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>
          <span className="hidden max-w-[160px] truncate text-sm text-muted-foreground sm:inline">
            {user?.email}
          </span>
          <Button variant="ghost" size="icon" aria-label="Sign out" onClick={handleSignOut}>
            <LogOut className="size-5" />
          </Button>
        </div>
      </header>
      <main className="flex-1 overflow-x-hidden p-3 md:p-4">
        <Outlet />
      </main>
    </div>
  )
}
