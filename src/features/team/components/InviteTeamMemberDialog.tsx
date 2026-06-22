import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { inviteSchema, type InviteInput } from "../schema"

const ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
]

interface InviteTeamMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: InviteInput) => Promise<void>
}

export function InviteTeamMemberDialog({ open, onOpenChange, onSubmit }: InviteTeamMemberDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InviteInput>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { role: "employee" },
  })

  useEffect(() => {
    if (open) reset({ role: "employee" })
  }, [open, reset])

  const submit = async (values: InviteInput) => {
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to invite team member")
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Invite Team Member"
      description="They'll need to sign up using this exact email to join your team automatically."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="invited_email">Email</Label>
          <Input id="invited_email" type="email" {...register("invited_email")} />
          {errors.invited_email && (
            <p className="text-sm text-destructive">{errors.invited_email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label>Role</Label>
          <Select value={watch("role")} onValueChange={(v) => setValue("role", v as InviteInput["role"])}>
            <SelectTrigger className="w-full">
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
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Inviting..." : "Invite"}
          </Button>
        </div>
      </form>
    </FormDialog>
  )
}
