import { useEffect, useMemo, useState } from "react"
import { addDays, format } from "date-fns"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CURRENCIES, formatCurrency } from "@/lib/currency"
import { formatDuration } from "@/lib/duration"
import { cn } from "@/lib/utils"
import { AttachmentsPanel } from "@/features/attachments/components/AttachmentsPanel"
import { useClientsList } from "@/hooks/useClientsList"
import { useProjectsList } from "@/hooks/useProjectsList"
import { listBillableTasks, listCreditableAdvances, type CreditableAdvance } from "../api"
import { invoiceSchema, type InvoiceInput } from "../schema"
import { FLAT_FEE_ITEM_ID, type BillableTask, type Invoice, type InvoiceItem } from "../types"

type Kind = NonNullable<InvoiceInput["kind"]>

const KINDS: { value: Kind; title: string; hint: string }[] = [
  { value: "standard", title: "Standard", hint: "Bill tracked work for a period. Untick any task you want to leave out." },
  { value: "advance", title: "Advance (deposit)", hint: "Ask for money before work starts. It is credited on the final invoice." },
  { value: "milestone", title: "Milestone", hint: "Any amount for a stage, for example 30% on delivery." },
]

const today = () => new Date().toISOString().slice(0, 10)

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: Invoice | null
  items?: InvoiceItem[]
  onSubmit: (values: InvoiceInput, items: BillableTask[]) => Promise<void>
}

