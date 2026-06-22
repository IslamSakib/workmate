import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { createProject, deleteProject, listProjects, updateProject } from "@/features/projects/api"
import { ProjectFormDialog } from "@/features/projects/components/ProjectFormDialog"
import { getProjectColumns } from "@/features/projects/components/columns"
import type { ProjectWithClient } from "@/features/projects/types"
import type { ProjectInput } from "@/features/projects/schema"
import { hasMinRole } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"

export default function ProjectsPage() {
  const role = useAuthStore((s) => s.role)
  const readOnly = !hasMinRole(role, "manager")
  const [projects, setProjects] = useState<ProjectWithClient[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ProjectWithClient | null>(null)
  const [deleting, setDeleting] = useState<ProjectWithClient | null>(null)
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
      setProjects(await listProjects())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load projects")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: ProjectInput) => {
    if (editing) {
      await updateProject(editing.id, values)
      toast.success("Project updated")
    } else {
      await createProject(values)
      toast.success("Project created")
    }
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteProject(deleting.id)
      toast.success("Project deleted")
      setDeleting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete project")
    }
  }

  const columns = getProjectColumns({
    onEdit: (project) => {
      setEditing(project)
      setFormOpen(true)
    },
    onDelete: (project) => setDeleting(project),
    readOnly,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">Track project status and billing.</p>
        </div>
        {!readOnly && (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            New Project
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <DataTable
          columns={columns}
          data={projects}
          searchKey="project_name"
          searchPlaceholder="Search projects..."
          emptyMessage="No projects yet. Add your first project to get started."
        />
      )}

      <ProjectFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        project={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete project?"
        description={`This will permanently delete ${deleting?.project_name}.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
