import type { CurrencyCode } from "@/types/database"

export interface PublicProposal {
  project_name: string
  description: string | null
  amount: number
  currency: CurrencyCode
  status: string
  valid_until: string | null
  accepted_at: string | null
  client_name: string | null
}
