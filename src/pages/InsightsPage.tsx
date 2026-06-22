import { useEffect, useState } from "react"
import { toast } from "sonner"
import type { ColumnDef } from "@tanstack/react-table"
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Activity, Flame, TrendingUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { getMonthlyTrend } from "@/features/dashboard/api"
import {
  getBusinessInsights,
  getProjectProfitability,
  getRevenueForecast,
  getTopClients,
} from "@/features/insights/api"
import type { BusinessInsights, ForecastPoint, ProjectProfitabilityRow, TopClientRow } from "@/features/insights/types"

function healthVariant(score: number): "default" | "secondary" | "outline" | "destructive" {
  if (score >= 80) return "default"
  if (score >= 50) return "outline"
  return "destructive"
}

function healthClass(score: number) {
  if (score >= 80) return "bg-success text-success-foreground"
  if (score >= 50) return "text-warning border-warning"
  return ""
}

const clientColumns: ColumnDef<TopClientRow, unknown>[] = [
  { accessorKey: "client_name", header: "Client" },
  { accessorKey: "revenue", header: "YTD Revenue", cell: ({ row }) => formatCurrency(row.original.revenue) },
  {
    accessorKey: "healthScore",
    header: "Health Score",
    cell: ({ row }) => (
      <Badge variant={healthVariant(row.original.healthScore)} className={cn(healthClass(row.original.healthScore))}>
        {row.original.healthScore}
      </Badge>
    ),
  },
]

const projectColumns: ColumnDef<ProjectProfitabilityRow, unknown>[] = [
  { accessorKey: "project_name", header: "Project" },
  { accessorKey: "client_name", header: "Client", cell: ({ row }) => row.original.client_name ?? "—" },
  { accessorKey: "revenue", header: "Revenue", cell: ({ row }) => formatCurrency(row.original.revenue) },
  { accessorKey: "expenses", header: "Expenses", cell: ({ row }) => formatCurrency(row.original.expenses) },
  {
    accessorKey: "profit",
    header: "Profit",
    cell: ({ row }) => (
      <span className={row.original.profit >= 0 ? "text-success" : "text-destructive"}>
        {formatCurrency(row.original.profit)}
      </span>
    ),
  },
  {
    accessorKey: "marginPct",
    header: "Margin",
    cell: ({ row }) => (row.original.marginPct === null ? "—" : `${row.original.marginPct.toFixed(0)}%`),
  },
]

function StatTile({ icon: Icon, label, value }: { icon: typeof Activity; label: string; value: string }) {
  return (
    <Card className="gap-2 py-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 px-4">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="px-4">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
      </CardContent>
    </Card>
  )
}

export default function InsightsPage() {
  const [loading, setLoading] = useState(true)
  const [insights, setInsights] = useState<BusinessInsights | null>(null)
  const [forecast, setForecast] = useState<ForecastPoint[]>([])
  const [topClients, setTopClients] = useState<TopClientRow[]>([])
  const [projects, setProjects] = useState<ProjectProfitabilityRow[]>([])

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const [trend, insightsRes, clientsRes, projectsRes] = await Promise.all([
          getMonthlyTrend(),
          getBusinessInsights(),
          getTopClients(),
          getProjectProfitability(),
        ])
        if (!active) return
        setForecast(getRevenueForecast(trend))
        setInsights(insightsRes)
        setTopClients(clientsRes)
        setProjects(projectsRes)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load insights")
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => {
      active = false
    }
  }, [])

  const nextMonthForecast = forecast.find((p) => p.revenue === null)?.forecastRevenue ?? null

  if (loading || !insights) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Insights</h1>
        <p className="text-sm text-muted-foreground">
          Business analytics derived from your existing data — no manual entry required.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatTile icon={Flame} label="Monthly Burn Rate" value={formatCurrency(insights.burnRateMonthly)} />
        <StatTile
          icon={Activity}
          label="Client Retention"
          value={insights.retentionRatePct === null ? "—" : `${insights.retentionRatePct.toFixed(0)}%`}
        />
        <StatTile
          icon={TrendingUp}
          label="Next Month Forecast"
          value={nextMonthForecast === null ? "—" : formatCurrency(nextMonthForecast)}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Revenue Forecast</CardTitle>
        </CardHeader>
        <CardContent className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={forecast} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke="var(--chart-1)"
                strokeWidth={2}
                connectNulls={false}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="forecastRevenue"
                name="Forecast"
                stroke="var(--analytics)"
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Client Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={clientColumns}
            data={topClients}
            searchKey="client_name"
            searchPlaceholder="Search clients..."
            emptyMessage="No client revenue logged yet this year."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Most Profitable Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={projectColumns}
            data={projects}
            searchKey="project_name"
            searchPlaceholder="Search projects..."
            emptyMessage="No project revenue logged yet this year."
          />
        </CardContent>
      </Card>
    </div>
  )
}
