import { rgb } from "pdf-lib"
import {
  createPdfContext,
  drawTable,
  drawText,
  downloadPdf,
  ensureSpace,
  MARGIN,
  PAGE_WIDTH,
  pdfMoney,
  sanitize,
  type PdfContext,
} from "./shared"
import { formatDuration } from "@/lib/duration"
import type { CurrencyCode } from "@/types/database"

export interface InvoicePdfItem {
  task_name: string
  task_date: string
  duration_seconds: number
  rate: number
  /** Negative for "advance received" credit lines. */
  amount: number
}

export interface InvoicePdfPayment {
  date: string
  amount: number
  method?: string | null
  reference?: string | null
}

export interface InvoicePdfData {
  invoice_number: string
  status: string
  kind?: "standard" | "advance" | "milestone"
  issue_date: string
  due_date: string | null
  period_start: string | null
  period_end: string | null
  currency: CurrencyCode
  from_name?: string | null
  client_name: string
  client_email?: string | null
  project_name?: string | null
  items: InvoicePdfItem[]
  total: number
  amount_paid: number
  payments?: InvoicePdfPayment[]
  notes?: string | null
  payment_url?: string | null
}

// Flat black and white: no fills, no accent colour, hairline rules only.
const BLACK = rgb(0, 0, 0)
const GREY = rgb(0.4, 0.4, 0.4)
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2

const TITLE: Record<NonNullable<InvoicePdfData["kind"]>, string> = {
  standard: "INVOICE",
  advance: "ADVANCE INVOICE",
  milestone: "MILESTONE INVOICE",
}

function rule(ctx: PdfContext, thickness = 0.5) {
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.cursorY },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.cursorY },
    thickness,
    color: BLACK,
  })
}

function rightText(ctx: PdfContext, text: string, right: number, y: number, size: number, bold = false) {
  const font = bold ? ctx.bold : ctx.font
  const w = font.widthOfTextAtSize(sanitize(text), size)
  drawText(ctx, text, { x: right - w, y, size, bold, color: BLACK })
}

/** Label on the left, amount on the right of a 220pt summary column. */
function summaryRow(ctx: PdfContext, label: string, value: string, bold = false) {
  const boxWidth = 240
  const x = PAGE_WIDTH - MARGIN - boxWidth
  drawText(ctx, label, { x, y: ctx.cursorY, size: 10, bold, color: bold ? BLACK : GREY })
  rightText(ctx, value, PAGE_WIDTH - MARGIN, ctx.cursorY, 10, bold)
  ctx.cursorY -= 16
}

