import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface TimeFieldProps {
  /** 24-hour "HH:mm", or "" when unset. */
  value: string
  onChange: (value: string) => void
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"))
const pad = (n: number) => String(n).padStart(2, "0")

/** 12-hour time entry stored as 24-hour "HH:mm". Unset parts default to 12 / 00 / AM once any part is chosen. */
export function TimeField({ value, onChange }: TimeFieldProps) {
  const [h24, m] = value ? value.split(":").map(Number) : [null, null]
  const pm = h24 !== null && h24 >= 12
  const h12 = h24 === null ? null : h24 % 12 === 0 ? 12 : h24 % 12

  const emit = (hour12: number, minute: number, isPm: boolean) =>
    onChange(`${pad((hour12 % 12) + (isPm ? 12 : 0))}:${pad(minute)}`)

  return (
    <div className="grid grid-cols-[1fr_1fr_1fr] gap-2">
      <Select value={h12 === null ? "" : String(h12)} onValueChange={(v) => emit(Number(v), m ?? 0, pm)}>
        <SelectTrigger className="w-full" aria-label="Hour">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={m === null ? "" : pad(m)} onValueChange={(v) => emit(h12 ?? 12, Number(v), pm)}>
        <SelectTrigger className="w-full" aria-label="Minute">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent className="max-h-60">
          {MINUTES.map((x) => (
            <SelectItem key={x} value={x}>
              {x}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={h24 === null ? "" : pm ? "PM" : "AM"} onValueChange={(v) => emit(h12 ?? 12, m ?? 0, v === "PM")}>
        <SelectTrigger className="w-full" aria-label="AM or PM">
          <SelectValue placeholder="AM/PM" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
