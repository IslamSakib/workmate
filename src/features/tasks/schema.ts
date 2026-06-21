import { z } from "zod"

export const taskSchema = z.object({
  task_name: z.string().min(1, "Task name is required"),
  project_id: z.string().nullable().optional(),
  client_id: z.string().nullable().optional(),
  date: z.string().min(1, "Date is required"),
  start_time: z.string().nullable().optional(),
  end_time: z.string().nullable().optional(),
  duration_minutes: z.coerce.number().min(0, "Duration must be 0 or more"),
  billable: z.boolean(),
  notes: z.string().optional(),
})

export type TaskInput = z.infer<typeof taskSchema>
