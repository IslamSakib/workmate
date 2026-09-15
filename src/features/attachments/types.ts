import type { Tables } from "@/types/database"

export type Attachment = Tables<"attachments">
export type AttachmentOwnerType = "invoice" | "project" | "client" | "task"
