import { z } from "zod"

export const taskSchema = z
  .object({
    task_name: z.string().min(1, "Task name is required"),
    project_id: z.string().nullable().optional(),
    client_id: z.string().nullable().optional(),
    date: z.string().min(1, "Date is required"),
    start_time: z.string().min(1, "Start time is required"),
    end_time: z.string().min(1, "End time is required"),
    duration_seconds: z.coerce.number().min(0, "Duration must be 0 or more"),
    billable: z.boolean(),
    notes: z.string().optional(),
  })
  .refine((data) => data.end_time > data.start_time, {
    message: "End time must be after start time",
    path: ["end_time"],
  })

export type TaskInput = z.infer<typeof taskSchema>
