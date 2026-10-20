import { cn } from "@/lib/utils"

const TONE = {
  neutral: "bg-muted text-muted-foreground",
  good: "bg-success/12 text-success",
  warn: "bg-warning/15 text-warning",
  bad: "bg-destructive/10 text-destructive",
  info: "bg-info/12 text-info",
} as const

export type StatusTone = keyof typeof TONE

export function Status({ tone = "neutral", children }: { tone?: StatusTone; children: string }) {
  return (
    <span className={cn("inline-block rounded-sm px-2 py-0.5 text-xs font-semibold uppercase tracking-wide", TONE[tone])}>
      {children}
    </span>
  )
}

const TOP = {
  primary: "border-t-primary",
  info: "border-t-chart-2",
  good: "border-t-success",
  warn: "border-t-chart-3",
} as const

export function Stat({
  label,
  value,
  sub,
  accent = "primary",
}: {
  label: string
  value: React.ReactNode
  sub?: string
  accent?: keyof typeof TOP
}) {
  return (
    <div className={cn("min-w-0 rounded-md border border-t-[3px] bg-card p-3.5", TOP[accent])}>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="mt-1 text-xl font-semibold tabular-nums break-words">{value}</div>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

/** Maps an invoice status to its tag. */
export function InvoiceStatus({ status, overdue }: { status: string; overdue?: boolean }) {
  if (overdue && status !== "paid") return <Status tone="bad">Overdue</Status>
  const map: Record<string, [StatusTone, string]> = {
    draft: ["neutral", "Draft"],
    scheduled: ["neutral", "Scheduled"],
    sent: ["info", "Sent"],
    partial: ["warn", "Partial"],
    paid: ["good", "Paid"],
    overdue: ["bad", "Overdue"],
  }
  const [tone, label] = map[status] ?? ["neutral", status]
  return <Status tone={tone}>{label}</Status>
}
