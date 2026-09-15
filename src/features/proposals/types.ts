import type { Tables } from "@/types/database"

export type Proposal = Tables<"proposals">
export type ProposalWithClient = Proposal & { clients: { client_name: string } | null }
