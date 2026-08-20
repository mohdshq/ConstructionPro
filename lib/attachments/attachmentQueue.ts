import { AttachmentQueue, AttachmentErrorHandler } from '@powersync/react-native';
import { powersync } from '@/lib/powersync/system';
import { ExpoFileSystemLocalStorageAdapter } from './localStorage';
import { SupabaseRemoteStorageAdapter } from './remoteStorage';
import { createWatchAttachments } from './watchAttachments';

export const attachmentLocalStorage = new ExpoFileSystemLocalStorageAdapter();
export const attachmentRemoteStorage = new SupabaseRemoteStorageAdapter();

export const attachmentErrorHandler: AttachmentErrorHandler = {
  async onUploadError(attachment, error) {
    console.warn(`[AttachmentQueue] Upload error for ${attachment.filename}:`, error);
    return true; // Always retry upload on transient/network error
  },
  async onDownloadError(attachment, error) {
    console.warn(`[AttachmentQueue] Download error for ${attachment.filename}:`, error);
    return true; // Unconditionally return true to prevent archive/restore churn loop
  },
  async onDeleteError(attachment, error) {
    console.warn(`[AttachmentQueue] Delete error for ${attachment.filename}:`, error);
    return true; // Retry delete
  },
};

export const attachmentQueue = new AttachmentQueue({
  db: powersync,
  localStorage: attachmentLocalStorage,
  remoteStorage: attachmentRemoteStorage,
  watchAttachments: createWatchAttachments(powersync),
  errorHandler: attachmentErrorHandler,
});

import { classifyMediaSource } from './resolveMediaUri';

/**
 * Safely deletes an attachment reference if it exists in the attachment queue.
 * - Filters out legacy paths, URIs, and non-attachment refs via classifyMediaSource.
 * - Confirms existence in AttachmentContext before deleting.
 * - Wrapped in try/catch to ensure cascade loops are never halted by a single failure.
 */
export async function safeDeleteAttachmentRef(ref?: string | null): Promise<boolean> {
  if (!ref || classifyMediaSource(ref) !== 'attachment_ref') {
    return false;
  }
  const id = ref.includes('.') ? ref.split('.')[0] : ref;
  try {
    const exists = await attachmentQueue.withAttachmentContext(async (ctx) => {
      try {
        const record = await ctx.getAttachment(id);
        return !!record;
      } catch {
        return false;
      }
    });

    if (exists) {
      await attachmentQueue.deleteFile({ id });
      return true;
    }
    return false;
  } catch (error) {
    console.warn(`[AttachmentQueue] Safe delete failed for ref ${ref}:`, error);
    return false;
  }
}

