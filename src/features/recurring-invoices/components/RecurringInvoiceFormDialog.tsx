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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CURRENCIES } from "@/lib/currency"
import { useClientsList } from "@/hooks/useClientsList"
import { useProjectsList } from "@/hooks/useProjectsList"
import { recurringInvoiceSchema, type RecurringInvoiceInput } from "../schema"
import type { RecurringInvoice } from "../types"

const FREQUENCIES = [
  { value: "monthly", label: "Every month" },
  { value: "weekly", label: "Every week" },
  { value: "quarterly", label: "Every 3 months" },
]

const today = () => new Date().toISOString().slice(0, 10)

const DEFAULTS: Partial<RecurringInvoiceInput> = {
  currency: "BDT",
  frequency: "monthly",
  billing_mode: "fixed",
  due_days: 7,
  issue_as: "sent",
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  recurringInvoice?: RecurringInvoice | null
  onSubmit: (values: RecurringInvoiceInput) => Promise<void>
}

export function RecurringInvoiceFormDialog({ open, onOpenChange, recurringInvoice, onSubmit }: Props) {
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
    defaultValues: DEFAULTS,
  })

  useEffect(() => {
    if (!open) return
    reset(
      recurringInvoice
        ? {
            client_id: recurringInvoice.client_id,
            project_id: recurringInvoice.project_id,
            currency: recurringInvoice.currency,
            frequency: recurringInvoice.frequency,
            billing_mode: recurringInvoice.billing_mode,
            amount: recurringInvoice.amount ?? undefined,
            description: recurringInvoice.description ?? "",
            start_date: recurringInvoice.start_date ?? recurringInvoice.next_run_date,
            due_days: recurringInvoice.due_days,
            issue_as: recurringInvoice.issue_as,
            ends_on: recurringInvoice.ends_on,
            notes: recurringInvoice.notes ?? "",
          }
        : { ...DEFAULTS, start_date: today(), ends_on: null },
    )
  }, [open, recurringInvoice, reset])

  const submit = async (values: RecurringInvoiceInput) => {
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save")
    }
  }

  const mode = watch("billing_mode")
  const locked = !!recurringInvoice && recurringInvoice.periods_generated > 0

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={recurringInvoice ? "Edit recurring invoice" : "New recurring invoice"}
      description="Creates an invoice automatically every period until you pause or delete it. Use it for a salary, a retainer, or any regular billing."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Client or employer</Label>
            <Select value={watch("client_id") ?? "none"} onValueChange={(v) => setValue("client_id", v === "none" ? null : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.client_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Project (optional)</Label>
            <Select value={watch("project_id") ?? "none"} onValueChange={(v) => setValue("project_id", v === "none" ? null : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.project_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>What to bill</Label>
            <Select value={mode} onValueChange={(v) => setValue("billing_mode", v as RecurringInvoiceInput["billing_mode"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">A fixed amount each period (salary, retainer)</SelectItem>
                <SelectItem value="tasks">Billable tasks logged in the previous period</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "fixed" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount per period</Label>
                <Input id="amount" type="number" step="0.01" min="0" inputMode="decimal" {...register("amount")} />
                {errors.amount && <p className="text-sm text-destructive">{errors.amount.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={watch("currency")} onValueChange={(v) => setValue("currency", v as RecurringInvoiceInput["currency"])}>
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
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="description">Invoice line text</Label>
                <Input id="description" placeholder="e.g. Part-time web development" {...register("description")} />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label>Repeats</Label>
            <Select value={watch("frequency")} onValueChange={(v) => setValue("frequency", v as RecurringInvoiceInput["frequency"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FREQUENCIES.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>First invoice date</Label>
            {locked ? (
              <Input value={watch("start_date")} disabled />
            ) : (
              <DatePicker value={watch("start_date")} onChange={(v) => setValue("start_date", v ?? "")} />
            )}
            {errors.start_date && <p className="text-sm text-destructive">{errors.start_date.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_days">Payment due after (days)</Label>
            <Input id="due_days" type="number" min="0" inputMode="numeric" {...register("due_days")} />
          </div>
          <div className="space-y-2">
            <Label>Create invoices as</Label>
            <Select value={watch("issue_as")} onValueChange={(v) => setValue("issue_as", v as RecurringInvoiceInput["issue_as"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sent">Sent (ready to be paid)</SelectItem>
                <SelectItem value="draft">Draft (review first)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Stop on (optional)</Label>
            <DatePicker value={watch("ends_on") ?? ""} onChange={(v) => setValue("ends_on", v || null)} />
            <p className="text-xs text-muted-foreground">Leave empty to keep billing until you stop it.</p>
            {errors.ends_on && <p className="text-sm text-destructive">{errors.ends_on.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes on the invoice</Label>
          <Textarea id="notes" rows={2} {...register("notes")} />
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving" : "Save"}
          </Button>
        </div>
      </form>
    </FormDialog>
  )
}
