import { resolveRemoteStoragePath } from '../remoteStorage';
import { AttachmentRecord, AttachmentState } from '@powersync/react-native';

describe('Cross-Device Storage Path Parity', () => {
  it('constructs byte-identical remote storage paths from saveFile metaData and watchAttachments json_object', () => {
    const testUserId = 'user-abc-123';
    const testProjectId = 'proj-xyz-789';
    const filename = 'e9c8e227-7f88-4c12-9c3f-859a1e0b5c11.jpg';

    // 1. Project Cover
    const coverWatchMeta = { kind: 'project_cover', userId: testUserId, projectId: testProjectId };
    const coverSaveMeta = { kind: 'project_cover', userId: testUserId, projectId: testProjectId };

    const coverWatchRecord: AttachmentRecord = {
      id: 'e9c8e227-7f88-4c12-9c3f-859a1e0b5c11',
      filename,
      metaData: JSON.stringify(coverWatchMeta),
      state: AttachmentState.QUEUED_DOWNLOAD,
    };
    const coverSaveRecord: AttachmentRecord = {
      id: 'e9c8e227-7f88-4c12-9c3f-859a1e0b5c11',
      filename,
      metaData: JSON.stringify(coverSaveMeta),
      state: AttachmentState.QUEUED_UPLOAD,
    };

    const coverWatchPath = resolveRemoteStoragePath(coverWatchRecord);
    const coverSavePath = resolveRemoteStoragePath(coverSaveRecord);

    expect(coverWatchPath.bucket).toBe('report-photos');
    expect(coverWatchPath.storagePath).toBe(`${testProjectId}/${filename}`);
    expect(coverWatchPath).toEqual(coverSavePath);

    // 2. Drawing
    const drawFilename = 'drawing-uuid-456.pdf';
    const drawWatchMeta = { kind: 'drawing', userId: testUserId, projectId: testProjectId };
    const drawSaveMeta = { kind: 'drawing', userId: testUserId, projectId: testProjectId };

    const drawWatchRecord: AttachmentRecord = {
      id: 'drawing-uuid-456',
      filename: drawFilename,
      metaData: JSON.stringify(drawWatchMeta),
      state: AttachmentState.QUEUED_DOWNLOAD,
    };
    const drawSaveRecord: AttachmentRecord = {
      id: 'drawing-uuid-456',
      filename: drawFilename,
      metaData: JSON.stringify(drawSaveMeta),
      state: AttachmentState.QUEUED_UPLOAD,
    };

    const drawWatchPath = resolveRemoteStoragePath(drawWatchRecord);
    const drawSavePath = resolveRemoteStoragePath(drawSaveRecord);

    expect(drawWatchPath.bucket).toBe('drawings');
    expect(drawWatchPath.storagePath).toBe(`${testProjectId}/${drawFilename}`);
    expect(drawWatchPath).toEqual(drawSavePath);

    // 3. Report Photo
    const repPhotoWatchMeta = { kind: 'report_photo', userId: testUserId, projectId: testProjectId };
    const repPhotoSaveMeta = { kind: 'report_photo', userId: testUserId, projectId: testProjectId };

    const repWatchRecord: AttachmentRecord = {
      id: 'e9c8e227-7f88-4c12-9c3f-859a1e0b5c11',
      filename,
      metaData: JSON.stringify(repPhotoWatchMeta),
      state: AttachmentState.QUEUED_DOWNLOAD,
    };
    const repSaveRecord: AttachmentRecord = {
      id: 'e9c8e227-7f88-4c12-9c3f-859a1e0b5c11',
      filename,
      metaData: JSON.stringify(repPhotoSaveMeta),
      state: AttachmentState.QUEUED_UPLOAD,
    };

    const repWatchPath = resolveRemoteStoragePath(repWatchRecord);
    const repSavePath = resolveRemoteStoragePath(repSaveRecord);

    expect(repWatchPath.bucket).toBe('report-photos');
    expect(repWatchPath.storagePath).toBe(`${testProjectId}/${filename}`);
    expect(repWatchPath).toEqual(repSavePath);

    // 4. Avatar
    const avatarFilename = 'avatar-uuid-789.jpg';
    const avatarWatchMeta = { kind: 'avatar', userId: testUserId };
    const avatarSaveMeta = { kind: 'avatar', userId: testUserId };

    const avatarWatchRecord: AttachmentRecord = {
      id: 'avatar-uuid-789',
      filename: avatarFilename,
      metaData: JSON.stringify(avatarWatchMeta),
      state: AttachmentState.QUEUED_DOWNLOAD,
    };
    const avatarSaveRecord: AttachmentRecord = {
      id: 'avatar-uuid-789',
      filename: avatarFilename,
      metaData: JSON.stringify(avatarSaveMeta),
      state: AttachmentState.QUEUED_UPLOAD,
    };

    const avatarWatchPath = resolveRemoteStoragePath(avatarWatchRecord);
    const avatarSavePath = resolveRemoteStoragePath(avatarSaveRecord);

    expect(avatarWatchPath.bucket).toBe('avatars');
    expect(avatarWatchPath.storagePath).toBe(`${testUserId}/${avatarFilename}`);
    expect(avatarWatchPath).toEqual(avatarSavePath);
  });
});
