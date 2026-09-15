import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { format } from "date-fns"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { formatCurrency } from "@/lib/currency"
import { acceptPublicProposal, getPublicProposal } from "@/features/public-proposal/api"
import type { PublicProposal } from "@/features/public-proposal/types"

export default function PublicProposalPage() {
  const { token } = useParams<{ token: string }>()
  const [proposal, setProposal] = useState<PublicProposal | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [name, setName] = useState("")
  const [accepting, setAccepting] = useState(false)

  const load = () => {
    if (!token) return
    getPublicProposal(token)
      .then((data) => (data ? setProposal(data) : setError(true)))
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }

  useEffect(load, [token])

  const handleAccept = async () => {
    if (!token || !name.trim()) {
      toast.error("Enter your name to accept")
      return
    }
    setAccepting(true)
    try {
      const success = await acceptPublicProposal(token, name.trim())
      if (success) {
        toast.success("Proposal accepted")
        load()
      } else {
        toast.error("This proposal can no longer be accepted")
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept proposal")
    } finally {
      setAccepting(false)
    }
  }

  const expired = proposal?.valid_until ? new Date(proposal.valid_until) < new Date() : false
  const canAccept = proposal?.status === "sent" && !expired

  return (
    <div className="min-h-svh bg-muted/40 px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="text-center text-xl font-semibold tracking-tight">WorkMate</div>

        {loading && <Skeleton className="h-96" />}

        {!loading && (error || !proposal) && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              This proposal link is invalid or has been removed.
            </CardContent>
          </Card>
        )}

        {!loading && proposal && (
          <Card>
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{proposal.project_name}</h1>
                  <p className="text-sm text-muted-foreground">Prepared for {proposal.client_name ?? "—"}</p>
                </div>
                <Badge
                  variant={proposal.status === "accepted" ? "default" : "outline"}
                  className="capitalize"
                >
                  {proposal.status}
                </Badge>
              </div>

              {proposal.description && (
                <p className="whitespace-pre-wrap text-sm">{proposal.description}</p>
              )}

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Price</p>
                  <p className="text-xl font-semibold">{formatCurrency(proposal.amount, proposal.currency)}</p>
                </div>
                {proposal.valid_until && (
                  <div>
                    <p className="text-muted-foreground">Valid until</p>
                    <p className="font-medium">{format(new Date(proposal.valid_until), "MMM d, yyyy")}</p>
                  </div>
                )}
              </div>

              {proposal.status === "accepted" && (
                <div className="rounded-md border bg-success/10 p-3 text-sm text-success">
                  Accepted{proposal.accepted_at ? ` on ${format(new Date(proposal.accepted_at), "MMM d, yyyy")}` : ""}.
                </div>
              )}

              {canAccept && (
                <div className="space-y-2 rounded-md border p-3">
                  <Label htmlFor="accept_name">Your name</Label>
                  <Input
                    id="accept_name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Type your name to accept"
                  />
                  <Button onClick={handleAccept} disabled={accepting} className="w-full">
                    {accepting ? "Accepting..." : "Accept Proposal"}
                  </Button>
                </div>
              )}

              {proposal.status === "sent" && expired && (
                <p className="text-sm text-muted-foreground">This proposal has expired.</p>
              )}
              {proposal.status === "declined" && (
                <p className="text-sm text-muted-foreground">This proposal was declined.</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
