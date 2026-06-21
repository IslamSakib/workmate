import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"
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
import { CURRENCIES } from "@/lib/currency"
import { useClientsList } from "@/hooks/useClientsList"
import { projectSchema, type ProjectInput } from "../schema"
import type { Project } from "../types"

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
]

interface ProjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  project?: Project | null
  onSubmit: (values: ProjectInput) => Promise<void>
}

export function ProjectFormDialog({ open, onOpenChange, project, onSubmit }: ProjectFormDialogProps) {
  const clients = useClientsList()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ProjectInput>({
    resolver: zodResolver(projectSchema) as Resolver<ProjectInput>,
    defaultValues: { currency: "USD", status: "active" },
  })

  useEffect(() => {
    if (open) {
      reset(
        project
          ? {
              project_name: project.project_name,
              client_id: project.client_id,
              hourly_rate: project.hourly_rate,
              fixed_price: project.fixed_price,
              currency: project.currency,
              status: project.status,
              start_date: project.start_date,
              due_date: project.due_date,
              notes: project.notes ?? "",
            }
          : { currency: "USD", status: "active" },
      )
    }
  }, [open, project, reset])

  const submit = async (values: ProjectInput) => {
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save project")
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={project ? "Edit Project" : "New Project"}
      description="Project details and billing configuration."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="project_name">Project name</Label>
            <Input id="project_name" {...register("project_name")} />
            {errors.project_name && (
              <p className="text-sm text-destructive">{errors.project_name.message}</p>
            )}
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
            <Label>Status</Label>
            <Select value={watch("status")} onValueChange={(v) => setValue("status", v as ProjectInput["status"])}>
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
            <Label htmlFor="hourly_rate">Hourly rate</Label>
            <Input id="hourly_rate" type="number" step="0.01" {...register("hourly_rate")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fixed_price">Fixed price</Label>
            <Input id="fixed_price" type="number" step="0.01" {...register("fixed_price")} />
          </div>

          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={watch("currency")} onValueChange={(v) => setValue("currency", v as ProjectInput["currency"])}>
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
            <Label>Start date</Label>
            <DatePicker value={watch("start_date")} onChange={(v) => setValue("start_date", v)} />
          </div>
          <div className="space-y-2">
            <Label>Due date</Label>
            <DatePicker value={watch("due_date")} onChange={(v) => setValue("due_date", v)} />
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