export function InvoiceFormDialog({ open, onOpenChange, invoice, items, onSubmit }: Props) {
  const clients = useClientsList()
  const projects = useProjectsList()
  const [kind, setKind] = useState<Kind>("standard")
  const [tasks, setTasks] = useState<BillableTask[]>([])
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())
  const [advances, setAdvances] = useState<CreditableAdvance[]>([])
  const [creditIds, setCreditIds] = useState<Set<string>>(new Set())
  const [loadingTasks, setLoadingTasks] = useState(false)
  // Amount-based invoices (advance / milestone)
  const [amountMode, setAmountMode] = useState<"percent" | "fixed">("percent")
  const [percent, setPercent] = useState("50")
  const [fixedAmount, setFixedAmount] = useState("")
  const [lineText, setLineText] = useState("")

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<InvoiceInput>({
    resolver: zodResolver(invoiceSchema) as Resolver<InvoiceInput>,
    defaultValues: { currency: "BDT", status: "draft", issue_date: today(), period_start: today(), period_end: today() },
  })

  useEffect(() => {
    if (!open) return
    const amountItem = (items ?? []).find((i) => i.kind === "amount")
    setKind((invoice?.kind as Kind | undefined) ?? "standard")
    setAmountMode(amountItem ? "fixed" : "percent")
    setPercent("50")
    setFixedAmount(amountItem ? String(amountItem.amount) : "")
    setLineText(amountItem?.task_name ?? "")
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
            period_start: invoice.period_start ?? today(),
            period_end: invoice.period_end ?? today(),
            scheduled_date: invoice.scheduled_date,
            notes: invoice.notes,
          }
        : {
            currency: "BDT",
            status: "draft",
            issue_date: today(),
            due_date: format(addDays(new Date(), 7), "yyyy-MM-dd"),
            period_start: today(),
            period_end: today(),
          },
    )
    setTasks([])
    const taskIds = new Set((items ?? []).filter((i) => i.task_id).map((i) => i.task_id as string))
    if ((items ?? []).some((i) => i.kind === "flat_fee")) taskIds.add(FLAT_FEE_ITEM_ID)
    setCheckedIds(taskIds)
    setCreditIds(new Set((items ?? []).filter((i) => i.credit_invoice_id).map((i) => i.credit_invoice_id as string)))
  }, [open, invoice, items, reset])

  const clientId = watch("client_id")
  const projectId = watch("project_id")
  const periodStart = watch("period_start")
  const periodEnd = watch("period_end")
  const currency = watch("currency")
  const status = watch("status")
  const project = useMemo(() => projects.find((p) => p.id === projectId), [projects, projectId])
  const editing = !!invoice
  const isAmountKind = kind !== "standard"

  // Tasks for a standard invoice
  useEffect(() => {
    if (!open || isAmountKind || !periodStart || !periodEnd) return
    let active = true
    setLoadingTasks(true)
    listBillableTasks({ clientId, projectId, periodStart, periodEnd, excludeInvoiceId: invoice?.id })
      .then((fetched) => {
        if (!active) return
        setTasks(fetched)
        setCheckedIds((prev) => {
          const ids = new Set(fetched.map((t) => t.id))
          const next = new Set([...prev].filter((id) => ids.has(id)))
          for (const t of fetched) if (!prev.has(t.id) && !invoice) next.add(t.id)
          return next
        })
      })
      .catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load tasks"))
      .finally(() => active && setLoadingTasks(false))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAmountKind, clientId, projectId, periodStart, periodEnd, invoice?.id])

  // Paid advances that can be deducted on a standard invoice
  useEffect(() => {
    if (!open || isAmountKind) return
    let active = true
    listCreditableAdvances({ projectId, clientId, currency, excludeInvoiceId: invoice?.id })
      .then((rows) => {
        if (!active) return
        setAdvances(rows)
        // Pre-select credits on a new invoice so a paid deposit is never forgotten.
        if (!invoice) setCreditIds(new Set(rows.map((r) => r.id)))
        else setCreditIds((prev) => new Set([...prev].filter((id) => rows.some((r) => r.id === id))))
      })
      .catch(() => active && setAdvances([]))
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isAmountKind, projectId, clientId, currency, invoice?.id])

  const price = Number(project?.fixed_price ?? 0)
  const amountValue = amountMode === "percent" ? (price * Number(percent || 0)) / 100 : Number(fixedAmount || 0)
  const defaultLine =
    kind === "advance"
      ? `Advance payment${amountMode === "percent" && percent ? `, ${percent}% of ` : " for "}${project?.project_name ?? "project"}`
      : `Milestone payment${project ? `: ${project.project_name}` : ""}`

  const lines: BillableTask[] = isAmountKind
    ? amountValue > 0
      ? [
          {
            id: "amount",
            kind: "amount",
            task_name: lineText || defaultLine,
            date: watch("issue_date") || today(),
            duration_seconds: 0,
            rate: 0,
            amount: Math.round(amountValue * 100) / 100,
            project_name: project?.project_name ?? null,
          },
        ]
      : []
    : [
        ...tasks.filter((t) => checkedIds.has(t.id)),
        ...advances
          .filter((a) => creditIds.has(a.id))
          .map(
            (a): BillableTask => ({
              id: `credit-${a.id}`,
              kind: "advance_credit",
              credit_invoice_id: a.id,
              task_name: `Less: advance received (${a.invoice_number})`,
              date: today(),
              duration_seconds: 0,
              rate: 0,
              amount: -a.amount_paid,
              project_name: null,
            }),
          ),
      ]
  const total = lines.reduce((acc, l) => acc + l.amount, 0)

  const pickProject = (id: string) => {
    if (id === "none") return setValue("project_id", null)
    setValue("project_id", id)
    const p = projects.find((x) => x.id === id)
    if (!p) return
    if (p.client_id) setValue("client_id", p.client_id)
    setValue("currency", p.currency as InvoiceInput["currency"])
  }

  const toggle = (set: Set<string>, id: string, update: (s: Set<string>) => void) => {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    update(next)
  }

  const submit = async (values: InvoiceInput) => {
    if (lines.length === 0) {
      toast.error(isAmountKind ? "Enter an amount greater than 0" : "Select at least one task to bill")
      return
    }
    if (total < 0) {
      toast.error("The advance credit is larger than the work billed. Untick a credit.")
      return
    }
    try {
      await onSubmit(
        {
          ...values,
          kind,
          invoice_number: values.invoice_number || undefined,
          period_start: isAmountKind ? values.issue_date : values.period_start,
          period_end: isAmountKind ? values.issue_date : values.period_end,
        },
        lines,
      )
      onOpenChange(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save invoice")
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={editing ? `Edit ${invoice?.invoice_number}` : "New invoice"}
      description={KINDS.find((k) => k.value === kind)?.hint ?? ""}
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-5">
        {!editing && (
          <div role="radiogroup" aria-label="Invoice type" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                role="radio"
                aria-checked={kind === k.value}
                onClick={() => setKind(k.value)}
                className={cn(
                  "rounded-lg border p-3 text-left",
                  kind === k.value ? "border-2 border-primary bg-accent p-[11px]" : "hover:bg-muted",
                )}
              >
                <span className="block text-sm font-semibold">{k.title}</span>
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Client</Label>
            <Select value={clientId ?? "none"} onValueChange={(v) => setValue("client_id", v === "none" ? null : v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
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
            <Select value={projectId ?? "none"} onValueChange={pickProject}>
              <SelectTrigger className="w-full">
                <SelectValue />
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
          <div className="space-y-2">
            <Label>Create as</Label>
            <Select value={status} onValueChange={(v) => setValue("status", v as InvoiceInput["status"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="sent">Sent (ready to be paid)</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                {["partial", "paid", "overdue"].includes(status) && <SelectItem value={status}>{status}</SelectItem>}
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
          {status === "scheduled" && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Send on</Label>
              <DatePicker value={watch("scheduled_date")} onChange={(v) => setValue("scheduled_date", v)} />
            </div>
          )}
          {editing && (
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="invoice_number">Invoice number</Label>
              <Input id="invoice_number" {...register("invoice_number")} />
              {errors.invoice_number && <p className="text-sm text-destructive">{errors.invoice_number.message}</p>}
            </div>
          )}
        </div>

        {isAmountKind ? (
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="inline-flex overflow-hidden rounded-md border">
                {(
                  [
                    ["percent", "Percent of project price"],
                    ["fixed", "Fixed amount"],
                  ] as const
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setAmountMode(m)}
                    className={cn("px-3 py-1.5 text-sm", amountMode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            {amountMode === "percent" ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="percent">Percent</Label>
                  <Input id="percent" type="number" min="0" max="100" inputMode="decimal" value={percent} onChange={(e) => setPercent(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Amount</Label>
                  <div className="flex h-9 items-center rounded-md bg-muted px-3 tabular-nums">{formatCurrency(amountValue, currency)}</div>
                </div>
                {!price && (
                  <p className="col-span-2 text-sm text-warning">
                    Pick a fixed-price project to use a percentage, or switch to a fixed amount.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                <Label htmlFor="fixed">Amount ({currency})</Label>
                <Input id="fixed" type="number" step="0.01" min="0" inputMode="decimal" value={fixedAmount} onChange={(e) => setFixedAmount(e.target.value)} />
              </div>
            )}
            <div className="space-y-1">
              <Label htmlFor="line">Line text on the invoice</Label>
              <Input id="line" value={lineText} placeholder={defaultLine} onChange={(e) => setLineText(e.target.value)} />
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Billing period start</Label>
                <DatePicker value={periodStart} onChange={(v) => setValue("period_start", v ?? "")} />
              </div>
              <div className="space-y-2">
                <Label>Billing period end</Label>
                <DatePicker value={periodEnd} onChange={(v) => setValue("period_end", v ?? "")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tasks in this billing period</Label>
              <div
                className={`max-h-64 min-h-24 space-y-1 overflow-y-auto rounded-md border p-2 transition-opacity ${loadingTasks ? "opacity-60" : ""}`}
              >
                {loadingTasks && tasks.length === 0 && <p className="p-2 text-sm text-muted-foreground">Loading tasks</p>}
                {!loadingTasks && tasks.length === 0 && (
                  <p className="p-2 text-sm text-muted-foreground">No billable tasks found for this period.</p>
                )}
                {tasks.map((t) => (
                  <label key={t.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                    <span className="flex min-w-0 items-center gap-2">
                      <Checkbox checked={checkedIds.has(t.id)} onCheckedChange={() => toggle(checkedIds, t.id, setCheckedIds)} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{t.task_name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {t.isFlatFee ? "One-time flat fee" : `${t.date} · ${formatDuration(t.duration_seconds)}${t.project_name ? ` · ${t.project_name}` : ""}`}
                        </span>
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-xs">{formatCurrency(t.amount, currency)}</span>
                  </label>
                ))}
              </div>
            </div>

            {advances.length > 0 && (
              <div className="space-y-2">
                <Label>Advance payments already received</Label>
                <div className="space-y-1 rounded-md border p-2">
                  {advances.map((a) => (
                    <label key={a.id} className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-accent">
                      <span className="flex items-center gap-2">
                        <Checkbox checked={creditIds.has(a.id)} onCheckedChange={() => toggle(creditIds, a.id, setCreditIds)} />
                        <span>
                          Less: {a.kind === "advance" ? "advance" : "milestone"} {a.invoice_number}
                        </span>
                      </span>
                      <span className="shrink-0 font-mono text-xs">-{formatCurrency(a.amount_paid, currency)}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={2} {...register("notes")} placeholder="Shown on the invoice, e.g. payment instructions." />
        </div>

        <div className="flex items-center justify-between rounded-md bg-accent px-3 py-2.5 font-semibold text-accent-foreground">
          <span>Total payable</span>
          <span className="tabular-nums">{formatCurrency(total, currency)}</span>
        </div>

        {invoice && <AttachmentsPanel ownerType="invoice" ownerId={invoice.id} />}

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
