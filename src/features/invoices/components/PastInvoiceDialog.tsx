import { useEffect, useState } from "react"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CURRENCIES } from "@/lib/currency"
import type { CurrencyCode } from "@/types/database"
import { useClientsList } from "@/hooks/useClientsList"
import { useProjectsList } from "@/hooks/useProjectsList"
import { createPastInvoice } from "../api"

const today = () => new Date().toISOString().slice(0, 10)

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSaved: () => void
}

/** Adds an invoice for earlier work (a past project or a month of a job) that was billed outside the app. */
export function PastInvoiceDialog({ open, onOpenChange, onSaved }: Props) {
  const clients = useClientsList()
  const projects = useProjectsList()
  const [clientId, setClientId] = useState<string | null>(null)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [currency, setCurrency] = useState<CurrencyCode>("BDT")
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [issueDate, setIssueDate] = useState(today())
  const [periodStart, setPeriodStart] = useState<string | null>(null)
  const [periodEnd, setPeriodEnd] = useState<string | null>(null)
  const [paid, setPaid] = useState(true)
  const [paidDate, setPaidDate] = useState(today())
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setClientId(null)
    setProjectId(null)
    setDescription("")
    setAmount("")
    setIssueDate(today())
    setPeriodStart(null)
    setPeriodEnd(null)
    setPaid(true)
    setPaidDate(today())
  }, [open])

  const save = async () => {
    const value = Number(amount)
    if (!clientId) return toast.error("Choose the client or employer")
    if (!description.trim()) return toast.error("Describe what the invoice was for")
    if (!(value > 0)) return toast.error("Enter an amount greater than 0")
    if (periodStart && periodEnd && periodEnd < periodStart) return toast.error("Period end is before its start")
    setSaving(true)
    try {
      await createPastInvoice({
        client_id: clientId,
        project_id: projectId,
        currency,
        description: description.trim(),
        amount: value,
        issue_date: issueDate,
        period_start: periodStart,
        period_end: periodEnd,
        paid_date: paid ? paidDate : null,
      })
      toast.success(paid ? "Past invoice added and marked paid" : "Past invoice added")
      onOpenChange(false)
      onSaved()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a past invoice"
      description="Record work you already billed, such as an earlier project or a month of salary. It gets the next invoice number and counts in your reports."
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Client or employer</Label>
          <Select value={clientId ?? ""} onValueChange={setClientId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose" />
            </SelectTrigger>
            <SelectContent>
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
          <Select value={projectId ?? "none"} onValueChange={(v) => setProjectId(v === "none" ? null : v)}>
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
          <Label htmlFor="past-desc">What was it for</Label>
          <Input id="past-desc" placeholder="e.g. Full-time salary, July 2026" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="past-amount">Amount</Label>
          <Input id="past-amount" type="number" step="0.01" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Currency</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as CurrencyCode)}>
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
          <Label>Work period start</Label>
          <DatePicker value={periodStart} onChange={setPeriodStart} placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label>Work period end</Label>
          <DatePicker value={periodEnd} onChange={setPeriodEnd} placeholder="Optional" />
        </div>
        <div className="space-y-2">
          <Label>Invoice date</Label>
          <DatePicker value={issueDate} onChange={(v) => setIssueDate(v ?? today())} />
        </div>
        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Checkbox checked={paid} onCheckedChange={(v) => setPaid(v === true)} />
            Already paid
          </Label>
          {paid ? <DatePicker value={paidDate} onChange={(v) => setPaidDate(v ?? today())} /> : <div className="h-9" />}
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button type="button" onClick={save} disabled={saving}>
          {saving ? "Saving" : "Save"}
        </Button>
      </div>
    </FormDialog>
  )
}
