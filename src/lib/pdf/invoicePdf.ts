import { rgb } from "pdf-lib"
import {
  createPdfContext,
  drawDivider,
  drawRect,
  drawTable,
  drawText,
  downloadPdf,
  ensureSpace,
  MARGIN,
  PAGE_HEIGHT,
  PAGE_WIDTH,
} from "./shared"
import { formatCurrency } from "@/lib/currency"
import { formatDuration } from "@/lib/duration"
import type { CurrencyCode } from "@/types/database"

export interface InvoicePdfItem {
  task_name: string
  task_date: string
  duration_seconds: number
  rate: number
  amount: number
}

export interface InvoicePdfData {
  invoice_number: string
  status: string
  issue_date: string
  due_date: string | null
  period_start: string | null
  period_end: string | null
  currency: CurrencyCode
  client_name: string
  client_email?: string | null
  project_name?: string | null
  items: InvoicePdfItem[]
  total: number
}

const ACCENT = rgb(0.33, 0.36, 0.85)
const ACCENT_LIGHT = rgb(0.93, 0.94, 0.99)
const HEADER_FILL = rgb(0.96, 0.96, 0.98)
const GRAY = rgb(0.45, 0.45, 0.48)
const DARK = rgb(0.1, 0.1, 0.12)

export async function generateInvoicePdf(data: InvoicePdfData) {
  const ctx = await createPdfContext()
  const contentWidth = PAGE_WIDTH - MARGIN * 2

  drawRect(ctx, { x: 0, y: PAGE_HEIGHT - 6, width: PAGE_WIDTH, height: 6, color: ACCENT })
  ctx.cursorY -= 18

  drawText(ctx, "INVOICE", { x: MARGIN, y: ctx.cursorY, size: 26, bold: true, color: DARK })

  const numberLabel = data.invoice_number
  const numberWidth = ctx.bold.widthOfTextAtSize(numberLabel, 13)
  drawText(ctx, numberLabel, { x: PAGE_WIDTH - MARGIN - numberWidth, y: ctx.cursorY + 6, size: 13, bold: true, color: ACCENT })

  const statusLabel = data.status.toUpperCase()
  const statusWidth = ctx.bold.widthOfTextAtSize(statusLabel, 9)
  drawText(ctx, statusLabel, { x: PAGE_WIDTH - MARGIN - statusWidth, y: ctx.cursorY - 10, size: 9, bold: true, color: GRAY })

  ctx.cursorY -= 30
  drawDivider(ctx)
  ctx.cursorY -= 8

  // Two-column "Billed To" / "Invoice Details" block
  const colWidth = contentWidth / 2
  const blockTop = ctx.cursorY
  const rightX = MARGIN + colWidth

  drawText(ctx, "BILLED TO", { x: MARGIN, y: blockTop, size: 9, bold: true, color: GRAY })
  let leftY = blockTop - 16
  drawText(ctx, data.client_name, { x: MARGIN, y: leftY, size: 12, bold: true, color: DARK })
  if (data.client_email) {
    leftY -= 15
    drawText(ctx, data.client_email, { x: MARGIN, y: leftY, size: 10, color: GRAY })
  }
  if (data.project_name) {
    leftY -= 15
    drawText(ctx, `Project: ${data.project_name}`, { x: MARGIN, y: leftY, size: 10, color: GRAY })
  }

  drawText(ctx, "INVOICE DETAILS", { x: rightX, y: blockTop, size: 9, bold: true, color: GRAY })
  let rightY = blockTop - 16
  const detailRow = (label: string, value: string) => {
    drawText(ctx, label, { x: rightX, y: rightY, size: 10, color: GRAY })
    const valueWidth = ctx.bold.widthOfTextAtSize(value, 10)
    drawText(ctx, value, { x: rightX + colWidth - valueWidth, y: rightY, size: 10, bold: true, color: DARK })
    rightY -= 15
  }
  detailRow("Issue date", data.issue_date)
  if (data.due_date) detailRow("Due date", data.due_date)
  if (data.period_start && data.period_end) {
    detailRow("Billing period", `${data.period_start} – ${data.period_end}`)
  }

  ctx.cursorY = Math.min(leftY, rightY) - 14
  drawDivider(ctx)
  ctx.cursorY -= 10

  drawTable(
    ctx,
    [
      { label: "Task", width: 195 },
      { label: "Date", width: 75 },
      { label: "Duration", width: 95, align: "right" },
      { label: "Rate", width: 65, align: "right" },
      { label: "Amount", width: 70, align: "right" },
    ],
    data.items.map((item) => [
      item.task_name,
      item.task_date,
      formatDuration(item.duration_seconds),
      formatCurrency(item.rate, data.currency),
      formatCurrency(item.amount, data.currency),
    ]),
    { headerFill: HEADER_FILL },
  )

  ctx.cursorY -= 8
  drawDivider(ctx)
  ctx.cursorY -= 12

  const boxWidth = 220
  const boxHeight = 44
  ensureSpace(ctx, boxHeight + 40)
  const boxX = PAGE_WIDTH - MARGIN - boxWidth
  const boxY = ctx.cursorY - boxHeight
  drawRect(ctx, { x: boxX, y: boxY, width: boxWidth, height: boxHeight, color: ACCENT_LIGHT })
  drawText(ctx, "TOTAL DUE", { x: boxX + 16, y: boxY + boxHeight - 18, size: 9, bold: true, color: GRAY })
  const totalLabel = formatCurrency(data.total, data.currency)
  const totalWidth = ctx.bold.widthOfTextAtSize(totalLabel, 18)
  drawText(ctx, totalLabel, { x: boxX + boxWidth - 16 - totalWidth, y: boxY + 12, size: 18, bold: true, color: ACCENT })

  ctx.cursorY = boxY - 24
  drawDivider(ctx)
  const thankYou = "Thank you for your business."
  const thankYouWidth = ctx.font.widthOfTextAtSize(thankYou, 10)
  drawText(ctx, thankYou, { x: (PAGE_WIDTH - thankYouWidth) / 2, y: ctx.cursorY - 6, size: 10, color: GRAY })

  const bytes = await ctx.doc.save()
  downloadPdf(bytes, `${data.invoice_number}.pdf`)
}
