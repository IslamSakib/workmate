import { useEffect, useState } from "react"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/currency"
import { changeSalary } from "../api"
import { currentAmount, type RecurringInvoiceWithRelations } from "../types"

interface Props {
  job: RecurringInvoiceWithRelations | null
  onClose: () => void
  onSaved: () => void
}

export function ChangeSalaryDialog({ job, onClose, onSaved }: Props) {
  const [amount, setAmount] = useState("")
  const [from, setFrom] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!job) return
    setAmount("")
    setFrom(new Date().toISOString().slice(0, 10))
  }, [job])

  const save = async () => {
    const value = Number(amount)
    if (!job || !from) return
    if (!(value > 0)) return toast.error("Enter the new amount")
    setSaving(true)
    try {
      await changeSalary(job.id, value, from)
      toast.success("Saved. It applies to pay periods starting on or after that date.")
      onClose()
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const now = job ? currentAmount(job) : null
  return (
    <FormDialog
      open={!!job}
      onOpenChange={(o) => !o && onClose()}
      title={job?.employment_type ? "Change salary" : "Change amount"}
      description={
        job
          ? `Current: ${now == null ? "hours-based" : formatCurrency(now, job.currency)}. Invoices already created keep their old amount.`
          : ""
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-salary">{job?.employment_type ? "New salary per month" : "New amount per period"}</Label>
          <Input id="new-salary" type="number" step="0.01" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Applies to pay periods starting on or after</Label>
          <DatePicker value={from} onChange={setFrom} />
          <p className="text-xs text-muted-foreground">Example: a raise from 1 Nov is paid on 1 Dec, covering November.</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={saving}>
            {saving ? "Saving" : "Save"}
          </Button>
        </div>
      </div>
    </FormDialog>
  )
}
