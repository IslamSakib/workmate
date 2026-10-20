import { useEffect, useState } from "react"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Status } from "@/components/shared/Status"
import { formatCurrency } from "@/lib/currency"
import { cn } from "@/lib/utils"
import { useCurrencySettings } from "@/hooks/useCurrencySettings"
import { getInvoicePayments } from "../api"
import type { InvoicePayment, InvoiceWithRelations } from "../types"
import { formatDate } from "@/lib/date"

export interface PaymentInput {
  amount: number
  paid_date: string
  method: string | null
  reference: string | null
  fx_rate: number | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice: InvoiceWithRelations | null
  onSubmit: (payment: PaymentInput) => Promise<void>
  onDeletePayment: (paymentId: string) => Promise<void>
  onReceipt: (payment: InvoicePayment, paidToDate: number) => void
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Advance = first payment that leaves a balance; Final/Full clears it; anything between is Partial. */
function labelFor(index: number, cumulative: number, total: number, kind: string): string {
  if (cumulative >= total) return index === 0 ? "Full" : "Final"
  if (index === 0) return kind === "advance" || kind === "milestone" ? "Part" : "Advance"
  return "Partial"
}

export function RecordPaymentDialog({ open, onOpenChange, invoice, onSubmit, onDeletePayment, onReceipt }: Props) {
  const { base } = useCurrencySettings()
  const today = new Date().toISOString().slice(0, 10)
  const [amount, setAmount] = useState("")
  const [paidDate, setPaidDate] = useState(today)
  const [method, setMethod] = useState("")
  const [reference, setReference] = useState("")
  const [rate, setRate] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [payments, setPayments] = useState<InvoicePayment[]>([])
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState<InvoicePayment | null>(null)

  const total = invoice ? Number(invoice.total) : 0
  const paid = invoice ? Number(invoice.amount_paid) : 0
  const remaining = round2(total - paid)
  const foreign = invoice ? invoice.currency !== base : false

  const loadPayments = async (invoiceId: string) => {
    setLoading(true)
    try {
      setPayments(await getInvoicePayments(invoiceId))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load payments")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && invoice) {
      loadPayments(invoice.id)
      setAmount(String(Math.max(0, round2(Number(invoice.total) - Number(invoice.amount_paid)))))
    } else {
      setPayments([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, invoice?.id, invoice?.amount_paid])

  const reset = () => {
    setPaidDate(today)
    setMethod("")
    setReference("")
    setRate("")
  }

  const submit = async () => {
    const parsed = Number(amount)
    if (!parsed || parsed <= 0) return toast.error("Enter an amount greater than 0")
    if (parsed > remaining + 0.001) return toast.error(`That is more than the balance due (${formatCurrency(remaining, invoice?.currency)})`)
    setSubmitting(true)
    try {
      await onSubmit({
        amount: parsed,
        paid_date: paidDate,
        method: method || null,
        reference: reference || null,
        fx_rate: foreign && rate ? Number(rate) : null,
      })
      reset()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment")
    } finally {
      setSubmitting(false)
    }
  }

  const remove = async () => {
    if (!deleting) return
    try {
      await onDeletePayment(deleting.id)
      toast.success("Payment removed")
      setDeleting(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to remove payment")
    }
  }

  const history = payments.map((p, i) => {
    const cumulative = round2(payments.slice(0, i + 1).reduce((acc, x) => acc + Number(x.amount), 0))
    return { p, cumulative, label: labelFor(i, cumulative, total, invoice?.kind ?? "standard") }
  })
  const cur = invoice?.currency

  return (
    <>
      <FormDialog
        open={open}
        onOpenChange={(next) => {
          onOpenChange(next)
          if (!next) reset()
        }}
        title={invoice ? `Payments for ${invoice.invoice_number}` : "Payments"}
        description={invoice ? `${formatCurrency(remaining, cur)} still to be paid of ${formatCurrency(total, cur)}.` : undefined}
      >
        <div className="space-y-5">
          <div className="space-y-1.5">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Payments received</p>
            {loading && <p className="text-sm text-muted-foreground">Loading</p>}
            {!loading && history.length === 0 && <p className="text-sm text-muted-foreground">None yet.</p>}
            {history.length > 0 && (
              <ul className="divide-y rounded-md border">
                {history.map(({ p, cumulative, label }) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 p-2.5 text-sm">
                    <span className="min-w-0">
                      <Status tone={label === "Final" || label === "Full" ? "good" : label === "Advance" ? "info" : "warn"}>{label}</Status>{" "}
                      <span className="text-muted-foreground">
                        {[formatDate(p.paid_date), p.method, p.reference].filter(Boolean).join(", ")}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      <span className="font-mono tabular-nums">{formatCurrency(Number(p.amount), cur)}</span>
                      <Button type="button" variant="outline" size="sm" onClick={() => onReceipt(p, cumulative)}>
                        Receipt
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="text-destructive" onClick={() => setDeleting(p)}>
                        Remove
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {remaining > 0 && (
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Record a payment</p>
              <div className="inline-flex overflow-hidden rounded-md border" role="group" aria-label="Quick amounts">
                {(
                  [
                    ["Full balance", remaining],
                    ["50%", round2(remaining / 2)],
                  ] as const
                ).map(([label, value]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setAmount(String(value))}
                    className={cn("px-3 py-1.5 text-sm", Number(amount) === value ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label htmlFor="payment_amount">Amount ({cur})</Label>
                  <Input id="payment_amount" type="number" step="0.01" min="0" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Date</Label>
                  <DatePicker value={paidDate} onChange={(v) => setPaidDate(v ?? paidDate)} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payment_method">Method</Label>
                  <Input id="payment_method" value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Bank transfer, bKash, PayPal" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="payment_ref">Reference</Label>
                  <Input id="payment_ref" value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Optional" />
                </div>
                {foreign && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="payment_rate">Rate received ({base} per {cur})</Label>
                    <Input id="payment_rate" type="number" step="any" min="0" inputMode="decimal" value={rate} onChange={(e) => setRate(e.target.value)} />
                    <p className="text-xs text-muted-foreground">
                      Fill in if the bank rate differed from the agreed rate; reports then show invoiced and received separately.
                    </p>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button type="button" onClick={submit} disabled={submitting}>
                  {submitting ? "Saving" : "Save payment"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </FormDialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Remove this payment?"
        description={
          deleting
            ? `This removes the ${formatCurrency(Number(deleting.amount), cur)} payment from ${formatDate(deleting.paid_date)} and recalculates the balance.`
            : ""
        }
        onConfirm={remove}
      />
    </>
  )
}
