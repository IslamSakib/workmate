import { useEffect, useMemo, useState } from "react"
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
} from "date-fns"
import { FileText } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePicker } from "@/components/shared/DatePicker"
import { DataTable } from "@/components/shared/DataTable"
import { InfoTooltip } from "@/components/shared/InfoTooltip"
import { ExportCsvButton } from "@/components/shared/ExportCsvButton"
import { currenciesIn, formatCurrency, formatCurrencyAmounts } from "@/lib/currency"
import type { CurrencyCode } from "@/types/database"
import { formatDuration } from "@/lib/duration"
import { buildChartSeries, getReportFixedFeeRevenue, getReportRows, summarize, toReportRows } from "@/features/reports/api"
import type { ReportChartPoint, ReportPreset, ReportRow, ReportSummary } from "@/features/reports/types"
import { generateReportPdf } from "@/lib/pdf/reportPdf"
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ColumnDef } from "@tanstack/react-table"

function getPresetRange(preset: ReportPreset): { from: Date; to: Date } {
  const now = new Date()
  switch (preset) {
    case "daily":
      return { from: now, to: now }
    case "weekly":
      return { from: startOfWeek(now), to: endOfWeek(now) }
    case "monthly":
      return { from: startOfMonth(now), to: endOfMonth(now) }
    case "yearly":
      return { from: startOfYear(now), to: endOfYear(now) }
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) }
  }
}

const columns: ColumnDef<ReportRow, unknown>[] = [
  { accessorKey: "date", header: "Date" },
  { accessorKey: "task_name", header: "Task" },
  { accessorKey: "project_name", header: "Project", cell: ({ row }) => row.original.project_name ?? "—" },
  { accessorKey: "client_name", header: "Client", cell: ({ row }) => row.original.client_name ?? "—" },
  {
    accessorKey: "duration_seconds",
    header: "Duration",
    cell: ({ row }) => formatDuration(row.original.duration_seconds),
  },
]

export default function ReportsPage() {
  const [preset, setPreset] = useState<ReportPreset>("monthly")
  const [customFrom, setCustomFrom] = useState<string | null>(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [customTo, setCustomTo] = useState<string | null>(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [chart, setChart] = useState<ReportChartPoint[]>([])

  const range = useMemo(() => {
    if (preset === "custom") {
      return {
        from: customFrom ? new Date(customFrom) : new Date(),
        to: customTo ? new Date(customTo) : new Date(),
      }
    }
    return getPresetRange(preset)
  }, [preset, customFrom, customTo])

  const rangeLabel = `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`
  const revenueCurrenciesFound = currenciesIn(...chart.map((c) => c.revenue))
  const revenueCurrencies = revenueCurrenciesFound.length > 0 ? revenueCurrenciesFound : (["USD"] as CurrencyCode[])

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([getReportRows(range.from, range.to), getReportFixedFeeRevenue(range.from, range.to)])
      .then(([raw, flatFees]) => {
        if (!active) return
        setSummary(summarize(raw, flatFees))
        setRows(toReportRows(raw))
        setChart(buildChartSeries(raw, range.from, range.to, flatFees))
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load report"))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [range.from, range.to])

  const handleExportReport = () => {
    if (!summary) return
    generateReportPdf({
      rangeLabel,
      totalSeconds: summary.totalSeconds,
      totalRevenue: summary.totalRevenue,
      projectCount: summary.projectCount,
      clientCount: summary.clientCount,
      rows: rows.map((r) => ({
        date: r.date,
        task_name: r.task_name,
        project_name: r.project_name,
        client_name: r.client_name,
        duration_seconds: r.duration_seconds,
        billable: r.billable,
      })),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
            <InfoTooltip text="See how much you worked and earned over any time period. You can download this as a PDF too." />
          </div>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <div className="flex gap-2">
          <ExportCsvButton
            filename="report.csv"
            rows={rows}
            columns={[
              { label: "Date", value: (r) => r.date },
              { label: "Task", value: (r) => r.task_name },
              { label: "Project", value: (r) => r.project_name },
              { label: "Client", value: (r) => r.client_name },
              { label: "Duration", value: (r) => formatDuration(r.duration_seconds) },
              { label: "Billable", value: (r) => r.billable },
            ]}
          />
          <Button onClick={handleExportReport}>
            <FileText className="size-4" />
            Report PDF
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={preset} onValueChange={(v) => setPreset(v as ReportPreset)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
            <TabsTrigger value="custom">Custom</TabsTrigger>
          </TabsList>
        </Tabs>
        {preset === "custom" && (
          <div className="flex items-center gap-2">
            <DatePicker value={customFrom} onChange={setCustomFrom} placeholder="From" />
            <span className="text-sm text-muted-foreground">to</span>
            <DatePicker value={customTo} onChange={setCustomTo} placeholder="To" />
          </div>
        )}
      </div>

      {loading || !summary ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatDuration(summary.totalSeconds)}</CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCurrencyAmounts(summary.totalRevenue)}</CardContent>
            </Card>
            <Card className="border-l-4 border-l-violet-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.projectCount}</CardContent>
            </Card>
            <Card className="border-l-4 border-l-amber-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Clients</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.clientCount}</CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Hours</CardTitle>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                    <Tooltip formatter={(value) => `${value}h`} />
                    <Bar dataKey="hours" fill="var(--chart-2)" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue</CardTitle>
              </CardHeader>
              <CardContent className={revenueCurrencies.length > 1 ? "space-y-4" : undefined}>
                {revenueCurrencies.map((code) => (
                  <div key={code}>
                    {revenueCurrencies.length > 1 && (
                      <p className="mb-1 text-xs font-medium text-muted-foreground">{code}</p>
                    )}
                    <div style={{ height: revenueCurrencies.length > 1 ? 256 / revenueCurrencies.length : 256 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={chart.map((c) => ({ label: c.label, revenue: c.revenue[code] ?? 0 }))}>
                          <defs>
                            <linearGradient id={`reportRevenueFill-${code}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                              <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                          <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                          <Tooltip formatter={(value) => formatCurrency(Number(value), code)} />
                          <Area
                            type="monotone"
                            dataKey="revenue"
                            stroke="var(--chart-1)"
                            fill={`url(#reportRevenueFill-${code})`}
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <DataTable
            columns={columns}
            data={rows}
            searchKey="task_name"
            searchPlaceholder="Search tasks..."
            emptyMessage="No time logged in this range."
          />
        </>
      )}
    </div>
  )
}
