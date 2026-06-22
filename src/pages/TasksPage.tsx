import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { RejectTaskDialog } from "@/features/tasks/components/RejectTaskDialog"
import {
  approveTask,
  createTask,
  deleteTask,
  duplicateTask,
  listTasks,
  rejectTask,
  submitTask,
  updateTask,
} from "@/features/tasks/api"
import { TaskFormDialog } from "@/features/tasks/components/TaskFormDialog"
import { getTaskColumns } from "@/features/tasks/components/columns"
import type { TaskWithRelations } from "@/features/tasks/types"
import type { TaskInput } from "@/features/tasks/schema"
import { hasMinRole } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"

export default function TasksPage() {
  const role = useAuthStore((s) => s.role)
  const canApprove = hasMinRole(role, "manager")
  const [tasks, setTasks] = useState<TaskWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<TaskWithRelations | null>(null)
  const [deleting, setDeleting] = useState<TaskWithRelations | null>(null)
  const [bulkDeleting, setBulkDeleting] = useState<TaskWithRelations[] | null>(null)
  const [rejecting, setRejecting] = useState<TaskWithRelations | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setEditing(null)
      setFormOpen(true)
      setSearchParams((prev) => {
        prev.delete("new")
        return prev
      })
    }
  }, [searchParams, setSearchParams])

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

  const handleBulkDelete = async () => {
    if (!bulkDeleting) return
    try {
      await Promise.all(bulkDeleting.map((task) => deleteTask(task.id)))
      toast.success(`${bulkDeleting.length} task(s) deleted`)
      setBulkDeleting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete tasks")
    }
  }

  const handleSubmitForApproval = async (task: TaskWithRelations) => {
    try {
      await submitTask(task.id)
      toast.success("Submitted for approval")
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to submit task")
    }
  }

  const handleApprove = async (task: TaskWithRelations) => {
    try {
      await approveTask(task.id)
      toast.success("Task approved")
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to approve task")
    }
  }

  const handleReject = async (reason: string) => {
    if (!rejecting) return
    try {
      await rejectTask(rejecting.id, reason)
      toast.success("Task rejected")
      setRejecting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to reject task")
    }
  }

  const columns = getTaskColumns({
    onEdit: (task) => {
      setEditing(task)
      setFormOpen(true)
    },
    onDelete: (task) => setDeleting(task),
    onDuplicate: handleDuplicate,
    onSubmit: handleSubmitForApproval,
    onApprove: handleApprove,
    onReject: (task) => setRejecting(task),
    canApprove,
    enableSelection: true,
  })

  return (
    <div className="space-y-4">
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
          enableRowSelection
          renderBulkActions={(selected, clearSelection) => (
            <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/50 px-3 py-2">
              <span className="text-sm font-medium">{selected.length} selected</span>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={clearSelection}>
                  <X className="size-4" />
                  Clear
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setBulkDeleting(selected)}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </div>
          )}
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

      <ConfirmDialog
        open={!!bulkDeleting}
        onOpenChange={(open) => !open && setBulkDeleting(null)}
        title={`Delete ${bulkDeleting?.length ?? 0} task(s)?`}
        description="This will permanently delete the selected tasks."
        onConfirm={handleBulkDelete}
      />

      <RejectTaskDialog
        open={!!rejecting}
        onOpenChange={(open) => !open && setRejecting(null)}
        taskName={rejecting?.task_name ?? ""}
        onConfirm={handleReject}
      />
    </div>
  )
}
