import { useState } from "react"
import {
  type ColumnDef,
  type RowSelectionState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

declare module "@tanstack/react-table" {
  // Columns marked secondary are hidden on tablet widths and below the md breakpoint's table layout.
  interface ColumnMeta<TData, TValue> {
    secondary?: boolean
    /** Rendered as the card title on mobile. Defaults to the first data column. */
    primary?: boolean
    _?: [TData, TValue]
  }
}

const PAGE_SIZE = 25

interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
  emptyMessage?: string
  toolbar?: React.ReactNode
  maxHeight?: string
  enableRowSelection?: boolean
  renderBulkActions?: (selectedRows: TData[], clearSelection: () => void) => React.ReactNode
}

export function DataTable<TData>({
  columns,
  data,
  searchKey,
  searchPlaceholder = "Search",
  emptyMessage = "No results.",
  toolbar,
  maxHeight,
  enableRowSelection = false,
  renderBulkActions,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, columnVisibility, rowSelection },
    initialState: { pagination: { pageSize: PAGE_SIZE } },
    enableRowSelection,
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue) => {
      const value = searchKey ? row.getValue(searchKey) : undefined
      return String(value ?? Object.values(row.original as object))
        .toLowerCase()
        .includes(String(filterValue).toLowerCase())
    },
  })

  const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original)
  const clearSelection = () => setRowSelection({})
  const hideableColumns = table.getAllLeafColumns().filter((column) => column.getCanHide())
  const rows = table.getRowModel().rows
  const pageCount = table.getPageCount()
  const { pageIndex } = table.getState().pagination
  const total = table.getFilteredRowModel().rows.length

  return (
    <div className="space-y-3">
      {selectedRows.length > 0 && renderBulkActions ? (
        renderBulkActions(selectedRows, clearSelection)
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Input
            type="search"
            aria-label={searchPlaceholder}
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="sm:max-w-xs"
          />
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
            {hideableColumns.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="hidden md:inline-flex">
                    Columns
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {hideableColumns.map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                      onSelect={(e) => e.preventDefault()}
                    >
                      {typeof column.columnDef.header === "string" ? column.columnDef.header : column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      )}

      {/* Mobile: one stacked card per row */}
      <ul className="divide-y rounded-md border md:hidden">
        {rows.length === 0 && <li className="p-6 text-sm text-muted-foreground">{emptyMessage}</li>}
        {rows.map((row) => {
          const cells = row.getVisibleCells()
          const select = cells.find((c) => c.column.id === "select")
          const actions = cells.find((c) => c.column.id === "actions")
          const data = cells.filter((c) => c.column.id !== "select" && c.column.id !== "actions")
          const title = data.find((c) => c.column.columnDef.meta?.primary) ?? data[0]
          const rest = data.filter((c) => c !== title)
          return (
            <li key={row.id} className="space-y-2 p-3" data-state={row.getIsSelected() ? "selected" : undefined}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-2">
                  {select && flexRender(select.column.columnDef.cell, select.getContext())}
                  <div className="min-w-0 break-words font-medium">
                    {title && flexRender(title.column.columnDef.cell, title.getContext())}
                  </div>
                </div>
                {actions && <div className="shrink-0">{flexRender(actions.column.columnDef.cell, actions.getContext())}</div>}
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {rest.map((cell) => (
                  <div key={cell.id} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">
                      {typeof cell.column.columnDef.header === "string" ? cell.column.columnDef.header : cell.column.id}
                    </dt>
                    <dd className="break-words tabular-nums">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          )
        })}
      </ul>

      {/* md and up: real table; secondary columns drop out below xl */}
      <div
        className={cn("hidden overflow-auto rounded-md border md:block", maxHeight && "overflow-y-auto")}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-card">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const sorted = header.column.getIsSorted()
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={sorted === "asc" ? "ascending" : sorted === "desc" ? "descending" : undefined}
                      className={cn(header.column.columnDef.meta?.secondary && "hidden xl:table-cell")}
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button type="button" className="font-medium" onClick={header.column.getToggleSortingHandler()}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {sorted === "asc" ? " (asc)" : sorted === "desc" ? " (desc)" : ""}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? "selected" : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell
                      key={cell.id}
                      className={cn(cell.column.columnDef.meta?.secondary && "hidden xl:table-cell")}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {pageIndex + 1} of {pageCount} ({total} rows)
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              Previous
            </Button>
            <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
