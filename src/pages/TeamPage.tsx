import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { InfoTooltip } from "@/components/shared/InfoTooltip"
import {
  inviteTeamMember,
  listTeamMembers,
  removeTeamMember,
  sendInviteEmail,
  updateTeamMemberRole,
} from "@/features/team/api"
import { InviteTeamMemberDialog } from "@/features/team/components/InviteTeamMemberDialog"
import { InviteFallbackDialog } from "@/features/team/components/InviteFallbackDialog"
import { getTeamColumns } from "@/features/team/components/columns"
import type { TeamMember, TeamRole } from "@/features/team/types"
import type { InviteInput } from "@/features/team/schema"
import { hasMinRole } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"

const ROLE_ARTICLE: Record<TeamRole, string> = { admin: "an", manager: "a", employee: "an" }

export default function TeamPage() {
  const { user, role } = useAuthStore()
  const readOnly = !hasMinRole(role, "admin")
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const [fallbackInvite, setFallbackInvite] = useState<{ email: string; role: TeamRole } | null>(null)
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

  const buildInviteMessage = (email: string, role: TeamRole) => {
    const signupUrl = `${window.location.origin}/register`
    const body =
      `Hi,\n\nYou've been invited to join our team on WorkMate as ${ROLE_ARTICLE[role]} ${role}.\n\n` +
      `Please sign up using this exact email address (${email}) and you'll be added to the team automatically:\n${signupUrl}\n\nThanks!`
    return { subject: "You're invited to join our team on WorkMate", body }
  }

  const copyInviteMessage = async (email: string, role: TeamRole) => {
    const { body } = buildInviteMessage(email, role)
    try {
      await navigator.clipboard.writeText(body)
      toast.success("Invite message copied — paste it into any email or chat to send it")
    } catch {
      toast.error("Couldn't copy to clipboard")
    }
  }

  const sendInvite = async (email: string, role: TeamRole) => {
    const signupUrl = `${window.location.origin}/register`
    try {
      await sendInviteEmail(email, role, signupUrl)
      toast.success(`Invite email sent to ${email}`)
    } catch {
      // The send-team-invite Edge Function isn't deployed/configured, or the email provider
      // rejected this recipient (e.g. sender domain not verified yet). Show an in-dashboard
      // dialog to copy the message rather than firing mailto: blindly — not everyone has a
      // local email app configured, and a silent "nothing happened" is a worse experience
      // than a clear next step.
      setFallbackInvite({ email, role })
    }
  }

  const handleInvite = async (values: InviteInput) => {
    await inviteTeamMember(values)
    load()
    await sendInvite(values.invited_email, values.role)
  }

  const handleResendInvite = (member: TeamMember) => {
    sendInvite(member.invited_email, member.role)
  }

  const handleCopyInvite = (member: TeamMember) => {
    copyInviteMessage(member.invited_email, member.role)
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
  const fallbackInviteMessage = fallbackInvite
    ? buildInviteMessage(fallbackInvite.email, fallbackInvite.role)
    : null
  const columns = getTeamColumns({
    onRoleChange: handleRoleChange,
    onRemove: (m) => setRemoving(m),
    onResendInvite: handleResendInvite,
    onCopyInvite: handleCopyInvite,
    readOnly,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
            <InfoTooltip text="Invite people to help you work. Give each person a role: Admin, Manager, or Employee. Each role can see and do different things." />
          </div>
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
          Waiting on {pendingInvites.map((m) => m.invited_email).join(", ")} to sign up at{" "}
          <span className="font-medium text-foreground">/register</span> using this exact email — they'll be
          added to your team automatically. If they didn't get your invite email, use{" "}
          <span className="font-medium text-foreground">Resend invite email</span> or{" "}
          <span className="font-medium text-foreground">Copy invite message</span> from the row menu to send it
          yourself.
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

      {fallbackInvite && fallbackInviteMessage && (
        <InviteFallbackDialog
          open={!!fallbackInvite}
          onOpenChange={(open) => !open && setFallbackInvite(null)}
          email={fallbackInvite.email}
          subject={fallbackInviteMessage.subject}
          message={fallbackInviteMessage.body}
        />
      )}

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
