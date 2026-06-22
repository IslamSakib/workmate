import { useState } from "react"
import { FormDialog } from "@/components/shared/FormDialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface RejectTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskName: string
  onConfirm: (reason: string) => void
}

export function RejectTaskDialog({ open, onOpenChange, taskName, onConfirm }: RejectTaskDialogProps) {
  const [reason, setReason] = useState("")

  return (
    <FormDialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next)
        if (!next) setReason("")
      }}
      title="Reject timesheet?"
      description={`Tell ${taskName ? `the assignee why "${taskName}"` : "the assignee why this task"} is being sent back.`}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="rejection_reason">Reason</Label>
          <Textarea
            id="rejection_reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duration looks off, please double-check the start/end time."
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm(reason)
              setReason("")
            }}
          >
            Reject
          </Button>
        </div>
      </div>
    </FormDialog>
  )
}
