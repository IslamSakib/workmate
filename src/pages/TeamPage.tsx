import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { inviteTeamMember, listTeamMembers, removeTeamMember, updateTeamMemberRole } from "@/features/team/api"
import { InviteTeamMemberDialog } from "@/features/team/components/InviteTeamMemberDialog"
import { getTeamColumns } from "@/features/team/components/columns"
import type { TeamMember, TeamRole } from "@/features/team/types"
import type { InviteInput } from "@/features/team/schema"
import { hasMinRole } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"

export default function TeamPage() {
  const { user, role } = useAuthStore()
  const readOnly = !hasMinRole(role, "admin")
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      if (!readOnly) setFormOpen(true)
      setSearchParams((prev) => {
        prev.delete("new")
        return prev
      })
    }
  }, [searchParams, setSearchParams, readOnly])

  const load = async () => {
    setLoading(true)
    try {
      setMembers(await listTeamMembers())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load team members")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleInvite = async (values: InviteInput) => {
    await inviteTeamMember(values)
    toast.success("Invite created")
    load()
  }

  const handleRoleChange = async (member: TeamMember, role: TeamRole) => {
    try {
      await updateTeamMemberRole(member.id, role)
      toast.success("Role updated")
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update role")
    }
  }

  const handleRemove = async () => {
    if (!removing) return
    try {
      await removeTeamMember(removing.id)
      toast.success("Team member removed")
      setRemoving(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove team member")
    }
  }

  const pendingInvites = members.filter((m) => m.status === "invited")
  const columns = getTeamColumns({ onRoleChange: handleRoleChange, onRemove: (m) => setRemoving(m), readOnly })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Owner: {user?.email}. Invite teammates and manage their roles.
          </p>
        </div>
        {!readOnly && (
          <Button
            onClick={() => {
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            Invite Team Member
          </Button>
        )}
      </div>

      {!readOnly && pendingInvites.length > 0 && (
        <div className="rounded-md border bg-muted/50 p-3 text-sm text-muted-foreground">
          Ask {pendingInvites.map((m) => m.invited_email).join(", ")} to sign up at{" "}
          <span className="font-medium text-foreground">/register</span> using this exact email — they'll be
          added to your team automatically.
        </div>
      )}

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <DataTable
          columns={columns}
          data={members}
          searchKey="email"
          searchPlaceholder="Search team members..."
          emptyMessage="No team members yet. Invite your first teammate to get started."
        />
      )}

      <InviteTeamMemberDialog open={formOpen} onOpenChange={setFormOpen} onSubmit={handleInvite} />

      <ConfirmDialog
        open={!!removing}
        onOpenChange={(open) => !open && setRemoving(null)}
        title="Remove team member?"
        description={`This will revoke ${removing?.invited_email}'s access to your account immediately.`}
        confirmLabel="Remove"
        onConfirm={handleRemove}
      />
    </div>
  )
}
