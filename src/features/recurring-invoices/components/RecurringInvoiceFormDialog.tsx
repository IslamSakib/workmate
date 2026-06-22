import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENCIES } from "@/lib/currency"
import { useClientsList } from "@/hooks/useClientsList"
import { useProjectsList } from "@/hooks/useProjectsList"
import { recurringInvoiceSchema, type RecurringInvoiceInput } from "../schema"
import type { RecurringInvoice } from "../types"

const FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
]

interface RecurringInvoiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  recurringInvoice?: RecurringInvoice | null
  onSubmit: (values: RecurringInvoiceInput) => Promise<void>
}

export function RecurringInvoiceFormDialog({
  open,
  onOpenChange,
  recurringInvoice,
  onSubmit,
}: RecurringInvoiceFormDialogProps) {
  const clients = useClientsList()
  const projects = useProjectsList()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RecurringInvoiceInput>({
    resolver: zodResolver(recurringInvoiceSchema) as Resolver<RecurringInvoiceInput>,
    defaultValues: { currency: "USD", frequency: "monthly", active: true },
  })

  useEffect(() => {
    if (open) {
      reset(
        recurringInvoice
          ? {
              client_id: recurringInvoice.client_id,
              project_id: recurringInvoice.project_id,
              currency: recurringInvoice.currency,
              frequency: recurringInvoice.frequency,
              next_run_date: recurringInvoice.next_run_date,
              active: recurringInvoice.active,
              notes: recurringInvoice.notes ?? "",
            }
          : {
              currency: "USD",
              frequency: "monthly",
              active: true,
              next_run_date: new Date().toISOString().slice(0, 10),
            },
      )
    }
  }, [open, recurringInvoice, reset])

  const submit = async (values: RecurringInvoiceInput) => {
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save recurring invoice")
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={recurringInvoice ? "Edit Recurring Invoice" : "New Recurring Invoice"}
      description="Automatically bills a client/project's billable hours on a schedule. Generated the next time anyone opens the app after the run date passes."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select
              value={watch("client_id") ?? "none"}
              onValueChange={(v) => setValue("client_id", v === "none" ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No client</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Project</Label>
            <Select
              value={watch("project_id") ?? "none"}
              onValueChange={(v) => setValue("project_id", v === "none" ? null : v)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="No project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Frequency</Label>
            <Select
              value={watch("frequency")}
              onValueChange={(v) => setValue("frequency", v as RecurringInvoiceInput["frequency"])}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCY_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select
              value={watch("currency")}
              onValueChange={(v) => setValue("currency", v as RecurringInvoiceInput["currency"])}
            >
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
            <Label>Next run date</Label>
            <DatePicker value={watch("next_run_date")} onChange={(v) => setValue("next_run_date", v ?? "")} />
            {errors.next_run_date && <p className="text-sm text-destructive">{errors.next_run_date.message}</p>}
          </div>
          <div className="flex items-center justify-between space-y-2 pt-6">
            <Label htmlFor="active">Active</Label>
            <Switch id="active" checked={watch("active")} onCheckedChange={(v) => setValue("active", v)} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={3} {...register("notes")} />
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
