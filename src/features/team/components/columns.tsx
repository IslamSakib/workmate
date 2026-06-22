import { format } from "date-fns"
import type { ColumnDef } from "@tanstack/react-table"
import { MoreHorizontal, Trash2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { TeamMember, TeamRole } from "../types"

const ROLE_OPTIONS: { value: TeamRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
]

interface ColumnActions {
  onRoleChange: (member: TeamMember, role: TeamRole) => void
  onRemove: (member: TeamMember) => void
  readOnly?: boolean
}

export function getTeamColumns({ onRoleChange, onRemove, readOnly }: ColumnActions): ColumnDef<TeamMember, unknown>[] {
  return [
    {
      id: "email",
      header: "Email",
      accessorFn: (row) => row.invited_email,
    },
    {
      id: "role",
      header: "Role",
      cell: ({ row }) =>
        readOnly ? (
          <Badge variant="outline" className="capitalize">
            {row.original.role}
          </Badge>
        ) : (
          <Select value={row.original.role} onValueChange={(v) => onRoleChange(row.original, v as TeamRole)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.original.status === "active" ? "default" : "secondary"} className="capitalize">
          {row.original.status}
        </Badge>
      ),
    },
    {
      accessorKey: "created_at",
      header: "Invited",
      cell: ({ row }) => format(new Date(row.original.created_at), "MMM d, yyyy"),
    },
    ...(readOnly
      ? []
      : [
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
                  <DropdownMenuItem variant="destructive" onClick={() => onRemove(row.original)}>
                    <Trash2 className="size-4" />
                    Remove
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          } satisfies ColumnDef<TeamMember, unknown>,
        ]),
  ]
}
