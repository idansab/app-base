import { supabase } from '@/api/base44Client';

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };

/** Returns an error message (Hebrew) or null. Mirrors the bucket limits enforced by Supabase. */
export function validateImageFile(file) {
  if (!file) return 'לא נבחר קובץ';
  if (!IMAGE_EXT[file.type]) return 'אפשר להעלות JPG, PNG, WEBP או GIF בלבד';
  if (file.size > MAX_IMAGE_BYTES) return 'התמונה גדולה מדי (מקסימום 5MB)';
  return null;
}

/** Uploads to the public place-images bucket and returns the public URL. Throws on failure. */
export async function uploadPlaceImage(file) {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  const path = `places/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${IMAGE_EXT[file.type]}`;
  const { error } = await supabase.storage.from('place-images').upload(path, file);
  if (error) throw error;
  return supabase.storage.from('place-images').getPublicUrl(path).data.publicUrl;
}
