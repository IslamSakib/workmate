export interface CsvColumn<T> {
  label: string
  value: (row: T) => string | number | boolean | null | undefined
}

function escapeCsvCell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value)
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const header = columns.map((c) => escapeCsvCell(c.label)).join(",")
  const lines = rows.map((row) => columns.map((c) => escapeCsvCell(c.value(row))).join(","))
  return [header, ...lines].join("\r\n")
}

/** BOM prefix so Excel opens the file as UTF-8 instead of mangling non-ASCII currency symbols. */
export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
