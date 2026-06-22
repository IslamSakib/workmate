import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENCIES, formatCurrency } from "@/lib/currency"
import { formatDuration } from "@/lib/duration"
import { useClientsList } from "@/hooks/useClientsList"
import { useProjectsList } from "@/hooks/useProjectsList"
import { listBillableTasks } from "../api"
import { invoiceSchema, type InvoiceInput } from "../schema"
import type { BillableTask, Invoice, InvoiceItem } from "../types"

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "sent", label: "Sent" },
  { value: "partial", label: "Partially Paid" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
]

interface InvoiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: Invoice | null
  items?: InvoiceItem[]
  onSubmit: (values: InvoiceInput, items: BillableTask[]) => Promise<void>
}

function nextInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`
}

export function InvoiceFormDialog({ open, onOpenChange, invoice, items, onSubmit }: InvoiceFormDialogProps) {
  const clients = useClientsList()
  const projects = useProjectsList()
  const [tasks, setTasks] = useState<BillableTask[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [loadingTasks, setLoadingTasks] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema) as Resolver<InvoiceInput>,
    defaultValues: {
      currency: "USD",
      status: "draft",
      issue_date: new Date().toISOString().slice(0, 10),
      period_start: new Date().toISOString().slice(0, 10),
      period_end: new Date().toISOString().slice(0, 10),
    },
  })

  useEffect(() => {
    if (open) {
      reset(
        invoice
          ? {
              invoice_number: invoice.invoice_number,
              client_id: invoice.client_id,
              project_id: invoice.project_id,
              currency: invoice.currency,
              status: invoice.status,
              issue_date: invoice.issue_date,
              due_date: invoice.due_date,
              period_start: invoice.period_start ?? new Date().toISOString().slice(0, 10),
              period_end: invoice.period_end ?? new Date().toISOString().slice(0, 10),
              scheduled_date: invoice.scheduled_date,
              notes: invoice.notes,
            }
          : {
              invoice_number: nextInvoiceNumber(),
              currency: "USD",
              status: "draft",
              issue_date: new Date().toISOString().slice(0, 10),
              period_start: new Date().toISOString().slice(0, 10),
              period_end: new Date().toISOString().slice(0, 10),
            },
      )
      setTasks([])
      setCheckedIds(new Set((items ?? []).filter((i) => i.task_id).map((i) => i.task_id as string)))
    }
  }, [open, invoice, items, reset])

  const clientId = watch("client_id")
  const projectId = watch("project_id")
  const periodStart = watch("period_start")
  const periodEnd = watch("period_end")
  const currency = watch("currency")

  useEffect(() => {
    if (!open || !periodStart || !periodEnd) return
    let active = true
    setLoadingTasks(true)
    listBillableTasks({
      clientId,
      projectId,
      periodStart,
      periodEnd,
      excludeInvoiceId: invoice?.id,
    })
      .then((fetched) => {
        if (!active) return
        setTasks(fetched)
        setCheckedIds((prev) => {
          const fetchedIds = new Set(fetched.map((t) => t.id))
          const next = new Set([...prev].filter((id) => fetchedIds.has(id)))
          for (const t of fetched) {
            if (!prev.has(t.id) && !invoice) next.add(t.id)
          }
          return next
        })
      })
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load tasks"))
      .finally(() => active && setLoadingTasks(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, clientId, projectId, periodStart, periodEnd, invoice?.id])

  const selectedTasks = tasks.filter((t) => checkedIds.has(t.id))
  const total = selectedTasks.reduce((acc, t) => acc + t.amount, 0)

  const toggleTask = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const submit = async (values: InvoiceInput) => {
    if (selectedTasks.length === 0) {
      toast.error("Select at least one task to bill")
      return
    }
    try {
      await onSubmit(values, selectedTasks)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save invoice")
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={invoice ? "Edit Invoice" : "New Invoice"}
      description="Pick a client/project and billing period — matching tasks and their amounts are picked up automatically."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="invoice_number">Invoice number</Label>
            <Input id="invoice_number" {...register("invoice_number")} />
            {errors.invoice_number && (
              <p className="text-sm text-destructive">{errors.invoice_number.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as InvoiceInput["status"])}>
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
            <Label>Issue date</Label>
            <DatePicker value={watch("issue_date")} onChange={(v) => setValue("issue_date", v ?? "")} />
          </div>
          <div className="space-y-2">
            <Label>Due date</Label>
            <DatePicker value={watch("due_date")} onChange={(v) => setValue("due_date", v)} />
          </div>

          {watch("status") === "scheduled" && (
            <div className="space-y-2">
              <Label>Scheduled date</Label>
              <DatePicker value={watch("scheduled_date")} onChange={(v) => setValue("scheduled_date", v)} />
              <p className="text-xs text-muted-foreground">
                Auto-flips to "Sent" once this date passes and anyone opens the app.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Billing period start</Label>
            <DatePicker value={watch("period_start")} onChange={(v) => setValue("period_start", v ?? "")} />
            {errors.period_start && <p className="text-sm text-destructive">{errors.period_start.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>Billing period end</Label>
            <DatePicker value={watch("period_end")} onChange={(v) => setValue("period_end", v ?? "")} />
            {errors.period_end && <p className="text-sm text-destructive">{errors.period_end.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={currency} onValueChange={(v) => setValue("currency", v as InvoiceInput["currency"])}>
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
        </div>

        <div className="space-y-2">
          <Label>Tasks in this billing period</Label>
          <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border p-2">
            {loadingTasks && <p className="p-2 text-sm text-muted-foreground">Loading tasks...</p>}
            {!loadingTasks && tasks.length === 0 && (
              <p className="p-2 text-sm text-muted-foreground">No billable tasks found for this period.</p>
            )}
            {tasks.map((t) => (
              <label
                key={t.id}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <Checkbox checked={checkedIds.has(t.id)} onCheckedChange={() => toggleTask(t.id)} />
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{t.task_name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {t.date} · {formatDuration(t.duration_seconds)}
                      {t.project_name ? ` · ${t.project_name}` : ""}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs">{formatCurrency(t.amount, currency)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Optional notes shown to the client, e.g. payment instructions."
          />
        </div>

        <div className="space-y-1 rounded-md border p-3 text-sm">
          <div className="flex justify-between font-semibold">
            <span>Total payable</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
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
