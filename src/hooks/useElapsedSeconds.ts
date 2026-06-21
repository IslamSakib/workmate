import { useEffect, useState } from "react"
import { getCurrentElapsedSeconds, useTimerStore } from "@/store/timerStore"
import { formatDuration } from "@/lib/duration"

export function useElapsedSeconds() {
  const status = useTimerStore((s) => s.status)
  const startedAt = useTimerStore((s) => s.startedAt)
  const accumulatedSeconds = useTimerStore((s) => s.accumulatedSeconds)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (status !== "running") return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [status])

  return getCurrentElapsedSeconds({ status, startedAt, accumulatedSeconds })
}

export const formatElapsed = formatDuration
