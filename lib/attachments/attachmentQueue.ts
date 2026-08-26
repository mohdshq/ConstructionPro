import { AttachmentQueue, AttachmentErrorHandler } from '@powersync/react-native';
import { powersync } from '@/lib/powersync/system';
import { ExpoFileSystemLocalStorageAdapter } from './localStorage';
import { SupabaseRemoteStorageAdapter } from './remoteStorage';
import { createWatchAttachments } from './watchAttachments';

export const attachmentLocalStorage = new ExpoFileSystemLocalStorageAdapter();
export const attachmentRemoteStorage = new SupabaseRemoteStorageAdapter();

export function isPermanentNotFoundError(error: unknown): boolean {
  if (!error) return false;
  const msg = (typeof error === 'string' ? error : (error as any).message || '').toLowerCase();
  const status = (error as any).status || (error as any).statusCode;
  return (
    status === 404 ||
    msg.includes('not found') ||
    msg.includes('not_found') ||
    msg.includes('404') ||
    msg.includes('resource was not found') ||
    msg.includes('object not found')
  );
}

import { captureWarning } from '@/lib/sentryLogger';

export const attachmentErrorHandler: AttachmentErrorHandler = {
  async onUploadError(attachment, error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    captureWarning('AttachmentQueue', `[AttachmentQueue] Upload error for ${attachment.filename}: ${errorMsg}`, { filename: attachment.filename });
    return true; // Always retry upload on transient/network error
  },
  async onDownloadError(attachment, error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    captureWarning('AttachmentQueue', `[AttachmentQueue] Download error for ${attachment.filename}: ${errorMsg}`, { filename: attachment.filename });
    if (isPermanentNotFoundError(error)) {
      captureWarning('AttachmentQueue', `[AttachmentQueue] Permanent 404 for ${attachment.filename} — stopping retry.`, { filename: attachment.filename });
      return false; // Stop retrying non-existent remote object
    }
    return true; // Retry transient/network errors
  },
  async onDeleteError(attachment, error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    captureWarning('AttachmentQueue', `[AttachmentQueue] Delete error for ${attachment.filename}: ${errorMsg}`, { filename: attachment.filename });
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
    const errorMsg = error instanceof Error ? error.message : String(error);
    captureWarning('AttachmentQueue', `[AttachmentQueue] Safe delete failed for ref ${ref}: ${errorMsg}`, { ref });
    return false;
  }
}

