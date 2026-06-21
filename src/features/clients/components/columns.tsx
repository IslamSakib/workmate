import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { Client } from "../types"

interface ColumnActions {
  onEdit: (client: Client) => void
  onDelete: (client: Client) => void
}

export function getClientColumns({ onEdit, onDelete }: ColumnActions): ColumnDef<Client, unknown>[] {
  return [
    { accessorKey: "client_name", header: "Client" },
    { accessorKey: "company_name", header: "Company", cell: ({ row }) => row.original.company_name || "—" },
    { accessorKey: "email", header: "Email", cell: ({ row }) => row.original.email || "—" },
    { accessorKey: "currency", header: "Currency" },
    { accessorKey: "country", header: "Country", cell: ({ row }) => row.original.country || "—" },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="size-8">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(row.original)}>
              <Pencil className="size-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => onDelete(row.original)}>
              <Trash2 className="size-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]
}
