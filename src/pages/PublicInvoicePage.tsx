import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/currency"
import { formatDuration } from "@/lib/duration"
import { getPublicInvoice } from "@/features/public-invoice/api"
import type { PublicInvoice } from "@/features/public-invoice/types"

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "secondary",
  scheduled: "outline",
  sent: "outline",
  partial: "outline",
  paid: "default",
  overdue: "destructive",
}

export default function PublicInvoicePage() {
  const { token } = useParams<{ token: string }>()
  const [invoice, setInvoice] = useState<PublicInvoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!token) return
    getPublicInvoice(token)
      .then((data) => (data ? setInvoice(data) : setError(true)))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <div className="min-h-svh bg-muted/40 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="text-center text-xl font-semibold tracking-tight">WorkMate</div>

        {loading && <Skeleton className="h-96" />}

        {!loading && (error || !invoice) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              This invoice link is invalid or has been removed.
            </CardContent>
          </Card>
        )}

        {!loading && invoice && (
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">Invoice {invoice.invoice_number}</h1>
                  <p className="text-sm text-muted-foreground">
                    {invoice.client_name ?? "—"}
                    {invoice.project_name ? ` · ${invoice.project_name}` : ""}
                  </p>
                </div>
                <Badge variant={STATUS_VARIANT[invoice.status] ?? "outline"} className="capitalize">
                  {invoice.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-muted-foreground">Issued</p>
                  <p className="font-medium">{format(new Date(invoice.issue_date), "MMM d, yyyy")}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Due</p>
                  <p className="font-medium">
                    {invoice.due_date ? format(new Date(invoice.due_date), "MMM d, yyyy") : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Total</p>
                  <p className="font-medium">{formatCurrency(invoice.total, invoice.currency)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Paid</p>
                  <p className="font-medium">{formatCurrency(invoice.amount_paid, invoice.currency)}</p>
                </div>
              </div>

              {invoice.items.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 font-medium">Item</th>
                        <th className="px-3 py-2 font-medium">Date</th>
                        <th className="px-3 py-2 font-medium">Duration</th>
                        <th className="px-3 py-2 text-right font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items.map((item, i) => (
                        <tr key={i} className="border-t">
                          <td className="px-3 py-2">{item.task_name}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {format(new Date(item.task_date), "MMM d, yyyy")}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {item.duration_seconds > 0 ? formatDuration(item.duration_seconds) : "—"}
                          </td>
                          <td className="px-3 py-2 text-right">{formatCurrency(item.amount, invoice.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {invoice.notes && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Notes</p>
                  {invoice.notes}
                </div>
              )}

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <p className="text-sm text-muted-foreground">Balance due</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(Math.max(0, invoice.total - invoice.amount_paid), invoice.currency)}
                  </p>
                </div>
                {invoice.payment_url && invoice.status !== "paid" && (
                  <Button asChild>
                    <a href={invoice.payment_url} target="_blank" rel="noopener noreferrer">
                      Pay now
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
