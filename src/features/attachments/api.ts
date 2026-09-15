import { supabase } from "@/lib/supabaseClient"
import { useAuthStore } from "@/store/authStore"
import type { Attachment, AttachmentOwnerType } from "./types"

const BUCKET = "attachments"

export async function listAttachments(
  ownerType: AttachmentOwnerType,
  ownerId: string,
): Promise<Attachment[]> {
  const { data, error } = await supabase
    .from("attachments")
    .select("*")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .order("created_at", { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function uploadAttachment(
  ownerType: AttachmentOwnerType,
  ownerId: string,
  file: File,
): Promise<Attachment> {
  const accountId = useAuthStore.getState().accountId
  if (!accountId) throw new Error("Not authenticated")

  // Storage RLS policies scope by the first path segment being the owner's
  // user id (see 0001_init.sql), so every upload must live under it.
  const filePath = `${accountId}/${ownerType}/${ownerId}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(filePath, file)
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from("attachments")
    .insert({ user_id: accountId, owner_type: ownerType, owner_id: ownerId, file_path: filePath, file_name: file.name })
    .select()
    .single()
  if (error) {
    await supabase.storage.from(BUCKET).remove([filePath])
    throw error
  }
  return data
}

export async function deleteAttachment(attachment: Attachment): Promise<void> {
  const { error: storageError } = await supabase.storage.from(BUCKET).remove([attachment.file_path])
  if (storageError) throw storageError
  const { error } = await supabase.from("attachments").delete().eq("id", attachment.id)
  if (error) throw error
}

/** Attachments live in a private bucket — reading one back needs a short-lived signed URL. */
export async function getAttachmentUrl(filePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(filePath, 60 * 5)
  if (error) throw error
  return data.signedUrl
}
