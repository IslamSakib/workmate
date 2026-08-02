import { Copy, Mail } from "lucide-react"
import { toast } from "sonner"
import { FormDialog } from "@/components/shared/FormDialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface InviteFallbackDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  email: string
  subject: string
  message: string
}

/** Shown when the automated invite email can't be sent (Edge Function not deployed, sender not verified with the email provider, etc). Copying works everywhere — opening a local email app is offered as an extra option, not the default, since not everyone has one configured. */
export function InviteFallbackDialog({ open, onOpenChange, email, subject, message }: InviteFallbackDialogProps) {
  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message)
      toast.success("Copied — paste it into any email, chat, or text to send it")
    } catch {
      toast.error("Couldn't copy to clipboard")
    }
  }

  const openEmailApp = () => {
    const link = document.createElement("a")
    link.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Send this invite yourself"
      description={`We couldn't send this automatically. Copy the message below and send it to ${email} however you like — email, WhatsApp, Slack, anything.`}
    >
      <div className="space-y-4">
        <Textarea readOnly value={message} className="min-h-40 resize-none text-sm" onFocus={(e) => e.target.select()} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={openEmailApp}>
            <Mail className="size-4" />
            Open in email app
          </Button>
          <Button type="button" onClick={copyMessage}>
            <Copy className="size-4" />
            Copy message
          </Button>
        </div>
      </div>
    </FormDialog>
  )
}
