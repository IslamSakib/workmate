import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { InfoTooltip } from "@/components/shared/InfoTooltip"
import {
  createProposal,
  deleteProposal,
  listProposals,
  markProposalProjectCreated,
  updateProposal,
} from "@/features/proposals/api"
import { ProposalFormDialog } from "@/features/proposals/components/ProposalFormDialog"
import { getProposalColumns } from "@/features/proposals/components/columns"
import type { ProposalInput } from "@/features/proposals/schema"
import type { ProposalWithClient } from "@/features/proposals/types"
import { createProject } from "@/features/projects/api"
import { ProjectFormDialog } from "@/features/projects/components/ProjectFormDialog"
import type { ProjectInput } from "@/features/projects/schema"

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<ProposalWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProposalWithClient | null>(null)
  const [deleting, setDeleting] = useState<ProposalWithClient | null>(null)
  const [converting, setConverting] = useState<ProposalWithClient | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setProposals(await listProposals())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load proposals")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: ProposalInput) => {
    if (editing) {
      await updateProposal(editing.id, values)
      toast.success("Proposal updated")
    } else {
      await createProposal(values)
      toast.success("Proposal created")
    }
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteProposal(deleting.id)
      toast.success("Proposal deleted")
      setDeleting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete proposal")
    }
  }

  const handleCopyLink = async (proposal: ProposalWithClient) => {
    const url = `${window.location.origin}/p/${proposal.public_token}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("Accept link copied")
    } catch {
      toast.error("Couldn't copy link — your browser blocked clipboard access")
    }
  }

  const handleCreateProject = async (values: ProjectInput) => {
    if (!converting) return
    try {
      const project = await createProject(values)
      await markProposalProjectCreated(converting.id, project.id)
      toast.success("Project created from proposal")
      setConverting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create project")
    }
  }

  const columns = getProposalColumns({
    onEdit: (proposal) => {
      setEditing(proposal)
      setFormOpen(true)
    },
    onDelete: (proposal) => setDeleting(proposal),
    onCopyLink: handleCopyLink,
    onConvertToProject: (proposal) => setConverting(proposal),
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Proposals</h1>
            <InfoTooltip text="Pitch a scope of work and price to a client before starting a project. Share the accept link — once they accept, convert it straight into a project." />
          </div>
          <p className="text-sm text-muted-foreground">Pitch work before it becomes a project.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          New Proposal
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <DataTable
          columns={columns}
          data={proposals}
          searchKey="project_name"
          searchPlaceholder="Search proposals..."
          emptyMessage="No proposals yet. Pitch your first one to get started."
        />
      )}

      <ProposalFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        proposal={editing}
        onSubmit={handleSubmit}
      />

      <ProjectFormDialog
        open={!!converting}
        onOpenChange={(open) => !open && setConverting(null)}
        initialValues={
          converting
            ? {
                project_name: converting.project_name,
                client_id: converting.client_id,
                fixed_price: converting.amount,
                hourly_rate: null,
                currency: converting.currency,
              }
            : undefined
        }
        onSubmit={handleCreateProject}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete proposal?"
        description={`This will permanently delete the proposal for ${deleting?.project_name}.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
