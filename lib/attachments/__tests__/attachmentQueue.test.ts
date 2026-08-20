import { attachmentErrorHandler, isPermanentNotFoundError } from '../attachmentQueue';
import { AttachmentRecord, AttachmentState } from '@powersync/react-native';

describe('AttachmentQueue Error Handler (onDownloadError)', () => {
  const mockRecord: AttachmentRecord = {
    id: 'test-att-123',
    filename: 'test-att-123.jpg',
    state: AttachmentState.QUEUED_DOWNLOAD,
  };

  it('detects permanent 404 / not found error shapes correctly', () => {
    expect(isPermanentNotFoundError({ status: 404, message: 'Object not found' })).toBe(true);
    expect(isPermanentNotFoundError({ statusCode: '404', message: 'The resource was not found' })).toBe(true);
    expect(isPermanentNotFoundError(new Error('Object not found in bucket'))).toBe(true);
    expect(isPermanentNotFoundError('404 Not Found')).toBe(true);

    // Transient errors
    expect(isPermanentNotFoundError({ status: 500, message: 'Internal server error' })).toBe(false);
    expect(isPermanentNotFoundError(new Error('Network request failed'))).toBe(false);
    expect(isPermanentNotFoundError(null)).toBe(false);
  });

  it('returns false on permanent 404 errors to halt infinite retry loops', async () => {
    const error404 = { status: 404, message: 'Object not found' };
    const shouldRetry = await attachmentErrorHandler.onDownloadError(mockRecord, error404);
    expect(shouldRetry).toBe(false);
  });

  it('returns true on transient/network errors to allow automatic retry on recovery', async () => {
    const networkError = new Error('Network request failed');
    const shouldRetry = await attachmentErrorHandler.onDownloadError(mockRecord, networkError);
    expect(shouldRetry).toBe(true);
  });
});
