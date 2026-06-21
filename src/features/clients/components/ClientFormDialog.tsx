import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
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
import { CURRENCIES } from "@/lib/currency"
import { clientSchema, type ClientInput } from "../schema"
import type { Client } from "../types"

interface ClientFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  client?: Client | null
  onSubmit: (values: ClientInput) => Promise<void>
}

export function ClientFormDialog({ open, onOpenChange, client, onSubmit }: ClientFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: { currency: "USD" },
  })

  useEffect(() => {
    if (open) {
      reset(
        client
          ? {
              client_name: client.client_name,
              company_name: client.company_name ?? "",
              email: client.email ?? "",
              phone: client.phone ?? "",
              currency: client.currency,
              country: client.country ?? "",
              notes: client.notes ?? "",
            }
          : { currency: "USD" },
      )
    }
  }, [open, client, reset])

  const submit = async (values: ClientInput) => {
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save client")
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={client ? "Edit Client" : "New Client"}
      description="Client details used across projects and invoices."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="client_name">Client name</Label>
            <Input id="client_name" {...register("client_name")} />
            {errors.client_name && (
              <p className="text-sm text-destructive">{errors.client_name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="company_name">Company name</Label>
            <Input id="company_name" {...register("company_name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={watch("currency")} onValueChange={(v) => setValue("currency", v as ClientInput["currency"])}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select currency" />
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
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register("country")} />
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
