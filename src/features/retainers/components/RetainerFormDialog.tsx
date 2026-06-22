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
import { retainerSchema, type RetainerInput } from "../schema"
import type { Retainer } from "../types"

interface RetainerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  retainer?: Retainer | null
  onSubmit: (values: RetainerInput) => Promise<void>
}

export function RetainerFormDialog({ open, onOpenChange, retainer, onSubmit }: RetainerFormDialogProps) {
  const clients = useClientsList()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RetainerInput>({
    resolver: zodResolver(retainerSchema) as Resolver<RetainerInput>,
    defaultValues: { currency: "USD", active: true },
  })

  useEffect(() => {
    if (open) {
      reset(
        retainer
          ? {
              client_id: retainer.client_id,
              monthly_fee: retainer.monthly_fee,
              included_hours: retainer.included_hours,
              overage_rate: retainer.overage_rate,
              currency: retainer.currency,
              next_billing_date: retainer.next_billing_date,
              active: retainer.active,
              notes: retainer.notes ?? "",
            }
          : { currency: "USD", active: true },
      )
    }
  }, [open, retainer, reset])

  const submit = async (values: RetainerInput) => {
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save retainer")
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={retainer ? "Edit Retainer" : "New Retainer"}
      description="Monthly retainer terms for a client. Used hours are calculated automatically from billable tasks logged for this client each month."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Client</Label>
            <Select value={watch("client_id")} onValueChange={(v) => setValue("client_id", v)}>
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
            <Label htmlFor="monthly_fee">Monthly fee</Label>
            <Input id="monthly_fee" type="number" step="0.01" {...register("monthly_fee")} />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={watch("currency")} onValueChange={(v) => setValue("currency", v as RetainerInput["currency"])}>
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
            <Label htmlFor="included_hours">Included hours / month</Label>
            <Input id="included_hours" type="number" step="0.5" {...register("included_hours")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="overage_rate">Overage rate (per hour)</Label>
            <Input id="overage_rate" type="number" step="0.01" {...register("overage_rate")} />
          </div>

          <div className="space-y-2">
            <Label>Next billing date</Label>
            <DatePicker value={watch("next_billing_date")} onChange={(v) => setValue("next_billing_date", v ?? "")} />
            {errors.next_billing_date && (
              <p className="text-sm text-destructive">{errors.next_billing_date.message}</p>
            )}
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
