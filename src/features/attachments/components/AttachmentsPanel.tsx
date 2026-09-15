import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { Paperclip, Trash2, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/shared/ConfirmDialog"
import { deleteAttachment, getAttachmentUrl, listAttachments, uploadAttachment } from "../api"
import type { Attachment, AttachmentOwnerType } from "../types"

interface AttachmentsPanelProps {
  ownerType: AttachmentOwnerType
  ownerId: string
}

export function AttachmentsPanel({ ownerType, ownerId }: AttachmentsPanelProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [deleting, setDeleting] = useState<Attachment | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let active = true
    listAttachments(ownerType, ownerId)
      .then((rows) => active && setAttachments(rows))
      .catch((error) => toast.error(error instanceof Error ? error.message : "Failed to load attachments"))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [ownerType, ownerId])

  const handleUpload = async (file: File) => {
    setUploading(true)
    try {
      const attachment = await uploadAttachment(ownerType, ownerId, file)
      setAttachments((prev) => [attachment, ...prev])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload file")
    } finally {
      setUploading(false)
    }
  }

  const handleOpen = async (attachment: Attachment) => {
    try {
      const url = await getAttachmentUrl(attachment.file_path)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to open file")
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteAttachment(deleting)
      setAttachments((prev) => prev.filter((a) => a.id !== deleting.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete file")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div className="space-y-1.5 rounded-md border p-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">Attachments</p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 text-xs"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="size-3.5" />
          {uploading ? "Uploading..." : "Upload"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ""
            if (file) handleUpload(file)
          }}
        />
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
      {!loading && attachments.length === 0 && (
        <p className="text-sm text-muted-foreground">No files attached yet.</p>
      )}
      {attachments.map((a) => (
        <div key={a.id} className="flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            onClick={() => handleOpen(a)}
            className="flex min-w-0 items-center gap-1.5 truncate text-left hover:underline"
          >
            <Paperclip className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">{a.file_name}</span>
          </button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-6 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => setDeleting(a)}
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      ))}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Delete this file?"
        description={deleting ? `"${deleting.file_name}" will be permanently removed.` : ""}
        onConfirm={handleDelete}
      />
    </div>
  )
}
