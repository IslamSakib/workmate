import { useEffect, useState } from "react"
import { Pause, Play, Square } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useClientsList } from "@/hooks/useClientsList"
import { useProjectsList } from "@/hooks/useProjectsList"
import { useElapsedSeconds, formatElapsed } from "@/hooks/useElapsedSeconds"
import { useTimerStore } from "@/store/timerStore"
import { listRecentSessions, type RecentSession } from "@/features/timer/api"

export default function TimerPage() {
  const projects = useProjectsList()
  const clients = useClientsList()
  const { status, projectId, clientId, notes, start, pause, resume, stop } = useTimerStore()
  const elapsed = useElapsedSeconds()

  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [sessionNotes, setSessionNotes] = useState("")
  const [sessions, setSessions] = useState<RecentSession[]>([])

  const loadSessions = () => listRecentSessions().then(setSessions).catch(() => {})

  useEffect(() => {
    loadSessions()
  }, [])

  const handleStart = async () => {
    try {
      await start({ projectId: selectedProject, clientId: selectedClient, taskId: null, notes: sessionNotes })
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

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Timer</h1>
        <p className="text-sm text-muted-foreground">Track your work in real time.</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-6 py-10">
          <div className="font-mono text-5xl font-semibold tabular-nums tracking-tight sm:text-6xl">
            {formatElapsed(elapsed)}
          </div>
          <p className="text-sm text-muted-foreground">
            {activeProject?.project_name ?? "No project"}
            {activeClient ? ` · ${activeClient.client_name}` : ""}
          </p>

          <div className="flex gap-3">
            {isIdle && (
              <Button size="lg" onClick={handleStart}>
                <Play className="size-4" />
                Start
              </Button>
            )}
            {status === "running" && (
              <Button size="lg" variant="outline" onClick={pause}>
                <Pause className="size-4" />
                Pause
              </Button>
            )}
            {status === "paused" && (
              <Button size="lg" onClick={resume}>
                <Play className="size-4" />
                Resume
              </Button>
            )}
            {!isIdle && (
              <Button size="lg" variant="destructive" onClick={handleStop}>
                <Square className="size-4" />
                Stop
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {isIdle && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Attach session</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Project</Label>
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
            </div>
            <div className="space-y-2">
              <Label>Client</Label>
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
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="session-notes">Notes</Label>
              <Input id="session-notes" value={sessionNotes} onChange={(e) => setSessionNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      )}

      {!isIdle && notes && (
        <p className="text-center text-sm text-muted-foreground">Notes: {notes}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {sessions.length === 0 && <p className="text-sm text-muted-foreground">No sessions yet.</p>}
          {sessions.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium">{s.project_name ?? "No project"}</p>
                <p className="truncate text-xs text-muted-foreground">{s.client_name ?? "No client"}</p>
              </div>
              <span className="shrink-0 font-mono text-xs">{formatElapsed(s.duration_seconds)}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
