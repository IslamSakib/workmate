import { createPdfContext, drawDivider, drawKeyValueRow, drawTable, drawTitle, downloadPdf } from "./shared"
import { formatCurrency } from "@/lib/currency"
import type { CurrencyCode } from "@/types/database"

export interface InvoicePdfItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface InvoicePdfData {
  invoice_number: string
  status: string
  issue_date: string
  due_date: string | null
  currency: CurrencyCode
  client_name: string
  client_email?: string | null
  project_name?: string | null
  items: InvoicePdfItem[]
  subtotal: number
  tax: number
  discount: number
  total: number
  notes?: string | null
}

export async function generateInvoicePdf(data: InvoicePdfData) {
  const ctx = await createPdfContext()

  drawTitle(ctx, `Invoice ${data.invoice_number}`, `Status: ${data.status.toUpperCase()}`)

  drawKeyValueRow(ctx, "Bill to", data.client_name)
  if (data.client_email) drawKeyValueRow(ctx, "Email", data.client_email)
  if (data.project_name) drawKeyValueRow(ctx, "Project", data.project_name)
  drawKeyValueRow(ctx, "Issue date", data.issue_date)
  if (data.due_date) drawKeyValueRow(ctx, "Due date", data.due_date)
  ctx.cursorY -= 8
  drawDivider(ctx)

  drawTable(
    ctx,
    [
      { label: "Description", width: 260 },
      { label: "Qty", width: 60, align: "right" },
      { label: "Rate", width: 100, align: "right" },
      { label: "Amount", width: 80, align: "right" },
    ],
    data.items.map((item) => [
      item.description,
      String(item.quantity),
      formatCurrency(item.rate, data.currency),
      formatCurrency(item.amount, data.currency),
    ]),
  )

  ctx.cursorY -= 8
  drawDivider(ctx)
  drawKeyValueRow(ctx, "Subtotal", formatCurrency(data.subtotal, data.currency))
  drawKeyValueRow(ctx, "Tax", formatCurrency(data.tax, data.currency))
  drawKeyValueRow(ctx, "Discount", `-${formatCurrency(data.discount, data.currency)}`)
  drawKeyValueRow(ctx, "Total", formatCurrency(data.total, data.currency))

  if (data.notes) {
    ctx.cursorY -= 8
    drawDivider(ctx)
    drawKeyValueRow(ctx, "Notes", data.notes)
  }

  const bytes = await ctx.doc.save()
  downloadPdf(bytes, `${data.invoice_number}.pdf`)
}
