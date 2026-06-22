import type { Json, Tables } from "@/types/database"

export type AuditLog = Tables<"audit_logs">

export interface FieldDiff {
  field: string
  old: unknown
  new: unknown
}

const IGNORED_FIELDS = new Set(["id", "user_id", "created_at", "updated_at"])

function isPlainObject(value: Json | null): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function diffFields(oldValues: Json | null, newValues: Json | null): FieldDiff[] {
  const oldObj = isPlainObject(oldValues) ? oldValues : {}
  const newObj = isPlainObject(newValues) ? newValues : {}
  const keys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

  const diffs: FieldDiff[] = []
  for (const key of keys) {
    if (IGNORED_FIELDS.has(key)) continue
    const oldVal = oldObj[key] ?? null
    const newVal = newObj[key] ?? null
    if (JSON.stringify(oldVal) !== JSON.stringify(newVal)) {
      diffs.push({ field: key, old: oldVal, new: newVal })
    }
  }
  return diffs
}
