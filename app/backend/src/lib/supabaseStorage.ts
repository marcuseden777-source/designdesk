import { randomUUID } from "crypto";
import { supabaseAdmin } from "./supabase";

const BUCKET = "design-assets";

export async function uploadToSupabaseStorage(
  buffer: Buffer,
  mimeType: string,
  folder: "floor-plans" | "generated-designs"
): Promise<string> {
  const ext = mimeType.split("/")[1] ?? "jpg";
  const fileName = `${folder}/${randomUUID()}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Supabase Storage upload failed: ${error.message}`);
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(fileName);

  return publicUrl;
}

export function isSupabaseStorageConfigured(): boolean {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
