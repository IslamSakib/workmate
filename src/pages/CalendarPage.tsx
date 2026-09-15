import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { endOfMonth, format, startOfMonth } from "date-fns"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Skeleton } from "@/components/ui/skeleton"
import { InfoTooltip } from "@/components/shared/InfoTooltip"
import { getCalendarEvents, type CalendarEvent, type CalendarEventType } from "@/features/calendar/api"

const TYPE_DOT: Record<CalendarEventType, string> = {
  invoice_due: "bg-warning",
  project_due: "bg-info",
  proposal_deadline: "bg-violet-500",
  recurring_invoice: "bg-emerald-500",
}

const TYPE_LABEL: Record<CalendarEventType, string> = {
  invoice_due: "Invoice due",
  project_due: "Project due",
  proposal_deadline: "Proposal expires",
  recurring_invoice: "Recurring invoice",
}

export default function CalendarPage() {
  const [month, setMonth] = useState(new Date())
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    getCalendarEvents(startOfMonth(month), endOfMonth(month))
      .then((rows) => active && setEvents(rows))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load calendar"))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [month])

  const eventDates = events.map((e) => new Date(`${e.date}T00:00:00`))

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">Calendar</h1>
          <InfoTooltip text="A month view of what's coming up: invoice due dates, project deadlines, proposal expirations, and recurring invoice runs." />
        </div>
        <p className="text-sm text-muted-foreground">See deadlines across your whole business at a glance.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[auto_1fr]">
        <Card className="w-fit">
          <CardContent className="p-3">
            <Calendar
              mode="single"
              selected={undefined}
              month={month}
              onMonthChange={setMonth}
              modifiers={{ hasEvent: eventDates }}
              modifiersClassNames={{ hasEvent: "font-semibold underline decoration-2 underline-offset-4" }}
            />
            <div className="flex flex-wrap gap-3 border-t px-1 pt-3 text-xs text-muted-foreground">
              {Object.entries(TYPE_LABEL).map(([type, label]) => (
                <span key={type} className="flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${TYPE_DOT[type as CalendarEventType]}`} />
                  {label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="text-sm font-medium">{format(month, "MMMM yyyy")}</p>
            {loading && <Skeleton className="h-40" />}
            {!loading && events.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing due this month.</p>
            )}
            {!loading &&
              events.map((event, i) => (
                <Link
                  key={i}
                  to={event.to}
                  className="flex items-center gap-3 rounded-md border p-2 text-sm hover:bg-accent"
                >
                  <span className={`size-2 shrink-0 rounded-full ${TYPE_DOT[event.type]}`} />
                  <span className="w-20 shrink-0 text-muted-foreground">
                    {format(new Date(`${event.date}T00:00:00`), "MMM d")}
                  </span>
                  <span className="truncate">{event.label}</span>
                </Link>
              ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
