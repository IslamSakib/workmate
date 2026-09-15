import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PIPELINE_STAGES } from "../pipeline"
import type { Client } from "../types"
import type { ClientPipelineStage } from "@/types/database"

interface ClientPipelineBoardProps {
  clients: Client[]
  onStageChange: (client: Client, stage: ClientPipelineStage) => void
  onOpen: (client: Client) => void
}

export function ClientPipelineBoard({ clients, onStageChange, onOpen }: ClientPipelineBoardProps) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {PIPELINE_STAGES.map((stage) => {
        const stageClients = clients.filter((c) => c.pipeline_stage === stage.value)
        return (
          <Card key={stage.value} className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-sm">
                {stage.label}
                <span className="text-xs font-normal text-muted-foreground">{stageClients.length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {stageClients.length === 0 && (
                <p className="text-xs text-muted-foreground">No clients here.</p>
              )}
              {stageClients.map((client) => (
                <div key={client.id} className="space-y-1.5 rounded-md border p-2 text-sm">
                  <button
                    type="button"
                    onClick={() => onOpen(client)}
                    className="block truncate text-left font-medium hover:underline"
                  >
                    {client.client_name}
                  </button>
                  {client.company_name && (
                    <p className="truncate text-xs text-muted-foreground">{client.company_name}</p>
                  )}
                  <Select
                    value={client.pipeline_stage}
                    onValueChange={(v) => onStageChange(client, v as ClientPipelineStage)}
                  >
                    <SelectTrigger className="h-7 w-full text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PIPELINE_STAGES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
