import { useEffect, useState } from "react"
import { getCurrentElapsedSeconds, useTimerStore } from "@/store/timerStore"

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

export function formatElapsed(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  return [hours, minutes, seconds].map((n) => String(n).padStart(2, "0")).join(":")
}
