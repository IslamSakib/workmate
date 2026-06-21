import { useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm, type Resolver } from "react-hook-form"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { DatePicker } from "@/components/shared/DatePicker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useClientsList } from "@/hooks/useClientsList"
import { useProjectsList } from "@/hooks/useProjectsList"
import { taskSchema, type TaskInput } from "../schema"
import type { Task } from "../types"

interface TaskFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  task?: Task | null
  onSubmit: (values: TaskInput) => Promise<void>
}

function diffSeconds(start?: string | null, end?: string | null) {
  if (!start || !end) return null
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const seconds = (eh * 60 + em - (sh * 60 + sm)) * 60
  return seconds > 0 ? seconds : null
}

export function TaskFormDialog({ open, onOpenChange, task, onSubmit }: TaskFormDialogProps) {
  const clients = useClientsList()
  const projects = useProjectsList()
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TaskInput>({
    resolver: zodResolver(taskSchema) as Resolver<TaskInput>,
    defaultValues: {
      date: new Date().toISOString().slice(0, 10),
      start_time: "",
      end_time: "",
      billable: true,
      duration_seconds: 0,
    },
  })

  const startTime = watch("start_time")
  const endTime = watch("end_time")
  const projectId = watch("project_id")

  useEffect(() => {
    if (open) {
      reset(
        task
          ? {
              task_name: task.task_name,
              project_id: task.project_id,
              client_id: task.client_id,
              date: task.date,
              start_time: task.start_time ?? "",
              end_time: task.end_time ?? "",
              duration_seconds: task.duration_seconds,
              billable: task.billable,
              notes: task.notes ?? "",
            }
          : {
              date: new Date().toISOString().slice(0, 10),
              start_time: "",
              end_time: "",
              billable: true,
              duration_seconds: 0,
            },
      )
    }
  }, [open, task, reset])

  const computedDuration = diffSeconds(startTime, endTime)

  useEffect(() => {
    if (computedDuration !== null) setValue("duration_seconds", computedDuration)
  }, [computedDuration, setValue])

  useEffect(() => {
    if (!projectId) return
    const project = projects.find((p) => p.id === projectId)
    if (project?.client_id) setValue("client_id", project.client_id)
  }, [projectId, projects, setValue])

  const submit = async (values: TaskInput) => {
    try {
      await onSubmit(values)
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save task")
    }
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={task ? "Edit Task" : "New Task"}
      description="Log time spent on a project task."
    >
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="task_name">Task name</Label>
          <Input id="task_name" {...register("task_name")} />
          {errors.task_name && <p className="text-sm text-destructive">{errors.task_name.message}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <Label>Date</Label>
            <DatePicker value={watch("date")} onChange={(v) => setValue("date", v ?? "")} />
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm text-muted-foreground">
              {computedDuration !== null
                ? `${Math.floor(computedDuration / 3600)}h ${Math.floor((computedDuration % 3600) / 60)}m`
                : "Set start and end time"}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="start_time">Start time</Label>
            <Input id="start_time" type="time" {...register("start_time")} />
            {errors.start_time && <p className="text-sm text-destructive">{errors.start_time.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="end_time">End time</Label>
            <Input id="end_time" type="time" {...register("end_time")} />
            {errors.end_time && <p className="text-sm text-destructive">{errors.end_time.message}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="billable"
            checked={watch("billable")}
            onCheckedChange={(v) => setValue("billable", v)}
          />
          <Label htmlFor="billable">Billable</Label>
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
