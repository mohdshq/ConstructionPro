import { AppStateStatus } from 'react-native';
import { handleAppStateAuthRefresh, AutoRefreshClient } from '../appStateAutoRefresh';

describe('handleAppStateAuthRefresh (B10)', () => {
  let mockAuthClient: jest.Mocked<AutoRefreshClient>;

  beforeEach(() => {
    mockAuthClient = {
      startAutoRefresh: jest.fn(),
      stopAutoRefresh: jest.fn(),
    };
  });

  describe('when transition to active', () => {
    it('calls startAutoRefresh() when authMode is online', () => {
      handleAppStateAuthRefresh('active', 'online', mockAuthClient);

      expect(mockAuthClient.startAutoRefresh).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.stopAutoRefresh).not.toHaveBeenCalled();
    });

    it('calls startAutoRefresh() when authMode is offline-grace', () => {
      handleAppStateAuthRefresh('active', 'offline-grace', mockAuthClient);

      expect(mockAuthClient.startAutoRefresh).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.stopAutoRefresh).not.toHaveBeenCalled();
    });

    it('calls stopAutoRefresh() and does NOT call startAutoRefresh() when authMode is signed-out', () => {
      handleAppStateAuthRefresh('active', 'signed-out', mockAuthClient);

      expect(mockAuthClient.stopAutoRefresh).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.startAutoRefresh).not.toHaveBeenCalled();
    });
  });

  describe('when transition to background / inactive / non-active states', () => {
    it('calls stopAutoRefresh() when next state is background', () => {
      handleAppStateAuthRefresh('background', 'online', mockAuthClient);

      expect(mockAuthClient.stopAutoRefresh).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.startAutoRefresh).not.toHaveBeenCalled();
    });

    it('calls stopAutoRefresh() when next state is inactive', () => {
      handleAppStateAuthRefresh('inactive', 'online', mockAuthClient);

      expect(mockAuthClient.stopAutoRefresh).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.startAutoRefresh).not.toHaveBeenCalled();
    });

    it('treats any non-active state (such as unknown) as background and calls stopAutoRefresh()', () => {
      handleAppStateAuthRefresh('unknown' as AppStateStatus, 'online', mockAuthClient);

      expect(mockAuthClient.stopAutoRefresh).toHaveBeenCalledTimes(1);
      expect(mockAuthClient.startAutoRefresh).not.toHaveBeenCalled();
    });
  });
});
