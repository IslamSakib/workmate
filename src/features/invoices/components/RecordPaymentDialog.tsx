import { useEffect, useState } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { formatCurrency } from "@/lib/currency"
import { getInvoicePayments } from "../api"
import type { InvoicePayment, InvoiceWithRelations } from "../types"

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceWithRelations | null
  onSubmit: (amount: number, paidDate: string, method: string) => Promise<void>
  onDeletePayment: (paymentId: string) => Promise<void>
}

export function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  onSubmit,
  onDeletePayment,
}: RecordPaymentDialogProps) {
  const [amount, setAmount] = useState("")
  const [paidDate, setPaidDate] = useState(new Date().toISOString().slice(0, 10))
  const [method, setMethod] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [payments, setPayments] = useState<InvoicePayment[]>([])
  const [loadingPayments, setLoadingPayments] = useState(false)
  const [deletingPayment, setDeletingPayment] = useState<InvoicePayment | null>(null)

  const remaining = invoice ? Number(invoice.total) - Number(invoice.amount_paid) : 0

  const loadPayments = async (invoiceId: string) => {
    setLoadingPayments(true)
    try {
      setPayments(await getInvoicePayments(invoiceId))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load payment history")
    } finally {
      setLoadingPayments(false)
    }
  }

  useEffect(() => {
    if (open && invoice) {
      loadPayments(invoice.id)
    } else {
      setPayments([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?.id])

  const reset = () => {
    setAmount("")
    setPaidDate(new Date().toISOString().slice(0, 10))
    setMethod("")
  }

  const submit = async () => {
    if (!invoice) return
    const parsed = Number(amount)
    if (!parsed || parsed <= 0) {
      toast.error("Enter a payment amount greater than 0")
      return
    }
    setSubmitting(true)
    try {
      await onSubmit(parsed, paidDate, method)
      reset()
      await loadPayments(invoice.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeletePayment = async () => {
    if (!deletingPayment || !invoice) return
    try {
      await onDeletePayment(deletingPayment.id)
      toast.success("Payment removed")
      setDeletingPayment(null)
      await loadPayments(invoice.id)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to remove payment")
    }
  }

  return (
    <>
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
          {(payments.length > 0 || loadingPayments) && (
            <div className="space-y-1.5 rounded-md border p-2">
              <p className="text-xs font-medium text-muted-foreground">Payment history</p>
              {loadingPayments && <p className="text-sm text-muted-foreground">Loading...</p>}
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-muted-foreground">
                    {p.paid_date}
                    {p.method ? ` · ${p.method}` : ""}
                  </span>
                  <span className="flex shrink-0 items-center gap-1">
                    <span className="font-mono">{formatCurrency(Number(p.amount), invoice?.currency)}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-destructive"
                      onClick={() => setDeletingPayment(p)}
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </span>
                </div>
              ))}
            </div>
          )}

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
              Close
            </Button>
            <Button type="button" onClick={submit} disabled={submitting}>
              {submitting ? "Saving..." : "Record Payment"}
            </Button>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deletingPayment}
        onOpenChange={(open) => !open && setDeletingPayment(null)}
        title="Remove this payment?"
        description={
          deletingPayment
            ? `This removes the ${formatCurrency(Number(deletingPayment.amount), invoice?.currency)} payment from ${deletingPayment.paid_date} and recalculates the invoice's balance.`
            : ""
        }
        onConfirm={handleDeletePayment}
      />
    </>
  )
}
