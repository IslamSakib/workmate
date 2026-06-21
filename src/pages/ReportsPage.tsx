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
import { Download, FileText } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePicker } from "@/components/shared/DatePicker"
import { DataTable } from "@/components/shared/DataTable"
import { formatCurrency } from "@/lib/currency"
import { buildChartSeries, getReportRows, summarize, toReportRows } from "@/features/reports/api"
import type { ReportChartPoint, ReportPreset, ReportRow, ReportSummary } from "@/features/reports/types"
import { generateReportPdf } from "@/lib/pdf/reportPdf"
import { generateTimeLogPdf } from "@/lib/pdf/timeLogPdf"
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
    accessorKey: "duration_minutes",
    header: "Hours",
    cell: ({ row }) => (row.original.duration_minutes / 60).toFixed(2),
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

  useEffect(() => {
    let active = true
    setLoading(true)
    getReportRows(range.from, range.to)
      .then((raw) => {
        if (!active) return
        setSummary(summarize(raw))
        setRows(toReportRows(raw))
        setChart(buildChartSeries(raw, range.from, range.to))
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
      totalHours: summary.totalHours,
      totalRevenue: summary.totalRevenue,
      projectCount: summary.projectCount,
      clientCount: summary.clientCount,
      rows: rows.map((r) => ({
        date: r.date,
        task_name: r.task_name,
        project_name: r.project_name,
        client_name: r.client_name,
        hours: r.duration_minutes / 60,
        billable: r.billable,
      })),
    })
  }

  const handleExportTimeLog = () => {
    generateTimeLogPdf(
      rows.map((r) => ({
        date: r.date,
        task_name: r.task_name,
        project_name: r.project_name,
        client_name: r.client_name,
        duration_minutes: r.duration_minutes,
        billable: r.billable,
      })),
      rangeLabel,
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">{rangeLabel}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportTimeLog}>
            <Download className="size-4" />
            Time Log PDF
          </Button>
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Hours</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.totalHours.toFixed(1)}h</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{formatCurrency(summary.totalRevenue)}</CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Projects</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{summary.projectCount}</CardContent>
            </Card>
            <Card>
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
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chart}>
                    <defs>
                      <linearGradient id="reportRevenueFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Area type="monotone" dataKey="revenue" stroke="var(--chart-1)" fill="url(#reportRevenueFill)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
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
