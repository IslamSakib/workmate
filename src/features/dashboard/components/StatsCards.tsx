import {
  Clock,
  DollarSign,
  FileWarning,
  FolderKanban,
  Gauge,
  Landmark,
  PiggyBank,
  TrendingDown,
  TrendingUp,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCurrencyAmounts, totalOf, type CurrencyAmounts } from "@/lib/currency"
import type { CurrencyCode } from "@/types/database"
import type { DashboardStats, GrowthDeltas, OutstandingInvoices, ProfitMetrics } from "../types"

/** revenueMonth scaled by the account's tax set-aside rate, per currency. */
function taxSetAsideFor(revenueMonth: CurrencyAmounts, taxRatePct: number): CurrencyAmounts {
  const out: CurrencyAmounts = {}
  for (const [code, amount] of Object.entries(revenueMonth) as [CurrencyCode, number][]) {
    out[code] = (amount * taxRatePct) / 100
  }
  return out
}

const TONES = {
  blue: { border: "border-l-blue-500", bg: "bg-blue-500/10 dark:bg-blue-500/15", text: "text-blue-600 dark:text-blue-400" },
  emerald: { border: "border-l-emerald-500", bg: "bg-emerald-500/10 dark:bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  violet: { border: "border-l-violet-500", bg: "bg-violet-500/10 dark:bg-violet-500/15", text: "text-violet-600 dark:text-violet-400" },
  info: { border: "border-l-info", bg: "bg-info/10", text: "text-info" },
  warning: { border: "border-l-warning", bg: "bg-warning/10", text: "text-warning" },
  success: { border: "border-l-success", bg: "bg-success/10", text: "text-success" },
  destructive: { border: "border-l-destructive", bg: "bg-destructive/10", text: "text-destructive" },
} as const

type Tone = keyof typeof TONES

function marginTextTone(pct: number) {
  if (pct < 0) return "text-destructive"
  if (pct < 20) return "text-warning"
  return "text-success"
}

function DeltaBadge({ pct, suffix = " vs last month" }: { pct: number | null; suffix?: string }) {
  if (pct === null) return null
  const positive = pct >= 0
  const Icon = positive ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        positive ? "text-success" : "text-destructive"
      )}
    >
      <Icon className="size-3" />
      {positive ? "+" : ""}
      {pct.toFixed(1)}%{suffix}
    </span>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  footer,
}: {
  icon: typeof Clock
  label: string
  value: string
  tone: Tone
  /** Small line under the value — a trend delta or a secondary figure like profit margin. */
  footer?: React.ReactNode
}) {
  const t = TONES[tone]
  return (
    <Card className={cn("gap-2 border-l-4 py-4", t.border)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <div className={cn("flex size-8 items-center justify-center rounded-full", t.bg)}>
          <Icon className={cn("size-4", t.text)} />
        </div>
      </CardHeader>
      <CardContent className="space-y-1 px-4">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {footer}
      </CardContent>
    </Card>
  )
}

export function StatsCards({
  stats,
  outstanding,
  growth,
  profit,
  taxRatePct,
}: {
  stats: DashboardStats
  outstanding: OutstandingInvoices
  growth: GrowthDeltas
  profit: ProfitMetrics
  taxRatePct: number
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Clock} label="Hours This Week" value={`${stats.hoursWeek.toFixed(1)}h`} tone="blue" />
      <StatCard
        icon={DollarSign}
        label="Revenue This Month"
        value={formatCurrencyAmounts(stats.revenueMonth)}
        tone="emerald"
        footer={<DeltaBadge pct={growth.monthRevenueGrowthPct} />}
      />
      <StatCard
        icon={PiggyBank}
        label="Profit This Month"
        value={formatCurrencyAmounts(profit.profitMonth)}
        tone={totalOf(profit.profitMonth) >= 0 ? "success" : "destructive"}
        footer={
          profit.profitMarginMonth !== null ? (
            <span className={cn("text-xs font-medium", marginTextTone(profit.profitMarginMonth))}>
              {profit.profitMarginMonth.toFixed(0)}% margin
            </span>
          ) : undefined
        }
      />
      <StatCard
        icon={FileWarning}
        label="Outstanding Invoices"
        value={`${formatCurrencyAmounts(outstanding.total)} (${outstanding.count})`}
        tone="warning"
      />
      {taxRatePct > 0 && (
        <StatCard
          icon={Landmark}
          label="Tax Set-Aside"
          value={formatCurrencyAmounts(taxSetAsideFor(stats.revenueMonth, taxRatePct))}
          tone="blue"
          footer={<span className="text-xs text-muted-foreground">{taxRatePct}% of this month's revenue</span>}
        />
      )}
      <StatCard icon={Gauge} label="Utilization Rate" value={`${stats.utilizationRate.toFixed(0)}%`} tone="info" />
      <StatCard icon={FolderKanban} label="Active Projects" value={String(stats.activeProjects)} tone="violet" />
    </div>
  )
}
