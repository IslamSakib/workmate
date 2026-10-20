import { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TimeFieldProps {
  /** 24-hour "HH:mm", or "" when unset. */
  value: string
  onChange: (value: string) => void
}

const pad = (n: number) => String(n).padStart(2, "0")

function parts(value: string) {
  if (!value) return { hh: "", mm: "", pm: false }
  const [h, m] = value.split(":").map(Number)
  return { hh: String(h % 12 === 0 ? 12 : h % 12), mm: pad(m), pm: h >= 12 }
}

/** Typed 12-hour entry (hour, minute, AM/PM) stored as 24-hour "HH:mm". Emits once hour and minute are both valid. */
export function TimeField({ value, onChange }: TimeFieldProps) {
  const [{ hh, mm, pm }, setState] = useState(() => parts(value))
  const emitted = useRef(value)

  // Pick up outside changes (form reset / editing another task) without fighting the user's typing.
  useEffect(() => {
    if (value !== emitted.current) {
      emitted.current = value
      setState(parts(value))
    }
  }, [value])

  const update = (next: { hh: string; mm: string; pm: boolean }) => {
    setState(next)
    const h = Number(next.hh)
    const m = Number(next.mm)
    if (next.hh !== "" && next.mm !== "" && h >= 1 && h <= 12 && m >= 0 && m <= 59) {
      const out = `${pad((h % 12) + (next.pm ? 12 : 0))}:${pad(m)}`
      emitted.current = out
      onChange(out)
    }
  }
  const digits = (s: string) => s.replace(/\D/g, "").slice(0, 2)

  return (
    <div className="flex items-center gap-1.5">
      <Input
        inputMode="numeric"
        placeholder="hh"
        aria-label="Hour (1 to 12)"
        className="min-w-0 px-2 text-center"
        value={hh}
        onChange={(e) => update({ hh: digits(e.target.value), mm, pm })}
        onBlur={() => hh !== "" && (Number(hh) < 1 || Number(hh) > 12) && update({ hh: "", mm, pm })}
      />
      <span className="text-muted-foreground">:</span>
      <Input
        inputMode="numeric"
        placeholder="mm"
        aria-label="Minute (0 to 59)"
        className="min-w-0 px-2 text-center"
        value={mm}
        onChange={(e) => update({ hh, mm: digits(e.target.value), pm })}
        onBlur={() => mm.length === 1 && update({ hh, mm: pad(Number(mm)), pm })}
      />
      <div role="group" aria-label="AM or PM" className="flex shrink-0 overflow-hidden rounded-md border border-input">
        {[false, true].map((isPm) => (
          <button
            key={String(isPm)}
            type="button"
            aria-pressed={pm === isPm}
            onClick={() => update({ hh, mm, pm: isPm })}
            className={cn(
              "h-9 px-2 text-sm font-medium",
              pm === isPm ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent",
            )}
          >
            {isPm ? "PM" : "AM"}
          </button>
        ))}
      </div>
    </div>
  )
}
