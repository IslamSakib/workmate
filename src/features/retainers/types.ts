import type { Tables } from "@/types/database"

export type Retainer = Tables<"retainers">
export type RetainerWithClient = Retainer & { clients: { client_name: string } | null }

export interface RetainerUsage {
  used_hours: number
  included_hours: number
  remaining_hours: number
  overage_hours: number
  overage_amount: number
}
