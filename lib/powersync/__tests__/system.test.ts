const mockConnect = jest.fn();
const mockDisconnectAndClear = jest.fn();

jest.mock('@powersync/react-native', () => ({
  PowerSyncDatabase: jest.fn().mockImplementation(() => ({
    connect: mockConnect,
    disconnectAndClear: mockDisconnectAndClear,
  })),
}));

jest.mock('@powersync/op-sqlite', () => ({
  OPSqliteOpenFactory: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../Connector', () => ({
  Connector: jest.fn().mockImplementation(() => ({})),
}));

import { setupPowerSync, teardownPowerSync } from '../system';

describe('PowerSync system setup & lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('connects successfully and deduplicates multiple calls', async () => {
    mockConnect.mockResolvedValue(undefined);

    // Call setupPowerSync concurrently
    const [p1, p2] = await Promise.all([setupPowerSync(), setupPowerSync()]);

    expect(mockConnect).toHaveBeenCalledTimes(1);

    // Subsequent call when already connected does nothing
    await setupPowerSync();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('handles teardown and allows reconnecting after teardown', async () => {
    mockDisconnectAndClear.mockResolvedValue(undefined);
    mockConnect.mockResolvedValue(undefined);

    await teardownPowerSync();
    expect(mockDisconnectAndClear).toHaveBeenCalledTimes(1);

    // Reconnecting after teardown calls connect again
    await setupPowerSync();
    expect(mockConnect).toHaveBeenCalledTimes(1);
  });

  it('resets in-flight state and propagates error if connect fails', async () => {
    mockDisconnectAndClear.mockResolvedValue(undefined);
    await teardownPowerSync();
    mockConnect.mockClear();

    const connectError = new Error('Network timeout');
    mockConnect.mockRejectedValueOnce(connectError);

    await expect(setupPowerSync()).rejects.toThrow('Network timeout');

    // Subsequent call after failure should retry connect rather than being permanently stuck
    mockConnect.mockResolvedValueOnce(undefined);
    await expect(setupPowerSync()).resolves.toBeUndefined();
    expect(mockConnect).toHaveBeenCalledTimes(2);
  });
});
