import { useEffect, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { createTask, deleteTask, duplicateTask, listTasks, updateTask } from "@/features/tasks/api"
import { TaskFormDialog } from "@/features/tasks/components/TaskFormDialog"
import { getTaskColumns } from "@/features/tasks/components/columns"
import type { TaskWithRelations } from "@/features/tasks/types"
import type { TaskInput } from "@/features/tasks/schema"

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TaskWithRelations | null>(null)
  const [deleting, setDeleting] = useState<TaskWithRelations | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      setTasks(await listTasks())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load tasks")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: TaskInput) => {
    if (editing) {
      await updateTask(editing.id, values)
      toast.success("Task updated")
    } else {
      await createTask(values)
      toast.success("Task created")
    }
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteTask(deleting.id)
      toast.success("Task deleted")
      setDeleting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete task")
    }
  }

  const handleDuplicate = async (task: TaskWithRelations) => {
    try {
      await duplicateTask(task)
      toast.success("Task duplicated")
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to duplicate task")
    }
  }

  const columns = getTaskColumns({
    onEdit: (task) => {
      setEditing(task)
      setFormOpen(true)
    },
    onDelete: (task) => setDeleting(task),
    onDuplicate: handleDuplicate,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tasks</h1>
          <p className="text-sm text-muted-foreground">Log and manage time entries.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          New Task
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <DataTable
          columns={columns}
          data={tasks}
          searchKey="task_name"
          searchPlaceholder="Search tasks..."
          emptyMessage="No tasks yet. Log your first task to get started."
        />
      )}

      <TaskFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        task={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete task?"
        description={`This will permanently delete "${deleting?.task_name}".`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
