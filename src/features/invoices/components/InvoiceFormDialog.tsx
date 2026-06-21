import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import { FormDialog } from "@/components/shared/FormDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CURRENCIES, formatCurrency } from "@/lib/currency"
import { useClientsList } from "@/hooks/useClientsList"
import { useProjectsList } from "@/hooks/useProjectsList"
import { invoiceSchema, type InvoiceInput } from "../schema"
import type { Invoice, InvoiceItem } from "../types"

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "sent", label: "Sent" },
  { value: "paid", label: "Paid" },
  { value: "overdue", label: "Overdue" },
]

interface InvoiceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  invoice?: Invoice | null
  items?: InvoiceItem[]
  onSubmit: (values: InvoiceInput) => Promise<void>
}

function nextInvoiceNumber() {
  return `INV-${Date.now().toString().slice(-6)}`
}

export function InvoiceFormDialog({ open, onOpenChange, invoice, items, onSubmit }: InvoiceFormDialogProps) {
  const clients = useClientsList()
  const projects = useProjectsList()
  const {
    register,
    control,
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
      tax: 0,
      discount: 0,
      items: [{ description: "", quantity: 1, rate: 0 }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "items" })

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
              tax: invoice.tax,
              discount: invoice.discount,
              notes: invoice.notes ?? "",
              items: items && items.length > 0
                ? items.map((i) => ({ description: i.description, quantity: i.quantity, rate: i.rate }))
                : [{ description: "", quantity: 1, rate: 0 }],
            }
          : {
              invoice_number: nextInvoiceNumber(),
              currency: "USD",
              status: "draft",
              issue_date: new Date().toISOString().slice(0, 10),
              tax: 0,
              discount: 0,
              items: [{ description: "", quantity: 1, rate: 0 }],
            },
      )
    }
  }, [open, invoice, items, reset])

  const watchedItems = watch("items")
  const tax = watch("tax") || 0
  const discount = watch("discount") || 0
  const currency = watch("currency")
  const subtotal = (watchedItems ?? []).reduce((acc, item) => acc + (item.quantity || 0) * (item.rate || 0), 0)
  const total = subtotal + Number(tax) - Number(discount)

  const submit = async (values: InvoiceInput) => {
    try {
      await onSubmit(values)
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
      description="Line items, taxes, and discounts auto-calculate the total."
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
          <div className="flex items-center justify-between">
            <Label>Line items</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: "", quantity: 1, rate: 0 })}
            >
              <Plus className="size-4" />
              Add item
            </Button>
          </div>
          {errors.items?.message && <p className="text-sm text-destructive">{errors.items.message}</p>}
          <div className="space-y-2">
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  {index === 0 && <Label className="text-xs text-muted-foreground">Description</Label>}
                  <Input {...register(`items.${index}.description`)} placeholder="Description" />
                </div>
                <div className="w-20 space-y-1">
                  {index === 0 && <Label className="text-xs text-muted-foreground">Qty</Label>}
                  <Input type="number" step="0.01" {...register(`items.${index}.quantity`)} />
                </div>
                <div className="w-28 space-y-1">
                  {index === 0 && <Label className="text-xs text-muted-foreground">Rate</Label>}
                  <Input type="number" step="0.01" {...register(`items.${index}.rate`)} />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => fields.length > 1 && remove(index)}
                  disabled={fields.length === 1}
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tax">Tax</Label>
            <Input id="tax" type="number" step="0.01" {...register("tax")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="discount">Discount</Label>
            <Input id="discount" type="number" step="0.01" {...register("discount")} />
          </div>
        </div>

        <div className="space-y-1 rounded-md border p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatCurrency(total, currency)}</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea id="notes" rows={2} {...register("notes")} />
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
