import { resolveMediaUri, clearMediaUrlCache } from '../resolveMediaUri';
import { attachmentLocalStorage } from '../localStorage';
import * as supabaseSync from '@/lib/supabaseSync';

jest.mock('../localStorage', () => ({
  attachmentLocalStorage: {
    getLocalUri: jest.fn((filename) => `file:///data/user/0/com.app/files/attachments/${filename}`),
    fileExists: jest.fn(),
  },
}));

jest.mock('@/lib/supabaseSync', () => ({
  getSignedUrl: jest.fn(),
  getPublicUrl: jest.fn(),
}));

describe('resolveMediaUri', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearMediaUrlCache();
  });

  it('returns direct local and web URIs immediately without storage checks', async () => {
    const fileUri = 'file:///path/to/photo.jpg';
    const dataUri = 'data:image/jpeg;base64,12345';
    const httpUri = 'https://example.com/image.jpg';

    expect(await resolveMediaUri(fileUri)).toBe(fileUri);
    expect(await resolveMediaUri(dataUri)).toBe(dataUri);
    expect(await resolveMediaUri(httpUri)).toBe(httpUri);
    expect(attachmentLocalStorage.fileExists).not.toHaveBeenCalled();
  });

  it('returns local file URI when attachment exists on local disk (instant offline render)', async () => {
    const filename = 'att-uuid-123.jpg';
    (attachmentLocalStorage.fileExists as jest.Mock).mockResolvedValue(true);

    const result = await resolveMediaUri(filename, { bucket: 'report-photos' });

    expect(result).toBe(`file:///data/user/0/com.app/files/attachments/${filename}`);
    expect(supabaseSync.getSignedUrl).not.toHaveBeenCalled();
  });

  it('resolves remote signed URL when attachment is not on local disk', async () => {
    const filename = 'att-uuid-123.jpg';
    (attachmentLocalStorage.fileExists as jest.Mock).mockResolvedValue(false);
    (supabaseSync.getSignedUrl as jest.Mock).mockResolvedValue({
      ok: true,
      url: 'https://supabase.co/signed/att-uuid-123.jpg',
    });

    const result = await resolveMediaUri(filename, { bucket: 'drawings', projectId: 'proj-1' });

    expect(result).toBe('https://supabase.co/signed/att-uuid-123.jpg');
    expect(supabaseSync.getSignedUrl).toHaveBeenCalledWith('drawings', 'proj-1/att-uuid-123.jpg', 3600);
  });

  it('uses in-memory TTL cache to avoid duplicate network calls', async () => {
    const filename = 'att-uuid-cached.jpg';
    (attachmentLocalStorage.fileExists as jest.Mock).mockResolvedValue(false);
    (supabaseSync.getSignedUrl as jest.Mock).mockResolvedValue({
      ok: true,
      url: 'https://supabase.co/signed/att-uuid-cached.jpg',
    });

    // First resolution
    const first = await resolveMediaUri(filename, { bucket: 'report-photos', projectId: 'proj-1' });
    expect(first).toBe('https://supabase.co/signed/att-uuid-cached.jpg');
    expect(supabaseSync.getSignedUrl).toHaveBeenCalledTimes(1);

    // Second resolution should hit in-memory cache
    const second = await resolveMediaUri(filename, { bucket: 'report-photos', projectId: 'proj-1' });
    expect(second).toBe('https://supabase.co/signed/att-uuid-cached.jpg');
    expect(supabaseSync.getSignedUrl).toHaveBeenCalledTimes(1);
  });

  it('resolves legacy storage paths via getSignedUrl / getPublicUrl', async () => {
    (supabaseSync.getSignedUrl as jest.Mock).mockResolvedValue({
      ok: true,
      url: 'https://supabase.co/signed/legacy.jpg',
    });
    (supabaseSync.getPublicUrl as jest.Mock).mockReturnValue('https://supabase.co/public/avatar.jpg');

    const legacyReport = await resolveMediaUri('user-1/proj-1/cover.jpg', { bucket: 'report-photos' });
    expect(legacyReport).toBe('https://supabase.co/signed/legacy.jpg');
    expect(supabaseSync.getSignedUrl).toHaveBeenCalledWith('report-photos', 'user-1/proj-1/cover.jpg', 3600);

    const legacyAvatar = await resolveMediaUri('user-1/avatar.jpg', { bucket: 'avatars' });
    expect(legacyAvatar).toBe('https://supabase.co/public/avatar.jpg');
    expect(supabaseSync.getPublicUrl).toHaveBeenCalledWith('avatars', 'user-1/avatar.jpg');
  });

  describe('Avatar Resolution with userId guard', () => {
    it('resolves avatar attachment ref when userId is provided', async () => {
      const filename = 'avatar-uuid-123.jpg';
      (attachmentLocalStorage.fileExists as jest.Mock).mockResolvedValue(false);
      (supabaseSync.getPublicUrl as jest.Mock).mockReturnValue('https://supabase.co/public/avatars/user-999/avatar-uuid-123.jpg');

      const result = await resolveMediaUri(filename, { bucket: 'avatars', userId: 'user-999' });
      expect(result).toBe('https://supabase.co/public/avatars/user-999/avatar-uuid-123.jpg');
      expect(supabaseSync.getPublicUrl).toHaveBeenCalledWith('avatars', 'user-999/avatar-uuid-123.jpg');
    });

    it('returns null (unresolvable) when userId is missing for avatar attachment ref to prevent 404 bad URLs', async () => {
      const filename = 'avatar-uuid-123.jpg';
      (attachmentLocalStorage.fileExists as jest.Mock).mockResolvedValue(false);

      const result = await resolveMediaUri(filename, { bucket: 'avatars' });
      expect(result).toBeNull();
      expect(supabaseSync.getPublicUrl).not.toHaveBeenCalled();
    });
  });
});
