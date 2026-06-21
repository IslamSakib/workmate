import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "@/lib/supabaseClient"

type TimerStatus = "idle" | "running" | "paused"

function pad(n: number) {
  return n.toString().padStart(2, "0")
}

function timeOfDay(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function dateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

interface TimerState {
  status: TimerStatus
  entryId: string | null
  projectId: string | null
  clientId: string | null
  taskId: string | null
  taskName: string
  notes: string
  startedAt: number | null
  accumulatedSeconds: number
  start: (input: { projectId: string | null; clientId: string | null; taskName: string; notes?: string }) => Promise<void>
  pause: () => Promise<void>
  resume: () => void
  stop: () => Promise<void>
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      status: "idle",
      entryId: null,
      projectId: null,
      clientId: null,
      taskId: null,
      taskName: "",
      notes: "",
      startedAt: null,
      accumulatedSeconds: 0,

      start: async ({ projectId, clientId, taskName, notes }) => {
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData.user?.id
        if (!userId) throw new Error("Not authenticated")

        const now = new Date()
        const { data: task, error: taskError } = await supabase
          .from("tasks")
          .insert({
            user_id: userId,
            project_id: projectId,
            client_id: clientId,
            task_name: taskName,
            date: dateOnly(now),
            start_time: timeOfDay(now),
            end_time: timeOfDay(now),
            duration_seconds: 0,
            billable: true,
          })
          .select()
          .single()
        if (taskError) throw taskError

        const { data: entry, error: entryError } = await supabase
          .from("time_entries")
          .insert({
            user_id: userId,
            project_id: projectId,
            client_id: clientId,
            task_id: task.id,
            notes,
            started_at: now.toISOString(),
            is_running: true,
          })
          .select()
          .single()
        if (entryError) throw entryError

        set({
          status: "running",
          entryId: entry.id,
          projectId,
          clientId,
          taskId: task.id,
          taskName,
          notes: notes ?? "",
          startedAt: Date.now(),
          accumulatedSeconds: 0,
        })
      },

      pause: async () => {
        const { startedAt, accumulatedSeconds, entryId, taskId } = get()
        if (!startedAt) return
        const elapsed = accumulatedSeconds + Math.floor((Date.now() - startedAt) / 1000)
        if (entryId) {
          await supabase.from("time_entries").update({ duration_seconds: elapsed }).eq("id", entryId)
        }
        if (taskId) {
          await supabase
            .from("tasks")
            .update({ duration_seconds: elapsed, end_time: timeOfDay(new Date()) })
            .eq("id", taskId)
        }
        set({ status: "paused", startedAt: null, accumulatedSeconds: elapsed })
      },

      resume: () => {
        set({ status: "running", startedAt: Date.now() })
      },

      stop: async () => {
        const { startedAt, accumulatedSeconds, entryId, taskId } = get()
        const elapsed = accumulatedSeconds + (startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0)

        if (entryId) {
          await supabase
            .from("time_entries")
            .update({
              ended_at: new Date().toISOString(),
              duration_seconds: elapsed,
              is_running: false,
            })
            .eq("id", entryId)
        }
        if (taskId) {
          await supabase
            .from("tasks")
            .update({ duration_seconds: elapsed, end_time: timeOfDay(new Date()) })
            .eq("id", taskId)
        }

        set({
          status: "idle",
          entryId: null,
          projectId: null,
          clientId: null,
          taskId: null,
          taskName: "",
          notes: "",
          startedAt: null,
          accumulatedSeconds: 0,
        })
      },
    }),
    { name: "workmate-timer" },
  ),
)

export function getCurrentElapsedSeconds(state: Pick<TimerState, "status" | "startedAt" | "accumulatedSeconds">) {
  if (state.status === "running" && state.startedAt) {
    return state.accumulatedSeconds + Math.floor((Date.now() - state.startedAt) / 1000)
  }
  return state.accumulatedSeconds
}
