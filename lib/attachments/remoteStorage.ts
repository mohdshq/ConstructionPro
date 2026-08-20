import { RemoteStorageAdapter, AttachmentRecord } from '@powersync/react-native';
import { supabase } from '@/lib/supabase';
import { getSignedUrl, getPublicUrl } from '@/lib/supabaseSync';
import { decode as decodeBase64 } from 'base64-arraybuffer';

export interface AttachmentMetadata {
  kind: 'project_cover' | 'drawing' | 'report_photo' | 'avatar';
  userId: string;
  projectId?: string;
}

export function parseAttachmentMetadata(metaDataStr?: string): AttachmentMetadata | null {
  if (!metaDataStr) return null;
  try {
    return JSON.parse(metaDataStr) as AttachmentMetadata;
  } catch {
    return null;
  }
}

export function resolveRemoteStoragePath(
  attachment: AttachmentRecord
): { bucket: 'avatars' | 'drawings' | 'report-photos'; storagePath: string } {
  const meta = parseAttachmentMetadata(attachment.metaData);
  const filename = attachment.filename;

  if (meta?.kind === 'avatar') {
    return {
      bucket: 'avatars',
      storagePath: `${meta.userId}/${filename}`,
    };
  }

  if (meta?.kind === 'drawing') {
    const projectFolder = meta.projectId || meta.userId;
    return {
      bucket: 'drawings',
      storagePath: `${projectFolder}/${filename}`,
    };
  }

  // project_cover or report_photo (or default)
  const projectFolder = meta?.projectId || meta?.userId || 'default';
  return {
    bucket: 'report-photos',
    storagePath: `${projectFolder}/${filename}`,
  };
}

export class SupabaseRemoteStorageAdapter implements RemoteStorageAdapter {
  async uploadFile(fileData: ArrayBuffer, attachment: AttachmentRecord): Promise<void> {
    const { bucket, storagePath } = resolveRemoteStoragePath(attachment);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

    const uploadUrl = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`;
    const contentType = attachment.mediaType || 'application/octet-stream';

    const response = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: fileData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 403 || response.status === 401) {
        console.warn(
          `[AttachmentQueue] HTTP ${response.status} Authorization failure uploading ${bucket}/${storagePath}. ` +
          `If this project was created offline, the attachment queue ran before the projects row reached Postgres. ` +
          `This will automatically resolve on the next sync tick once the project row syncs.`
        );
      }
      throw new Error(`Supabase upload failed (${response.status}): ${errorText}`);
    }

  }

  async downloadFile(attachment: AttachmentRecord): Promise<ArrayBuffer> {
    const { bucket, storagePath } = resolveRemoteStoragePath(attachment);
    let downloadUrl: string | null = null;

    if (bucket === 'avatars') {
      downloadUrl = getPublicUrl('avatars', storagePath);
    } else {
      const res = await getSignedUrl(bucket, storagePath, 3600);
      downloadUrl = res.ok ? res.url : null;
    }


    if (!downloadUrl) {
      throw new Error(`Failed to resolve download URL for ${bucket}/${storagePath}`);
    }

    const response = await fetch(downloadUrl);
    if (!response.ok) {
      throw new Error(`Supabase download failed (${response.status}): ${response.statusText}`);
    }

    try {
      return await response.arrayBuffer();
    } catch {
      // Fallback for React Native environments where Blob.arrayBuffer() is not polyfilled
      const blob = await response.blob();
      const b64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.includes(',') ? result.split(',')[1] : result);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      return decodeBase64(b64);
    }
  }

  async deleteFile(attachment: AttachmentRecord): Promise<void> {
    const { bucket, storagePath } = resolveRemoteStoragePath(attachment);
    try {
      const { error } = await supabase.storage.from(bucket).remove([storagePath]);
      if (error) {
        const msg = (error.message || '').toLowerCase();
        // IDEMPOTENT: 404 / not found / empty results are treated as SUCCESS
        if (msg.includes('not found') || msg.includes('404') || (error as any).status === 404) {
          return;
        }
        console.warn(`[SupabaseRemoteStorage] Delete warning for ${bucket}/${storagePath}:`, error.message);
      }
    } catch (e: any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('not found') || msg.includes('404') || e?.status === 404) {
        return;
      }
      console.warn(`[SupabaseRemoteStorage] Delete catch for ${bucket}/${storagePath}:`, e);
    }
  }
}