export async function generateInvoicePdf(data: InvoicePdfData) {
  const ctx = await createPdfContext()
  const money = (n: number) => pdfMoney(n, data.currency)
  const kind = data.kind ?? "standard"

  // Header
  if (data.from_name) drawText(ctx, data.from_name, { x: MARGIN, y: ctx.cursorY, size: 11, bold: true, color: BLACK })
  ctx.cursorY -= 26
  drawText(ctx, TITLE[kind], { x: MARGIN, y: ctx.cursorY, size: 22, bold: true, color: BLACK })
  rightText(ctx, data.invoice_number, PAGE_WIDTH - MARGIN, ctx.cursorY + 6, 12, true)
  rightText(ctx, data.status.toUpperCase(), PAGE_WIDTH - MARGIN, ctx.cursorY - 8, 9)
  ctx.cursorY -= 22
  rule(ctx, 1.5)
  ctx.cursorY -= 20

  // Billed to / details
  const colWidth = CONTENT_WIDTH / 2
  const top = ctx.cursorY
  const rightX = MARGIN + colWidth + 20
  drawText(ctx, "BILLED TO", { x: MARGIN, y: top, size: 8, bold: true, color: GREY })
  let leftY = top - 14
  drawText(ctx, data.client_name, { x: MARGIN, y: leftY, size: 11, bold: true, color: BLACK })
  if (data.client_email) {
    leftY -= 14
    drawText(ctx, data.client_email, { x: MARGIN, y: leftY, size: 10, color: BLACK })
  }
  if (data.project_name) {
    leftY -= 14
    drawText(ctx, `Project: ${data.project_name}`, { x: MARGIN, y: leftY, size: 10, color: BLACK })
  }

  drawText(ctx, "DETAILS", { x: rightX, y: top, size: 8, bold: true, color: GREY })
  let rightY = top - 14
  const detail = (label: string, value: string) => {
    drawText(ctx, label, { x: rightX, y: rightY, size: 10, color: GREY })
    rightText(ctx, value, PAGE_WIDTH - MARGIN, rightY, 10, true)
    rightY -= 14
  }
  detail("Issued", data.issue_date)
  if (data.due_date) detail("Due", data.due_date)
  if (data.period_start && data.period_end) detail("Period", `${data.period_start} to ${data.period_end}`)
  detail("Currency", data.currency)

  ctx.cursorY = Math.min(leftY, rightY) - 18

  // Lines
  const isHours = (i: InvoicePdfItem) => i.duration_seconds > 0
  drawTable(
    ctx,
    [
      { label: "DESCRIPTION", width: 215 },
      { label: "DATE", width: 70 },
      { label: "HOURS", width: 65, align: "right" },
      { label: "RATE", width: 70, align: "right" },
      { label: "AMOUNT", width: 77, align: "right" },
    ],
    data.items.map((i) => [
      i.task_name,
      i.task_date,
      isHours(i) ? formatDuration(i.duration_seconds) : "-",
      isHours(i) ? money(i.rate) : "-",
      money(i.amount),
    ]),
  )
  ctx.cursorY -= 4
  rule(ctx)
  ctx.cursorY -= 18

  // Totals
  const balance = Math.max(0, data.total - data.amount_paid)
  const paid = data.amount_paid > 0
  ensureSpace(ctx, 90)
  summaryRow(ctx, "Total", money(data.total))
  if (paid) summaryRow(ctx, "Paid so far", `-${money(data.amount_paid)}`)
  ctx.cursorY -= 2
  rule(ctx, 1.5)
  ctx.cursorY -= 16
  summaryRow(ctx, "BALANCE DUE", money(balance), true)
  rule(ctx, 1.5)
  ctx.cursorY -= 22

  // Payment history
  if (data.payments && data.payments.length > 0) {
    ensureSpace(ctx, 30 + data.payments.length * 14)
    drawText(ctx, "PAYMENTS RECEIVED", { x: MARGIN, y: ctx.cursorY, size: 8, bold: true, color: GREY })
    ctx.cursorY -= 14
    for (const p of data.payments) {
      const label = [p.date, p.method, p.reference].filter(Boolean).join("  ")
      drawText(ctx, label, { x: MARGIN, y: ctx.cursorY, size: 10, color: BLACK })
      rightText(ctx, money(p.amount), PAGE_WIDTH - MARGIN, ctx.cursorY, 10)
      ctx.cursorY -= 14
    }
    ctx.cursorY -= 10
  }

  if (data.payment_url) {
    ensureSpace(ctx, 30)
    drawText(ctx, "PAY ONLINE", { x: MARGIN, y: ctx.cursorY, size: 8, bold: true, color: GREY })
    ctx.cursorY -= 14
    drawText(ctx, data.payment_url, { x: MARGIN, y: ctx.cursorY, size: 10, color: BLACK })
    ctx.cursorY -= 20
  }

  if (data.notes) {
    ensureSpace(ctx, 40)
    drawText(ctx, "NOTES", { x: MARGIN, y: ctx.cursorY, size: 8, bold: true, color: GREY })
    ctx.cursorY -= 14
    drawText(ctx, data.notes, { x: MARGIN, y: ctx.cursorY, size: 10, color: BLACK })
  }

  downloadPdf(await ctx.doc.save(), `${data.invoice_number}.pdf`)
}

/** One-page receipt for a single payment (advance, partial, or final). */
export async function generateReceiptPdf(data: {
  invoice_number: string
  client_name: string
  currency: CurrencyCode
  payment: InvoicePdfPayment
  invoice_total: number
  paid_to_date: number
  from_name?: string | null
}) {
  const ctx = await createPdfContext()
  const money = (n: number) => pdfMoney(n, data.currency)
  if (data.from_name) drawText(ctx, data.from_name, { x: MARGIN, y: ctx.cursorY, size: 11, bold: true, color: BLACK })
  ctx.cursorY -= 26
  drawText(ctx, "PAYMENT RECEIPT", { x: MARGIN, y: ctx.cursorY, size: 22, bold: true, color: BLACK })
  ctx.cursorY -= 22
  rule(ctx, 1.5)
  ctx.cursorY -= 24
  const row = (label: string, value: string, bold = false) => {
    drawText(ctx, label, { x: MARGIN, y: ctx.cursorY, size: 10, color: GREY })
    rightText(ctx, value, PAGE_WIDTH - MARGIN, ctx.cursorY, 10, bold)
    ctx.cursorY -= 18
  }
  row("Received from", data.client_name, true)
  row("Invoice", data.invoice_number)
  row("Payment date", data.payment.date)
  if (data.payment.method) row("Method", data.payment.method)
  if (data.payment.reference) row("Reference", data.payment.reference)
  ctx.cursorY -= 6
  rule(ctx)
  ctx.cursorY -= 20
  row("Amount received", money(data.payment.amount), true)
  row("Invoice total", money(data.invoice_total))
  row("Paid to date", money(data.paid_to_date))
  row("Balance remaining", money(Math.max(0, data.invoice_total - data.paid_to_date)), true)
  ctx.cursorY -= 4
  rule(ctx, 1.5)
  downloadPdf(await ctx.doc.save(), `Receipt-${data.invoice_number}-${data.payment.date}.pdf`)
}
