import type { ClientPipelineStage } from "@/types/database"

export const PIPELINE_STAGES: { value: ClientPipelineStage; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "contacted", label: "Contacted" },
  { value: "proposal_sent", label: "Proposal Sent" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
]

export const PIPELINE_STAGE_LABEL: Record<ClientPipelineStage, string> = Object.fromEntries(
  PIPELINE_STAGES.map((s) => [s.value, s.label]),
) as Record<ClientPipelineStage, string>
