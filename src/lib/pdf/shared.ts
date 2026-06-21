import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib"

export const PAGE_WIDTH = 595.28 // A4 width in points
export const PAGE_HEIGHT = 841.89 // A4 height in points
export const MARGIN = 48

export interface PdfContext {
  doc: PDFDocument
  page: PDFPage
  font: PDFFont
  bold: PDFFont
  cursorY: number
}

export async function createPdfContext(): Promise<PdfContext> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
  return { doc, page, font, bold, cursorY: PAGE_HEIGHT - MARGIN }
}

export function ensureSpace(ctx: PdfContext, needed: number) {
  if (ctx.cursorY - needed < MARGIN) {
    ctx.page = ctx.doc.addPage([PAGE_WIDTH, PAGE_HEIGHT])
    ctx.cursorY = PAGE_HEIGHT - MARGIN
  }
}

type Color = ReturnType<typeof rgb>

export function drawRect(
  ctx: PdfContext,
  opts: { x: number; y: number; width: number; height: number; color: Color },
) {
  ctx.page.drawRectangle(opts)
}

export function drawText(
  ctx: PdfContext,
  text: string,
  opts: { x: number; y: number; size?: number; bold?: boolean; color?: Color },
) {
  ctx.page.drawText(text, {
    x: opts.x,
    y: opts.y,
    size: opts.size ?? 10,
    font: opts.bold ? ctx.bold : ctx.font,
    color: opts.color ?? rgb(0.15, 0.15, 0.15),
  })
}

export function drawTitle(ctx: PdfContext, title: string, subtitle?: string) {
  ctx.page.drawText(title, { x: MARGIN, y: ctx.cursorY, size: 20, font: ctx.bold, color: rgb(0.08, 0.08, 0.08) })
  ctx.cursorY -= 26
  if (subtitle) {
    ctx.page.drawText(subtitle, { x: MARGIN, y: ctx.cursorY, size: 11, font: ctx.font, color: rgb(0.4, 0.4, 0.4) })
    ctx.cursorY -= 24
  } else {
    ctx.cursorY -= 12
  }
}

export function drawKeyValueRow(ctx: PdfContext, label: string, value: string) {
  ensureSpace(ctx, 16)
  ctx.page.drawText(label, { x: MARGIN, y: ctx.cursorY, size: 10, font: ctx.font, color: rgb(0.4, 0.4, 0.4) })
  ctx.page.drawText(value, { x: MARGIN + 140, y: ctx.cursorY, size: 10, font: ctx.bold, color: rgb(0.08, 0.08, 0.08) })
  ctx.cursorY -= 16
}

export function drawDivider(ctx: PdfContext) {
  ensureSpace(ctx, 12)
  ctx.page.drawLine({
    start: { x: MARGIN, y: ctx.cursorY },
    end: { x: PAGE_WIDTH - MARGIN, y: ctx.cursorY },
    thickness: 0.75,
    color: rgb(0.85, 0.85, 0.85),
  })
  ctx.cursorY -= 16
}

export interface TableColumn {
  label: string
  width: number
  align?: "left" | "right"
}

export function drawTable(
  ctx: PdfContext,
  columns: TableColumn[],
  rows: string[][],
  options?: { headerFill?: Color },
) {
  ensureSpace(ctx, 24)
  if (options?.headerFill) {
    const totalWidth = columns.reduce((sum, col) => sum + col.width, 0)
    ctx.page.drawRectangle({
      x: MARGIN - 6,
      y: ctx.cursorY - 14,
      width: totalWidth + 12,
      height: 20,
      color: options.headerFill,
    })
  }
  let x = MARGIN
  for (const col of columns) {
    ctx.page.drawText(col.label, { x, y: ctx.cursorY, size: 9, font: ctx.bold, color: rgb(0.4, 0.4, 0.4) })
    x += col.width
  }
  ctx.cursorY -= 8
  drawDivider(ctx)

  for (const row of rows) {
    ensureSpace(ctx, 18)
    x = MARGIN
    row.forEach((cell, i) => {
      const col = columns[i]
      const textX = col.align === "right" ? x + col.width - ctx.font.widthOfTextAtSize(cell, 9) : x
      ctx.page.drawText(cell, { x: textX, y: ctx.cursorY, size: 9, font: ctx.font, color: rgb(0.15, 0.15, 0.15) })
      x += col.width
    })
    ctx.cursorY -= 18
  }
}

export function downloadPdf(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
