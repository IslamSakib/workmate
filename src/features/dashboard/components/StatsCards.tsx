import { Clock, DollarSign, FolderKanban, Users, ListChecks, Gauge, FileWarning, TrendingUp, TrendingDown, Repeat, Receipt, PiggyBank, Percent, ClipboardCheck } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/currency"
import type { DashboardStats, GrowthDeltas, OutstandingInvoices, ProfitMetrics, RetainerMetrics } from "../types"

const TONES = {
  blue: { border: "border-l-blue-500", bg: "bg-blue-500/10 dark:bg-blue-500/15", text: "text-blue-600 dark:text-blue-400" },
  emerald: { border: "border-l-emerald-500", bg: "bg-emerald-500/10 dark:bg-emerald-500/15", text: "text-emerald-600 dark:text-emerald-400" },
  amber: { border: "border-l-amber-500", bg: "bg-amber-500/10 dark:bg-amber-500/15", text: "text-amber-600 dark:text-amber-400" },
  violet: { border: "border-l-violet-500", bg: "bg-violet-500/10 dark:bg-violet-500/15", text: "text-violet-600 dark:text-violet-400" },
  rose: { border: "border-l-rose-500", bg: "bg-rose-500/10 dark:bg-rose-500/15", text: "text-rose-600 dark:text-rose-400" },
  info: { border: "border-l-info", bg: "bg-info/10", text: "text-info" },
  warning: { border: "border-l-warning", bg: "bg-warning/10", text: "text-warning" },
  success: { border: "border-l-success", bg: "bg-success/10", text: "text-success" },
  destructive: { border: "border-l-destructive", bg: "bg-destructive/10", text: "text-destructive" },
} as const

type Tone = keyof typeof TONES

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock
  label: string
  value: string
  tone: Tone
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
      <CardContent className="px-4">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  )
}

function GrowthCard({ label, pct }: { label: string; pct: number | null }) {
  if (pct === null) {
    return <StatCard icon={TrendingUp} label={label} value="—" tone="info" />
  }
  const positive = pct >= 0
  return (
    <StatCard
      icon={positive ? TrendingUp : TrendingDown}
      label={label}
      value={`${positive ? "+" : ""}${pct.toFixed(1)}%`}
      tone={positive ? "success" : "destructive"}
    />
  )
}

function profitMarginTone(pct: number | null) {
  if (pct === null) return "info"
  if (pct < 0) return "destructive"
  if (pct < 20) return "warning"
  return "success"
}

export function StatsCards({
  stats,
  outstanding,
  growth,
  retainers,
  profit,
  pendingApprovals,
}: {
  stats: DashboardStats
  outstanding: OutstandingInvoices
  growth: GrowthDeltas
  retainers: RetainerMetrics
  profit: ProfitMetrics
  /** Manager+ only — omit entirely for roles that can't approve timesheets. */
  pendingApprovals?: number
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard icon={Clock} label="Hours Today" value={`${stats.hoursToday.toFixed(1)}h`} tone="blue" />
      <StatCard icon={Clock} label="Hours This Week" value={`${stats.hoursWeek.toFixed(1)}h`} tone="blue" />
      <StatCard icon={Clock} label="Hours This Month" value={`${stats.hoursMonth.toFixed(1)}h`} tone="blue" />
      <StatCard icon={Clock} label="Hours This Year" value={`${stats.hoursYear.toFixed(1)}h`} tone="blue" />

      <StatCard icon={DollarSign} label="Revenue Today" value={formatCurrency(stats.revenueToday)} tone="emerald" />
      <StatCard icon={DollarSign} label="Revenue This Week" value={formatCurrency(stats.revenueWeek)} tone="emerald" />
      <StatCard icon={DollarSign} label="Revenue This Month" value={formatCurrency(stats.revenueMonth)} tone="emerald" />
      <StatCard icon={DollarSign} label="Revenue This Year" value={formatCurrency(stats.revenueYear)} tone="emerald" />

      <StatCard icon={FolderKanban} label="Active Projects" value={String(stats.activeProjects)} tone="violet" />
      <StatCard icon={Users} label="Total Clients" value={String(stats.totalClients)} tone="amber" />
      <StatCard icon={ListChecks} label="Total Tasks" value={String(stats.totalTasks)} tone="rose" />
      <StatCard icon={Gauge} label="Utilization Rate" value={`${stats.utilizationRate.toFixed(0)}%`} tone="info" />
      {pendingApprovals !== undefined && (
        <StatCard
          icon={ClipboardCheck}
          label="Pending Approvals"
          value={String(pendingApprovals)}
          tone={pendingApprovals > 0 ? "warning" : "success"}
        />
      )}

      <StatCard
        icon={FileWarning}
        label="Outstanding Invoices"
        value={`${formatCurrency(outstanding.total)} (${outstanding.count})`}
        tone="warning"
      />
      <GrowthCard label="Revenue Growth (MoM)" pct={growth.monthRevenueGrowthPct} />
      <GrowthCard label="Revenue Growth (YoY)" pct={growth.yearRevenueGrowthPct} />

      <StatCard icon={Repeat} label="Active Retainers" value={String(retainers.activeRetainerCount)} tone="info" />
      <StatCard
        icon={DollarSign}
        label="Retainer Revenue"
        value={formatCurrency(retainers.totalMonthlyFee)}
        tone="emerald"
      />

      <StatCard icon={Receipt} label="Expenses This Month" value={formatCurrency(profit.expensesMonth)} tone="rose" />
      <StatCard
        icon={PiggyBank}
        label="Profit This Month"
        value={formatCurrency(profit.profitMonth)}
        tone={profit.profitMonth >= 0 ? "success" : "destructive"}
      />
      <StatCard
        icon={Percent}
        label="Profit Margin"
        value={profit.profitMarginMonth === null ? "—" : `${profit.profitMarginMonth.toFixed(0)}%`}
        tone={profitMarginTone(profit.profitMarginMonth)}
      />
    </div>
  )
}
