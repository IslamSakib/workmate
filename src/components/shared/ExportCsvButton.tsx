import { Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { downloadCsv, toCsv, type CsvColumn } from "@/lib/csv"

interface ExportCsvButtonProps<T> {
  filename: string
  rows: T[]
  columns: CsvColumn<T>[]
}

export function ExportCsvButton<T>({ filename, rows, columns }: ExportCsvButtonProps<T>) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={rows.length === 0}
      onClick={() => downloadCsv(filename, toCsv(rows, columns))}
    >
      <Download className="size-4" />
      Export CSV
    </Button>
  )
}
