import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENCIES } from "@/lib/currency"
import { useClientsList } from "@/hooks/useClientsList"
import { proposalSchema, type ProposalInput } from "../schema"
import type { Proposal } from "../types"

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "accepted", label: "Accepted" },
  { value: "declined", label: "Declined" },
]

interface ProposalFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  proposal?: Proposal | null
  onSubmit: (values: ProposalInput) => Promise<void>
}

export function ProposalFormDialog({ open, onOpenChange, proposal, onSubmit }: ProposalFormDialogProps) {
  const clients = useClientsList()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProposalInput>({
    resolver: zodResolver(proposalSchema) as Resolver<ProposalInput>,
    defaultValues: { currency: "USD", status: "draft" },
  })

  useEffect(() => {
    if (open) {
      reset(
        proposal
          ? {
              client_id: proposal.client_id,
              project_name: proposal.project_name,
              description: proposal.description ?? "",
              amount: proposal.amount,
              currency: proposal.currency,
              status: proposal.status,
              valid_until: proposal.valid_until,
            }
          : { currency: "USD", status: "draft" },
      )
    }
  }, [open, proposal, reset])

  const submit = async (values: ProposalInput) => {
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save proposal")
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={proposal ? "Edit Proposal" : "New Proposal"}
      description="Pitch a scope of work and price before a project exists."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="project_name">Project name</Label>
            <Input id="project_name" {...register("project_name")} />
            {errors.project_name && (
              <p className="text-sm text-destructive">{errors.project_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={watch("client_id") ?? ""} onValueChange={(v) => setValue("client_id", v)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select client" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.client_id && <p className="text-sm text-destructive">{errors.client_id.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as ProposalInput["status"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input id="amount" type="number" step="0.01" min="0" {...register("amount")} />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={watch("currency")} onValueChange={(v) => setValue("currency", v as ProposalInput["currency"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.code} — {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valid until</Label>
            <DatePicker value={watch("valid_until")} onChange={(v) => setValue("valid_until", v)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Scope of work</Label>
          <Textarea id="description" rows={4} {...register("description")} />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save"}
          </Button>
        </div>
      </form>
    </FormDialog>
  )
}
