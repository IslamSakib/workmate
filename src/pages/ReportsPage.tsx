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
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DatePicker } from "@/components/shared/DatePicker"
import { DataTable } from "@/components/shared/DataTable"
import { ExportCsvButton } from "@/components/shared/ExportCsvButton"
import { currenciesIn, formatCurrency, sumByCurrency } from "@/lib/currency"
import { PageHeader } from "@/components/shared/PageHeader"
import { Stat } from "@/components/shared/Status"
import { Converted, ShowInSelector } from "@/components/shared/Converted"
import { useCurrencySettings } from "@/hooks/useCurrencySettings"
import { useShowIn } from "@/hooks/useShowIn"
import type { CurrencyCode } from "@/types/database"
import { formatDuration } from "@/lib/duration"
import { buildChartSeries, getReportFixedFeeRevenue, getReportPending, getReportRows, summarize, toReportRows } from "@/features/reports/api"
import type { ReportChartPoint, ReportPreset, ReportRow, ReportSummary } from "@/features/reports/types"
import type { PendingRow } from "@/features/invoices/api"
import { listProjects } from "@/features/projects/api"
import { generateReportPdf } from "@/lib/pdf/reportPdf"
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { ColumnDef } from "@tanstack/react-table"
import { formatDate } from "@/lib/date"

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
  { accessorKey: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
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
  const { base, rates } = useCurrencySettings()
  const [showIn, setShowIn] = useShowIn(base)
  const [preset, setPreset] = useState<ReportPreset>("monthly")
  const [customFrom, setCustomFrom] = useState<string | null>(format(startOfMonth(new Date()), "yyyy-MM-dd"))
  const [customTo, setCustomTo] = useState<string | null>(format(endOfMonth(new Date()), "yyyy-MM-dd"))
  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [rows, setRows] = useState<ReportRow[]>([])
  const [chart, setChart] = useState<ReportChartPoint[]>([])
  const [projects, setProjects] = useState<{ id: string; project_name: string }[]>([])
  const [projectId, setProjectId] = useState("all")
  const [pending, setPending] = useState<PendingRow[]>([])

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
    const pid = projectId === "all" ? undefined : projectId
    Promise.all([getReportRows(range.from, range.to, pid), getReportFixedFeeRevenue(range.from, range.to, pid), getReportPending(pid)])
      .then(([raw, flatFees, pend]) => {
        if (!active) return
        setPending(pend)
        setSummary(summarize(raw, flatFees))
        setRows(toReportRows(raw))
        setChart(buildChartSeries(raw, range.from, range.to, flatFees))
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load report"))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [range.from, range.to, projectId])

  useEffect(() => {
    listProjects().then(setProjects).catch(() => setProjects([]))
  }, [])

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

  const [chartPick, setChartPick] = useState<CurrencyCode | null>(null)
  const chartCode = chartPick && revenueCurrencies.includes(chartPick) ? chartPick : revenueCurrencies[0]

  return (
    <>
      <PageHeader
        title="Reports"
        description={rangeLabel}
        actions={
          <>
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
            <Button onClick={handleExportReport}>Download PDF</Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={preset} onValueChange={(v) => setPreset(v as ReportPreset)}>
            <TabsList>
              <TabsTrigger value="daily">Day</TabsTrigger>
              <TabsTrigger value="weekly">Week</TabsTrigger>
              <TabsTrigger value="monthly">Month</TabsTrigger>
              <TabsTrigger value="yearly">Year</TabsTrigger>
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
          <select
            aria-label="Project"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-9 rounded-md border bg-background px-2 text-sm"
          >
            <option value="all">All projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.project_name}
              </option>
            ))}
          </select>
        </div>
        <ShowInSelector value={showIn} onChange={setShowIn} base={base} rates={rates} />
      </div>

      {loading || !summary ? (
        <Skeleton className="h-64" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
            <Stat label="Hours" value={formatDuration(summary.totalSeconds)} />
            <Stat
              label="Revenue"
              value={<Converted amounts={summary.totalRevenue} mode={showIn} base={base} rates={rates} />}
              sub="Hourly work as logged; fixed projects as paid"
            />
            <Stat
              label="Pending to receive"
              value={<Converted amounts={sumByCurrency(pending, (p) => p.pending, (p) => p.currency)} mode={showIn} base={base} rates={rates} />}
              sub="Unpaid fixed-project balance and open invoices"
            />
            <Stat label="Projects" value={summary.projectCount} />
            <Stat label="Clients" value={summary.clientCount} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section aria-label="Hours">
              <h2 className="mb-2 text-sm font-semibold">Hours</h2>
              <div className="h-60 rounded-md border bg-card p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={32} />
                    <Tooltip formatter={(value) => `${value}h`} />
                    <Bar dataKey="hours" fill="var(--chart-2)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
            <section aria-label="Revenue">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Revenue</h2>
                {revenueCurrencies.length > 1 && (
                  <div className="flex gap-1">
                    {revenueCurrencies.map((c) => (
                      <button
                        key={c}
                        type="button"
                        aria-pressed={c === chartCode}
                        onClick={() => setChartPick(c)}
                        className={`rounded-sm border px-2 py-0.5 text-xs ${c === chartCode ? "border-primary font-semibold text-primary" : "text-muted-foreground"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div className="h-60 rounded-md border bg-card p-3">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart.map((c) => ({ label: c.label, revenue: c.revenue[chartCode] ?? 0 }))}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis tickLine={false} axisLine={false} fontSize={12} width={48} />
                    <Tooltip formatter={(value) => formatCurrency(Number(value), chartCode)} />
                    <Bar dataKey="revenue" fill="var(--chart-1)" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>

          {pending.length > 0 && (
            <section aria-label="Pending payments">
              <h2 className="mb-2 text-sm font-semibold">Pending payments</h2>
              <div className="overflow-x-auto rounded-md border bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="p-2 font-medium">Project</th>
                      <th className="p-2 text-right font-medium">Price</th>
                      <th className="p-2 text-right font-medium">Paid</th>
                      <th className="p-2 text-right font-medium">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pending.map((p, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="p-2">{p.project_name}</td>
                        <td className="p-2 text-right tabular-nums">{p.price == null ? "—" : formatCurrency(p.price, p.currency)}</td>
                        <td className="p-2 text-right tabular-nums">{formatCurrency(p.paid, p.currency)}</td>
                        <td className="p-2 text-right font-semibold tabular-nums">{formatCurrency(p.pending, p.currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <DataTable
            columns={columns}
            data={rows}
            searchKey="task_name"
            searchPlaceholder="Search tasks"
            emptyMessage="No time logged in this range."
          />
        </>
      )}
    </>
  )
}
