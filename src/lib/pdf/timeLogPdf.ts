import { createPdfContext, drawTable, drawTitle, downloadPdf } from "./shared"

export interface TimeLogPdfRow {
  date: string
  task_name: string
  project_name: string | null
  client_name: string | null
  duration_minutes: number
  billable: boolean
}

export async function generateTimeLogPdf(rows: TimeLogPdfRow[], rangeLabel: string) {
  const ctx = await createPdfContext()

  drawTitle(ctx, "Time Log", rangeLabel)

  drawTable(
    ctx,
    [
      { label: "Date", width: 70 },
      { label: "Task", width: 150 },
      { label: "Project", width: 100 },
      { label: "Client", width: 100 },
      { label: "Duration", width: 60, align: "right" },
      { label: "Billable", width: 60, align: "right" },
    ],
    rows.map((row) => [
      row.date,
      row.task_name,
      row.project_name ?? "—",
      row.client_name ?? "—",
      `${(row.duration_minutes / 60).toFixed(2)}h`,
      row.billable ? "Yes" : "No",
    ]),
  )

  const bytes = await ctx.doc.save()
  downloadPdf(bytes, `time-log-${rangeLabel.replace(/\s+/g, "-").toLowerCase()}.pdf`)
}
