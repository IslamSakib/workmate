import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import {
  createRetainer,
  deleteRetainer,
  getRetainerUsage,
  listRetainers,
  updateRetainer,
} from "@/features/retainers/api"
import { RetainerFormDialog } from "@/features/retainers/components/RetainerFormDialog"
import { getRetainerColumns } from "@/features/retainers/components/columns"
import type { RetainerUsage, RetainerWithClient } from "@/features/retainers/types"
import type { RetainerInput } from "@/features/retainers/schema"

export default function RetainersPage() {
  const [retainers, setRetainers] = useState<RetainerWithClient[]>([])
  const [usage, setUsage] = useState<Map<string, RetainerUsage>>(new Map())
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<RetainerWithClient | null>(null)
  const [deleting, setDeleting] = useState<RetainerWithClient | null>(null)
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
      const rows = await listRetainers()
      setRetainers(rows)
      setUsage(await getRetainerUsage(rows))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load retainers")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: RetainerInput) => {
    if (editing) {
      await updateRetainer(editing.id, values)
      toast.success("Retainer updated")
    } else {
      await createRetainer(values)
      toast.success("Retainer created")
    }
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteRetainer(deleting.id)
      toast.success("Retainer deleted")
      setDeleting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete retainer")
    }
  }

  const columns = getRetainerColumns({
    onEdit: (retainer) => {
      setEditing(retainer)
      setFormOpen(true)
    },
    onDelete: (retainer) => setDeleting(retainer),
    usage,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Retainers</h1>
          <p className="text-sm text-muted-foreground">Manage recurring monthly client retainers.</p>
        </div>
        <Button
          onClick={() => {
            setEditing(null)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          New Retainer
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <DataTable
          columns={columns}
          data={retainers}
          searchKey="client"
          searchPlaceholder="Search retainers..."
          emptyMessage="No retainers yet. Add your first retainer to track recurring billing."
        />
      )}

      <RetainerFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        retainer={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete retainer?"
        description={`This will permanently delete the retainer for ${deleting?.clients?.client_name ?? "this client"}.`}
        onConfirm={handleDelete}
      />
    </div>
  )
}
