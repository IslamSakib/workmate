import { Link, useNavigate } from "react-router-dom"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarNav } from "./Sidebar"
import { useAuthStore } from "@/store/authStore"
import { useTimerStore } from "@/store/timerStore"
import { useElapsedSeconds, formatElapsed } from "@/hooks/useElapsedSeconds"

function TimerReadout() {
  const status = useTimerStore((s) => s.status)
  const name = useTimerStore((s) => s.taskName)
  const seconds = useElapsedSeconds()
  if (status === "idle") return null
  return (
    <Link to="/timer" className="flex min-w-0 items-center gap-2 text-sm" aria-label="Open timer">
      <span className="font-mono font-semibold tabular-nums text-sidebar-primary lg:text-primary">{formatElapsed(seconds)}</span>
      <span className="hidden max-w-40 truncate text-muted-foreground sm:inline">{name}</span>
      {status === "paused" && <span className="text-xs uppercase text-warning">Paused</span>}
    </Link>
  )
}

export function Topbar({
  onOpenSearch,
  moreOpen,
  setMoreOpen,
}: {
  onOpenSearch: () => void
  moreOpen: boolean
  setMoreOpen: (v: boolean) => void
}) {
  const navigate = useNavigate()
  const { user, signOut } = useAuthStore()
  const { resolvedTheme, setTheme } = useTheme()

  const handleSignOut = async () => {
    await signOut()
    navigate("/login")
  }

  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between gap-2 border-b bg-sidebar px-3 text-sidebar-foreground md:px-4 lg:bg-card lg:text-foreground">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-sm font-semibold lg:hidden">WorkMate</span>
        <TimerReadout />
      </div>
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="left" className="w-64 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="h-12 justify-center border-b border-sidebar-border px-4">
            <SheetTitle className="text-left text-base font-semibold tracking-tight text-sidebar-accent-foreground">WorkMate</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMoreOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex min-w-0 shrink-0 items-center gap-1">
        <Button variant="outline" size="sm" className="border-sidebar-border bg-transparent text-inherit lg:border-border" onClick={onOpenSearch}>
          Search <kbd className="ml-2 hidden rounded border px-1.5 text-xs sm:inline">Ctrl K</kbd>
        </Button>
        <Button variant="ghost" size="sm" className="hover:bg-sidebar-accent lg:hover:bg-accent" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {resolvedTheme === "dark" ? "Light" : "Dark"}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="hidden max-w-36 truncate sm:inline-flex xl:max-w-56">
              {user?.email}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => navigate("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} variant="destructive">
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
