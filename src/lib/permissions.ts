import type { TeamRole } from "@/types/database"

const RANK: Record<TeamRole, number> = { employee: 1, manager: 2, admin: 3 }

/** null role = Owner, always passes. Mirrors the SQL has_min_role() function. */
export function hasMinRole(role: TeamRole | null, min: TeamRole): boolean {
  if (role === null) return true
  return RANK[role] >= RANK[min]
}
