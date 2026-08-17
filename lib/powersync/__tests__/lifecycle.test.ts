const mockConnect = jest.fn();
const mockDisconnectAndClear = jest.fn();
const mockDisconnect = jest.fn();
const mockGetUploadQueueStats = jest.fn();

jest.mock('../Connector', () => ({
  Connector: jest.fn().mockImplementation(() => ({})),
}));

const mockAlert = jest.fn();
jest.mock('react-native', () => ({
  Alert: { alert: mockAlert },
}));

import { setupPowerSync, teardownPowerSync, clearPowerSyncForNewUser } from '../lifecycle';
import { AbstractPowerSyncDatabase } from '@powersync/react-native';

const mockPowerSync = {
  connect: mockConnect,
  disconnectAndClear: mockDisconnectAndClear,
  disconnect: mockDisconnect,
  getUploadQueueStats: mockGetUploadQueueStats,
} as unknown as AbstractPowerSyncDatabase;

describe('PowerSync lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlert.mockClear();
    mockGetUploadQueueStats.mockResolvedValue({ count: 0, size: 0 });
  });

  afterEach(async () => {
    // Reset module state by ensuring it is disconnected
    await teardownPowerSync(mockPowerSync);
    jest.restoreAllMocks();
  });

  it('connects successfully and deduplicates multiple calls', async () => {
    mockConnect.mockResolvedValue(undefined);

    // Call setupPowerSync concurrently
    const [p1, p2] = await Promise.all([setupPowerSync(mockPowerSync), setupPowerSync(mockPowerSync)]);

    expect(mockConnect).toHaveBeenCalledTimes(1);

    // Subsequent call when already connected does nothing
    await setupPowerSync(mockPowerSync);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('handles teardown by disconnecting (not clearing)', async () => {
    mockDisconnect.mockResolvedValue(undefined);
    mockConnect.mockResolvedValue(undefined);

    await setupPowerSync(mockPowerSync);
    expect(mockConnect).toHaveBeenCalledTimes(1);

    await teardownPowerSync(mockPowerSync);
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
    expect(mockDisconnectAndClear).not.toHaveBeenCalled();

    // Reconnecting after teardown calls connect again
    await setupPowerSync(mockPowerSync);
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  it('warns on teardown if there are pending offline changes', async () => {
    mockDisconnect.mockResolvedValue(undefined);
    mockConnect.mockResolvedValue(undefined);
    mockGetUploadQueueStats.mockResolvedValue({ count: 5, size: 1024 });

    await setupPowerSync(mockPowerSync);
    await teardownPowerSync(mockPowerSync);
    
    expect(mockAlert).toHaveBeenCalledWith(
      'Offline Changes Saved',
      expect.stringContaining('5 unsynced changes'),
      [{ text: 'OK' }]
    );
    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('resets in-flight state and propagates error if connect fails', async () => {
    mockDisconnect.mockResolvedValue(undefined);
    await teardownPowerSync(mockPowerSync); // ensures disconnected
    mockConnect.mockClear();

    const connectError = new Error('Network timeout');
    mockConnect.mockRejectedValueOnce(connectError);

    await expect(setupPowerSync(mockPowerSync)).rejects.toThrow('Network timeout');

    // Subsequent call after failure should retry connect rather than being permanently stuck
    mockConnect.mockResolvedValueOnce(undefined);
    await expect(setupPowerSync(mockPowerSync)).resolves.toBeUndefined();
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });

  describe('clearPowerSyncForNewUser', () => {
    it('clears immediately if queue is empty', async () => {
      mockGetUploadQueueStats.mockResolvedValue({ count: 0, size: 0 });
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      await clearPowerSyncForNewUser(mockPowerSync, onConfirm, onCancel);

      expect(mockAlert).not.toHaveBeenCalled();
      expect(mockDisconnectAndClear).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('prompts user if queue has pending items and handles confirm', async () => {
      mockGetUploadQueueStats.mockResolvedValue({ count: 3, size: 500 });
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      // Mock Alert.alert to simulate pressing "Delete and Sign In"
      mockAlert.mockImplementation((title: any, message: any, buttons: any) => {
        const confirmBtn = buttons.find((b: any) => b.style === 'destructive');
        confirmBtn.onPress();
      });

      await clearPowerSyncForNewUser(mockPowerSync, onConfirm, onCancel);

      expect(mockAlert).toHaveBeenCalledWith(
        'Warning: Unsynced Data',
        expect.stringContaining('3 unsynced changes'),
        expect.any(Array)
      );
      expect(mockDisconnectAndClear).toHaveBeenCalledTimes(1);
      expect(onConfirm).toHaveBeenCalledTimes(1);
      expect(onCancel).not.toHaveBeenCalled();
    });

    it('prompts user if queue has pending items and handles cancel', async () => {
      mockGetUploadQueueStats.mockResolvedValue({ count: 3, size: 500 });
      const onConfirm = jest.fn().mockResolvedValue(undefined);
      const onCancel = jest.fn();

      // Mock Alert.alert to simulate pressing "Cancel"
      mockAlert.mockImplementation((title: any, message: any, buttons: any) => {
        const cancelBtn = buttons.find((b: any) => b.style === 'cancel');
        cancelBtn.onPress();
      });

      await clearPowerSyncForNewUser(mockPowerSync, onConfirm, onCancel);

      expect(mockAlert).toHaveBeenCalled();
      expect(mockDisconnectAndClear).not.toHaveBeenCalled();
      expect(onConfirm).not.toHaveBeenCalled();
      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
