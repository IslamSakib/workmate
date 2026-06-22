import { useState } from "react"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { Client } from "../types"

interface InviteClientPortalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client | null
  onSubmit: (email: string) => Promise<void>
}

export function InviteClientPortalDialog({ open, onOpenChange, client, onSubmit }: InviteClientPortalDialogProps) {
  const [email, setEmail] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const submit = async () => {
    if (!email.includes("@")) {
      toast.error("Enter a valid email")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(email)
      setEmail("")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite client")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setEmail("")
      }}
      title="Invite to Client Portal"
      description={`Ask them to sign up at /register using this exact email — they'll get read-only access to ${client?.client_name ?? "this client"}'s projects, hours, and invoices automatically.`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="portal_email">Email</Label>
          <Input id="portal_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? "Inviting..." : "Invite"}
          </Button>
        </div>
      </div>
    </FormDialog>
  )
}
