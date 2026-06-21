import { createPdfContext, drawDivider, drawKeyValueRow, drawTable, drawTitle, downloadPdf } from "./shared"
import { formatCurrency } from "@/lib/currency"

export interface ReportPdfRow {
  date: string
  task_name: string
  project_name: string | null
  client_name: string | null
  hours: number
  billable: boolean
}

export interface ReportPdfData {
  rangeLabel: string
  totalHours: number
  totalRevenue: number
  projectCount: number
  clientCount: number
  rows: ReportPdfRow[]
}

export async function generateReportPdf(data: ReportPdfData) {
  const ctx = await createPdfContext()

  drawTitle(ctx, "Time & Revenue Report", data.rangeLabel)

  drawKeyValueRow(ctx, "Total hours", `${data.totalHours.toFixed(1)}h`)
  drawKeyValueRow(ctx, "Total revenue", formatCurrency(data.totalRevenue))
  drawKeyValueRow(ctx, "Projects", String(data.projectCount))
  drawKeyValueRow(ctx, "Clients", String(data.clientCount))
  ctx.cursorY -= 8
  drawDivider(ctx)

  drawTable(
    ctx,
    [
      { label: "Date", width: 70 },
      { label: "Task", width: 160 },
      { label: "Project", width: 110 },
      { label: "Client", width: 100 },
      { label: "Hours", width: 60, align: "right" },
    ],
    data.rows.map((row) => [
      row.date,
      row.task_name,
      row.project_name ?? "—",
      row.client_name ?? "—",
      row.hours.toFixed(2),
    ]),
  )

  const bytes = await ctx.doc.save()
  downloadPdf(bytes, `report-${data.rangeLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`)
}
