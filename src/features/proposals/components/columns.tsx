import type { ColumnDef } from "@tanstack/react-table"
import { FolderPlus, Link2, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import type { ProposalWithClient } from "../types"

interface ColumnActions {
  onEdit: (proposal: ProposalWithClient) => void
  onDelete: (proposal: ProposalWithClient) => void
  onCopyLink: (proposal: ProposalWithClient) => void
  onConvertToProject: (proposal: ProposalWithClient) => void
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  sent: "outline",
  accepted: "default",
  declined: "destructive",
}

const STATUS_CLASS: Record<string, string> = {
  accepted: "bg-success text-success-foreground",
}

export function getProposalColumns({
  onEdit,
  onDelete,
  onCopyLink,
  onConvertToProject,
}: ColumnActions): ColumnDef<ProposalWithClient, unknown>[] {
  return [
    { accessorKey: "project_name", header: "Project" },
    { id: "client", header: "Client", cell: ({ row }) => row.original.clients?.client_name ?? "—" },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.amount, row.original.currency),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <Badge
          variant={STATUS_VARIANT[row.original.status]}
          className={cn("capitalize", STATUS_CLASS[row.original.status])}
        >
          {row.original.status}
        </Badge>
      ),
    },
    { accessorKey: "valid_until", header: "Valid until", cell: ({ row }) => row.original.valid_until || "—" },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => {
        const proposal = row.original
        const canConvert = proposal.status === "accepted" && !proposal.created_project_id
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(proposal)}>
                <Pencil className="size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyLink(proposal)}>
                <Link2 className="size-4" />
                Copy accept link
              </DropdownMenuItem>
              {canConvert && (
                <DropdownMenuItem onClick={() => onConvertToProject(proposal)}>
                  <FolderPlus className="size-4" />
                  Convert to project
                </DropdownMenuItem>
              )}
              <DropdownMenuItem variant="destructive" onClick={() => onDelete(proposal)}>
                <Trash2 className="size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]
}
