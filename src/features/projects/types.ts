import type { Tables } from "@/types/database"

export type Project = Tables<"projects">
export type ProjectWithClient = Project & { clients: { client_name: string } | null }
