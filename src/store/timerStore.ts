import { create } from "zustand"
import { persist } from "zustand/middleware"
import { supabase } from "@/lib/supabaseClient"

type TimerStatus = "idle" | "running" | "paused"

interface TimerState {
  status: TimerStatus
  entryId: string | null
  projectId: string | null
  clientId: string | null
  taskId: string | null
  notes: string
  startedAt: number | null
  accumulatedSeconds: number
  start: (input: { projectId: string | null; clientId: string | null; taskId: string | null; notes?: string }) => Promise<void>
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
      notes: "",
      startedAt: null,
      accumulatedSeconds: 0,

      start: async ({ projectId, clientId, taskId, notes }) => {
        const { data: userData } = await supabase.auth.getUser()
        const userId = userData.user?.id
        if (!userId) throw new Error("Not authenticated")

        const { data, error } = await supabase
          .from("time_entries")
          .insert({
            user_id: userId,
            project_id: projectId,
            client_id: clientId,
            task_id: taskId,
            notes,
            started_at: new Date().toISOString(),
            is_running: true,
          })
          .select()
          .single()
        if (error) throw error

        set({
          status: "running",
          entryId: data.id,
          projectId,
          clientId,
          taskId,
          notes: notes ?? "",
          startedAt: Date.now(),
          accumulatedSeconds: 0,
        })
      },

      pause: async () => {
        const { startedAt, accumulatedSeconds, entryId } = get()
        if (!startedAt) return
        const elapsed = accumulatedSeconds + Math.floor((Date.now() - startedAt) / 1000)
        if (entryId) {
          await supabase.from("time_entries").update({ duration_seconds: elapsed }).eq("id", entryId)
        }
        set({ status: "paused", startedAt: null, accumulatedSeconds: elapsed })
      },

      resume: () => {
        set({ status: "running", startedAt: Date.now() })
      },

      stop: async () => {
        const { startedAt, accumulatedSeconds, entryId } = get()
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

        set({
          status: "idle",
          entryId: null,
          projectId: null,
          clientId: null,
          taskId: null,
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
