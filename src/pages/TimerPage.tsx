import { useEffect, useState } from "react"
import { Pause, Play, Square } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { InfoTooltip } from "@/components/shared/InfoTooltip"
import { useClientsList } from "@/hooks/useClientsList"
import { useProjectsList } from "@/hooks/useProjectsList"
import { useElapsedSeconds, formatElapsed } from "@/hooks/useElapsedSeconds"
import { useTimerStore } from "@/store/timerStore"
import { listRecentSessions, type RecentSession } from "@/features/timer/api"

const STATUS_META = {
  idle: { label: "Idle", dot: "bg-muted-foreground/40" },
  running: { label: "Recording", dot: "bg-success animate-pulse" },
  paused: { label: "Paused", dot: "bg-warning" },
} as const

/** Remounts the changed digit on every tick so it animates in, giving the counter a live "ticking" feel. */
function AnimatedDigit({ char }: { char: string }) {
  if (char === ":") {
    return <span className="mx-0.5 text-muted-foreground/40 sm:mx-1">:</span>
  }
  return (
    <span className="relative inline-block w-[0.62em] overflow-hidden text-center">
      <span key={char} className="inline-block animate-in fade-in-0 slide-in-from-top-2 duration-300 ease-out">
        {char}
      </span>
    </span>
  )
}

export default function TimerPage() {
  const projects = useProjectsList()
  const clients = useClientsList()
  const { status, projectId, clientId, taskName, notes, start, pause, resume, stop } = useTimerStore()
  const elapsed = useElapsedSeconds()

  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [sessionTaskName, setSessionTaskName] = useState("")
  const [sessionNotes, setSessionNotes] = useState("")
  const [sessions, setSessions] = useState<RecentSession[]>([])

  const loadSessions = () => listRecentSessions().then(setSessions).catch(() => {})

  useEffect(() => {
    loadSessions()
  }, [])

  const handleStart = async () => {
    if (!sessionTaskName.trim()) {
      toast.error("Enter a task name to start the timer")
      return
    }
    try {
      await start({
        projectId: selectedProject,
        clientId: selectedClient,
        taskName: sessionTaskName.trim(),
        notes: sessionNotes,
      })
      setSessionTaskName("")
      setSessionNotes("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to start timer")
    }
  }

  const handleStop = async () => {
    try {
      await stop()
      toast.success("Session saved")
      loadSessions()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to stop timer")
    }
  }

  const isIdle = status === "idle"
  const activeProject = projects.find((p) => p.id === (isIdle ? selectedProject : projectId))
  const activeClient = clients.find((c) => c.id === (isIdle ? selectedClient : clientId))
  const taskLabel = isIdle ? sessionTaskName || "No task" : taskName || "No task"
  const metaLabel = [activeProject?.project_name, activeClient?.client_name].filter(Boolean).join(" · ")
  const meta = STATUS_META[status]

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Timer</h1>
          <InfoTooltip text="Type what you're working on, then click Start. We track your time down to the second and save it automatically." />
        </div>
        <p className="text-sm text-muted-foreground">Track your work in real time, billed to the second.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Card className="relative overflow-hidden">
          <div
            className={cn(
              "pointer-events-none absolute inset-0 -z-10 opacity-0 transition-opacity duration-700",
              status === "running" && "bg-gradient-to-b from-success/10 via-transparent to-transparent opacity-100",
              status === "paused" && "bg-gradient-to-b from-warning/10 via-transparent to-transparent opacity-100"
            )}
          />
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <div className="flex items-center gap-1.5 rounded-full border bg-muted/50 px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className={cn("size-2 rounded-full", meta.dot)} />
              {meta.label}
            </div>

            <div
              className="flex items-center justify-center font-mono text-6xl font-bold tabular-nums tracking-tight sm:text-7xl lg:text-8xl"
              role="timer"
              aria-live="off"
            >
              {formatElapsed(elapsed)
                .split("")
                .map((char, i) => (
                  <AnimatedDigit key={i} char={char} />
                ))}
            </div>

            <p className="truncate text-base font-medium">{taskLabel}</p>
            {metaLabel && <p className="truncate text-xs text-muted-foreground">{metaLabel}</p>}

            <div className="mt-3 flex gap-2">
              {isIdle && (
                <Button size="lg" className="rounded-full px-8" onClick={handleStart} disabled={!sessionTaskName.trim()}>
                  <Play className="size-4" />
                  Start
                </Button>
              )}
              {status === "running" && (
                <Button size="lg" variant="outline" className="rounded-full px-6" onClick={pause}>
                  <Pause className="size-4" />
                  Pause
                </Button>
              )}
              {status === "paused" && (
                <Button size="lg" className="rounded-full px-6" onClick={resume}>
                  <Play className="size-4" />
                  Resume
                </Button>
              )}
              {!isIdle && (
                <Button size="lg" variant="destructive" className="rounded-full px-6" onClick={handleStop}>
                  <Square className="size-4" />
                  Stop
                </Button>
              )}
            </div>
          </CardContent>

          {isIdle && (
            <CardContent className="grid grid-cols-1 gap-2 border-t pt-3 sm:grid-cols-2">
              <Input
                className="sm:col-span-2"
                placeholder="Task name"
                value={sessionTaskName}
                onChange={(e) => setSessionTaskName(e.target.value)}
              />
              <Select value={selectedProject ?? "none"} onValueChange={(v) => setSelectedProject(v === "none" ? null : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No project</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.project_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedClient ?? "none"} onValueChange={(v) => setSelectedClient(v === "none" ? null : v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="No client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No client</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.client_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="sm:col-span-2"
                placeholder="Notes (optional)"
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
              />
            </CardContent>
          )}

          {!isIdle && notes && (
            <CardContent className="border-t pt-2 text-xs text-muted-foreground">Notes: {notes}</CardContent>
          )}
        </Card>

        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-base">Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent className="divide-y py-1">
            {sessions.length === 0 && <p className="py-3 text-sm text-muted-foreground">No sessions yet.</p>}
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{s.task_name ?? "No task"}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.project_name ?? "No project"}
                    {s.client_name ? ` · ${s.client_name}` : ""}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 font-mono text-xs font-medium">
                  {formatElapsed(s.duration_seconds)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
