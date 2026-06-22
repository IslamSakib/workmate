import { useState } from "react"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/currency"
import type { InvoiceWithRelations } from "../types"

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceWithRelations | null
  onSubmit: (amount: number, paidDate: string, method: string) => Promise<void>
}

export function RecordPaymentDialog({ open, onOpenChange, invoice, onSubmit }: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("")
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const remaining = invoice ? Number(invoice.total) - Number(invoice.amount_paid) : 0

  const reset = () => {
    setAmount("")
    setPaidDate(new Date().toISOString().slice(0, 10))
    setMethod("")
  }

  const submit = async () => {
    const parsed = Number(amount)
    if (!parsed || parsed <= 0) {
      toast.error("Enter a payment amount greater than 0")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(parsed, paidDate, method)
      reset()
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) reset()
      }}
      title="Record payment"
      description={
        invoice
          ? `${formatCurrency(remaining, invoice.currency)} remaining on invoice ${invoice.invoice_number}.`
          : undefined
      }
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payment_amount">Amount</Label>
          <Input
            id="payment_amount"
            type="number"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Paid date</Label>
          <DatePicker value={paidDate} onChange={(v) => setPaidDate(v ?? paidDate)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment_method">Method (optional)</Label>
          <Input
            id="payment_method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            placeholder="e.g. Bank transfer, PayPal"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={submit} disabled={submitting}>
            {submitting ? "Saving..." : "Record Payment"}
          </Button>
        </div>
      </div>
    </FormDialog>
  )
}
