import { z } from "zod"

/** Seconds from start to end. An end at or before the start means the next day (10 PM to 12 AM = 2h). Null if either is unset or they are equal. */
export function durationBetween(start?: string | null, end?: string | null): number | null {
  if (!start || !end) return null
  const [sh, sm] = start.split(":").map(Number)
  const [eh, em] = end.split(":").map(Number)
  const minutes = (eh * 60 + em - (sh * 60 + sm) + 1440) % 1440
  return minutes > 0 ? minutes * 60 : null
}

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
  .refine((data) => durationBetween(data.start_time, data.end_time) !== null, {
    message: "End time must be different from start time",
    path: ["end_time"],
  })

export type TaskInput = z.infer<typeof taskSchema>
