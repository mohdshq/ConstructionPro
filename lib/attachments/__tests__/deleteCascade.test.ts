import { safeDeleteAttachmentRef, attachmentQueue } from '../attachmentQueue';

describe('Attachment Cascade Deletion', () => {
  const deletedIds: string[] = [];

  beforeEach(() => {
    deletedIds.length = 0;

    // Mock withAttachmentContext and deleteFile on attachmentQueue
    jest.spyOn(attachmentQueue, 'withAttachmentContext').mockImplementation(async (callback: any) => {
      const mockContext = {
        getAttachment: jest.fn().mockImplementation(async (id: string) => {
          if (id === 'valid-att-1' || id === 'valid-att-2' || id === 'valid-cover') {
            return { id, filename: `${id}.jpg` };
          }
          return undefined;
        }),
      };
      return callback(mockContext);
    });

    jest.spyOn(attachmentQueue, 'deleteFile').mockImplementation(async ({ id }) => {
      if (id === 'failing-att') {
        throw new Error('Database error during deleteFile');
      }
      deletedIds.push(id);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('safely deletes valid attachment_refs and skips legacy paths, URIs, and missing records', async () => {
    const mediaList = [
      'valid-att-1.jpg',                // valid attachment_ref -> deleted
      'legacy/user/proj/photo.jpg',     // legacy storage path -> ignored
      'file:///local/cache/photo.jpg',  // direct local uri -> ignored
      'data:image/jpeg;base64,1234',     // data uri -> ignored
      'missing-att.jpg',                // attachment_ref not in db -> ignored
      'valid-att-2.png',                // valid attachment_ref -> deleted
      null,                             // null ref -> ignored
      '',                               // empty ref -> ignored
    ];

    for (const ref of mediaList) {
      await safeDeleteAttachmentRef(ref);
    }

    expect(deletedIds).toEqual(['valid-att-1', 'valid-att-2']);
  });

  it('handles deleteFile failures gracefully without aborting cascade iteration', async () => {
    // If one ref encounters an unexpected error, subsequent valid refs still delete
    jest.spyOn(attachmentQueue, 'withAttachmentContext').mockImplementation(async (callback: any) => {
      const mockContext = {
        getAttachment: jest.fn().mockResolvedValue({ id: 'any', filename: 'any.jpg' }),
      };
      return callback(mockContext);
    });

    const refs = ['valid-att-1.jpg', 'failing-att.jpg', 'valid-cover.jpg'];

    for (const ref of refs) {
      await safeDeleteAttachmentRef(ref);
    }

    expect(deletedIds).toContain('valid-att-1');
    expect(deletedIds).toContain('valid-cover');
  });
});
