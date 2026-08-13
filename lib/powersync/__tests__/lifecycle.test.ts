const mockConnect = jest.fn();
const mockDisconnectAndClear = jest.fn();

jest.mock('../Connector', () => ({
  Connector: jest.fn().mockImplementation(() => ({})),
}));

import { setupPowerSync, teardownPowerSync } from '../lifecycle';
import { AbstractPowerSyncDatabase } from '@powersync/react-native';

const mockPowerSync = {
  connect: mockConnect,
  disconnectAndClear: mockDisconnectAndClear,
} as unknown as AbstractPowerSyncDatabase;

describe('PowerSync lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  it('handles teardown and allows reconnecting after teardown', async () => {
    mockDisconnectAndClear.mockResolvedValue(undefined);
    mockConnect.mockResolvedValue(undefined);

    await teardownPowerSync(mockPowerSync);
    expect(mockDisconnectAndClear).toHaveBeenCalledTimes(1);

    // Reconnecting after teardown calls connect again
    await setupPowerSync(mockPowerSync);
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('resets in-flight state and propagates error if connect fails', async () => {
    mockDisconnectAndClear.mockResolvedValue(undefined);
    await teardownPowerSync(mockPowerSync);
    mockConnect.mockClear();

    const connectError = new Error('Network timeout');
    mockConnect.mockRejectedValueOnce(connectError);

    await expect(setupPowerSync(mockPowerSync)).rejects.toThrow('Network timeout');

    // Subsequent call after failure should retry connect rather than being permanently stuck
    mockConnect.mockResolvedValueOnce(undefined);
    await expect(setupPowerSync(mockPowerSync)).resolves.toBeUndefined();
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });
});
