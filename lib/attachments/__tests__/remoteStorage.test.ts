import { SupabaseRemoteStorageAdapter } from '../remoteStorage';
import { AttachmentRecord, AttachmentState } from '@powersync/react-native';
import { supabase } from '@/lib/supabase';
import * as supabaseSync from '@/lib/supabaseSync';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    storage: {
      from: jest.fn(),
    },
  },
}));

jest.mock('@/lib/supabaseSync', () => ({
  getSignedUrl: jest.fn(),
  getPublicUrl: jest.fn(),
}));

describe('SupabaseRemoteStorageAdapter', () => {
  let adapter: SupabaseRemoteStorageAdapter;

  beforeEach(() => {
    jest.clearAllMocks();
    adapter = new SupabaseRemoteStorageAdapter();
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
    });
  });

  describe('deleteFile (Idempotency)', () => {
    it('treats 404 and not-found errors as success without throwing', async () => {
      const mockRemove = jest.fn().mockResolvedValue({
        error: { message: 'Object not found', status: 404 },
      });
      (supabase.storage.from as jest.Mock).mockReturnValue({
        remove: mockRemove,
      });

      const attachment: AttachmentRecord = {
        id: 'att-1',
        filename: 'att-1.jpg',
        metaData: JSON.stringify({ kind: 'project_cover', userId: 'user-1', projectId: 'proj-1' }),
        state: AttachmentState.QUEUED_DELETE,
      };

      // Should complete normally without throwing
      await expect(adapter.deleteFile(attachment)).resolves.toBeUndefined();
      expect(mockRemove).toHaveBeenCalledWith(['proj-1/att-1.jpg']);
    });
  });

  describe('uploadFile', () => {
    it('uploads binary to Supabase Storage with x-upsert: true and content-type', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
      });
      (global as any).fetch = mockFetch;

      const attachment: AttachmentRecord = {
        id: 'att-upload-1',
        filename: 'att-upload-1.jpg',
        mediaType: 'image/jpeg',
        metaData: JSON.stringify({ kind: 'report_photo', userId: 'user-1', projectId: 'proj-1' }),
        state: AttachmentState.QUEUED_UPLOAD,
      };

      const buffer = new ArrayBuffer(16);
      await adapter.uploadFile(buffer, attachment);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/storage/v1/object/report-photos/proj-1/att-upload-1.jpg'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
            'Content-Type': 'image/jpeg',
            'x-upsert': 'true',
          }),
          body: buffer,
        })
      );
    });
  });
});
