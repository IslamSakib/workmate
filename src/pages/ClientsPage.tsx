import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { DataTable } from "@/components/shared/DataTable"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { createClient, deleteClient, inviteClientToPortal, listClients, updateClient } from "@/features/clients/api"
import { ClientFormDialog } from "@/features/clients/components/ClientFormDialog"
import { InviteClientPortalDialog } from "@/features/clients/components/InviteClientPortalDialog"
import { getClientColumns } from "@/features/clients/components/columns"
import type { Client } from "@/features/clients/types"
import type { ClientInput } from "@/features/clients/schema"
import { hasMinRole } from "@/lib/permissions"
import { useAuthStore } from "@/store/authStore"

export default function ClientsPage() {
  const role = useAuthStore((s) => s.role)
  const readOnly = !hasMinRole(role, "manager")
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [deleting, setDeleting] = useState<Client | null>(null)
  const [invitingPortal, setInvitingPortal] = useState<Client | null>(null)
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
      setClients(await listClients())
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load clients")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [])

  const handleSubmit = async (values: ClientInput) => {
    if (editing) {
      await updateClient(editing.id, values)
      toast.success("Client updated")
    } else {
      await createClient(values)
      toast.success("Client created")
    }
    setEditing(null)
    load()
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteClient(deleting.id)
      toast.success("Client deleted")
      setDeleting(null)
      load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete client")
    }
  }

  const columns = getClientColumns({
    onEdit: (client) => {
      setEditing(client)
      setFormOpen(true)
    },
    onDelete: (client) => setDeleting(client),
    onInvitePortal: (client) => setInvitingPortal(client),
    readOnly,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage your client relationships.</p>
        </div>
        {!readOnly && (
          <Button
            onClick={() => {
              setEditing(null)
              setFormOpen(true)
            }}
          >
            <Plus className="size-4" />
            New Client
          </Button>
        )}
      </div>

      {loading ? (
        <Skeleton className="h-64" />
      ) : (
        <DataTable
          columns={columns}
          data={clients}
          searchKey="client_name"
          searchPlaceholder="Search clients..."
          emptyMessage="No clients yet. Add your first client to get started."
        />
      )}

      <ClientFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditing(null)
        }}
        client={editing}
        onSubmit={handleSubmit}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete client?"
        description={`This will permanently delete ${deleting?.client_name}. Related projects and tasks will keep their data but lose the client link.`}
        onConfirm={handleDelete}
      />

      <InviteClientPortalDialog
        open={!!invitingPortal}
        onOpenChange={(open) => !open && setInvitingPortal(null)}
        client={invitingPortal}
        onSubmit={async (email) => {
          if (!invitingPortal) return
          await inviteClientToPortal(invitingPortal.id, email)
          toast.success("Portal invite sent")
        }}
      />
    </div>
  )
}
