import { resolveMediaUri } from '@/lib/attachments/resolveMediaUri';

jest.mock('@/lib/attachments/resolveMediaUri', () => ({
  resolveMediaUri: jest.fn(),
}));

describe('ProjectImage & resolveMediaUri forwarding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('forwards projectId to resolveMediaUri for project cover photo resolution', async () => {
    const photoUri = 'project_cover_1780307021264_u6ky3c.jpg';
    const projectId = '0516d9f7-342e-4305-8df8-525a6212998a';
    (resolveMediaUri as jest.Mock).mockResolvedValue(
      `https://supabase.co/signed/report-photos/${projectId}/${photoUri}`
    );

    // Simulate ProjectImage's fetchUrl execution
    const resolved = await resolveMediaUri(photoUri, {
      bucket: 'report-photos',
      projectId,
    });

    expect(resolveMediaUri).toHaveBeenCalledWith(photoUri, {
      bucket: 'report-photos',
      projectId: '0516d9f7-342e-4305-8df8-525a6212998a',
    });
    expect(resolved).toBe(`https://supabase.co/signed/report-photos/${projectId}/${photoUri}`);
  });

  it('handles missing photoUri gracefully without calling resolveMediaUri', async () => {
    const emptyUri: string = '';
    if (emptyUri && emptyUri.trim() !== '') {
      await resolveMediaUri(emptyUri, { bucket: 'report-photos', projectId: 'proj-1' });
    }
    expect(resolveMediaUri).not.toHaveBeenCalled();
  });
});
