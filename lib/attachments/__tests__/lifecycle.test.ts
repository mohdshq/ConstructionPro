import {
  setupPowerSync,
  teardownPowerSync,
  clearPowerSyncForNewUser,
  getCombinedUploadQueueStats,
} from '@/lib/powersync/lifecycle';
import { attachmentQueue } from '@/lib/attachments/attachmentQueue';

jest.mock('@/lib/attachments/attachmentQueue', () => ({
  attachmentQueue: {
    startSync: jest.fn().mockResolvedValue(undefined),
    stopSync: jest.fn().mockResolvedValue(undefined),
    clearQueue: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('@/lib/attachments/cleanupStagedAttachments', () => ({
  cleanupStagedAttachments: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/powersync/Connector', () => ({
  Connector: jest.fn().mockImplementation(() => ({})),
}));

describe('PowerSync & Attachment Lifecycle', () => {
  let mockDb: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDb = {
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn().mockResolvedValue(undefined),
      disconnectAndClear: jest.fn().mockResolvedValue(undefined),
      getUploadQueueStats: jest.fn().mockResolvedValue({ count: 2, size: 1024 }),
      getOptional: jest.fn().mockResolvedValue({ count: 3 }),
      resolveTables: jest.fn().mockReturnValue(['projects', 'drawings', 'profiles', 'reports']),
      getAll: jest.fn().mockResolvedValue([]),
    };
  });

  describe('getCombinedUploadQueueStats', () => {
    it('combines CRUD transaction count with pending attachments (states 0 and 2)', async () => {
      const stats = await getCombinedUploadQueueStats(mockDb);

      expect(mockDb.getUploadQueueStats).toHaveBeenCalled();
      expect(mockDb.getOptional).toHaveBeenCalledWith(
        'SELECT count(*) as count FROM attachments WHERE state IN (0, 2)'
      );
      expect(stats.count).toBe(5); // 2 CRUD + 3 attachments
    });
  });

  describe('setupPowerSync & teardownPowerSync', () => {
    it('starts attachment queue on setup and stops sync without clearing queue on teardown', async () => {
      await setupPowerSync(mockDb);
      expect(attachmentQueue.startSync).toHaveBeenCalled();

      await teardownPowerSync(mockDb);

      expect(attachmentQueue.stopSync).toHaveBeenCalled();
      expect(attachmentQueue.clearQueue).not.toHaveBeenCalled();
      expect(mockDb.disconnect).toHaveBeenCalled();
    });
  });

  describe('clearPowerSyncForNewUser', () => {
    it('stops sync and clears attachment queue and database when no unsynced changes exist', async () => {
      mockDb.getUploadQueueStats.mockResolvedValue({ count: 0, size: 0 });
      mockDb.getOptional.mockResolvedValue({ count: 0 });
      const onConfirm = jest.fn();
      const onCancel = jest.fn();

      await clearPowerSyncForNewUser(mockDb, onConfirm, onCancel);

      expect(attachmentQueue.stopSync).toHaveBeenCalled();
      expect(attachmentQueue.clearQueue).toHaveBeenCalled();
      expect(mockDb.disconnectAndClear).toHaveBeenCalled();
      expect(onConfirm).toHaveBeenCalled();
    });
  });
});
