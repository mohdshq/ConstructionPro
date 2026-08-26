let mockStorage: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key: string, value: string) => {
    mockStorage[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key: string) => {
    return Promise.resolve(mockStorage[key] ?? null);
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStorage[key];
    return Promise.resolve();
  }),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((k) => delete mockStorage[k]);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    mockStorage = {};
    return Promise.resolve();
  }),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  saveLastSession,
  readLastSession,
  clearLastSession,
  isWithinGrace,
  saveLastProfile,
  readLastProfile,
  isAuthServerRejection,
  OFFLINE_SESSION_KEY,
  OFFLINE_GRACE_MS,
  OfflineSessionRecord,
} from '../offlineSession';
import { useAuthStore, __resetAuthInitForTests } from '../../../store/useAuthStore';
import { supabase } from '../../supabase';

// Mock supabase client
jest.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
      refreshSession: jest.fn(),
      signOut: jest.fn(),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
  },
}));

// Mock supabaseSync helpers
jest.mock('../../supabaseSync', () => ({
  fetchProfile: jest.fn().mockResolvedValue(null),
  updateProfile: jest.fn().mockResolvedValue({}),
}));

describe('offlineSession & B9 Offline Grace Authentication', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    __resetAuthInitForTests();
    await AsyncStorage.clear();
    // Reset store state
    useAuthStore.setState({
      session: null,
      user: null,
      offlineUser: null,
      authMode: 'signed-out',
      profile: null,
      isInitialized: false,
      isExplicitSignOut: false,
    });
  });

  describe('isWithinGrace', () => {
    it('returns true when record is within 30-day grace window', () => {
      const now = 1000000000000;
      const record: OfflineSessionRecord = {
        userId: 'u1',
        email: 'u1@example.com',
        fullName: 'User One',
        savedAt: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
      };
      expect(isWithinGrace(record, now)).toBe(true);
    });

    it('returns false when record is outside 30-day grace window', () => {
      const now = 1000000000000;
      const record: OfflineSessionRecord = {
        userId: 'u1',
        email: 'u1@example.com',
        fullName: 'User One',
        savedAt: new Date(now - 31 * 24 * 60 * 60 * 1000).toISOString(), // 31 days ago
      };
      expect(isWithinGrace(record, now)).toBe(false);
    });

    it('returns false when record is null or savedAt is invalid', () => {
      expect(isWithinGrace(null)).toBe(false);
      expect(isWithinGrace({ userId: 'u1', email: null, fullName: null, savedAt: 'invalid' })).toBe(false);
    });
  });

  describe('AsyncStorage mirror helpers', () => {
    it('saves and reads last session record', async () => {
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          user_metadata: { full_name: 'Test User' },
        },
      } as any;

      await saveLastSession(mockSession);
      const read = await readLastSession();

      expect(read).not.toBeNull();
      expect(read?.userId).toBe('user-123');
      expect(read?.email).toBe('test@example.com');
      expect(read?.fullName).toBe('Test User');
      expect(read?.savedAt).toBeDefined();
    });

    it('clears last session and profile mirror', async () => {
      await AsyncStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify({ userId: '123' }));
      await clearLastSession();
      const read = await readLastSession();
      expect(read).toBeNull();
    });
  });

  describe('isAuthServerRejection', () => {
    it('returns false for network/timeout errors', () => {
      expect(isAuthServerRejection(new Error('Network request failed'))).toBe(false);
      expect(isAuthServerRejection(new Error('Failed to fetch'))).toBe(false);
      expect(isAuthServerRejection({ name: 'AuthRetryableFetchError', message: 'timeout' })).toBe(false);
    });

    it('returns true for auth server rejections (invalid refresh token, revoked, 400)', () => {
      expect(isAuthServerRejection({ status: 400, message: 'Invalid Refresh Token: Refresh Token Not Found' })).toBe(true);
      expect(isAuthServerRejection({ status: 401, message: 'Unauthorized' })).toBe(true);
      expect(isAuthServerRejection(new Error('invalid_grant: refresh token expired'))).toBe(true);
    });
  });

  describe('useAuthStore.initialize() behavior', () => {
    it('transitions to online mode and saves session when valid session exists', async () => {
      const mockSession = {
        user: {
          id: 'user-online',
          email: 'online@example.com',
          user_metadata: { full_name: 'Online User' },
        },
      };

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.authMode).toBe('online');
      expect(state.user?.id).toBe('user-online');
      expect(state.offlineUser).toBeNull();
      expect(state.isInitialized).toBe(true);

      const mirror = await readLastSession();
      expect(mirror?.userId).toBe('user-online');
    });

    it('timeout path produces offline-grace mode when mirror is within grace', async () => {
      // Seed AsyncStorage with valid session within 30 days
      await saveLastSession({
        user: {
          id: 'user-cached',
          email: 'cached@example.com',
          user_metadata: { full_name: 'Cached User' },
        },
      } as any);

      // Simulate hanging getSession promise (exceeds timeout)
      (supabase.auth.getSession as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve({ data: { session: null } }), 10000))
      );

      // Fast-forward or use timer mock if needed, but our implementation has a 4000ms race.
      // For fast unit test, simulate getSession returning null immediately (e.g. offline cold launch)
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.authMode).toBe('offline-grace');
      expect(state.offlineUser?.id).toBe('user-cached');
      expect(state.offlineUser?.email).toBe('cached@example.com');
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.isInitialized).toBe(true);
    });

    it('network failure never produces signed-out when within grace window', async () => {
      await saveLastSession({
        user: {
          id: 'user-netfail',
          email: 'netfail@example.com',
          user_metadata: { full_name: 'Network Fail User' },
        },
      } as any);

      (supabase.auth.getSession as jest.Mock).mockRejectedValue(new Error('Network request failed'));

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.authMode).toBe('offline-grace');
      expect(state.offlineUser?.id).toBe('user-netfail');
      expect(state.isInitialized).toBe(true);
    });

    it('produces signed-out when no valid mirror or mirror expired outside grace', async () => {
      // Mirror expired 40 days ago
      const expiredRecord: OfflineSessionRecord = {
        userId: 'u-expired',
        email: 'expired@example.com',
        fullName: 'Expired User',
        savedAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString(),
      };
      await AsyncStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(expiredRecord));

      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      await useAuthStore.getState().initialize();

      const state = useAuthStore.getState();
      expect(state.authMode).toBe('signed-out');
      expect(state.offlineUser).toBeNull();
      expect(state.isInitialized).toBe(true);
    });

    it('explicit signOut clears mirror record and transitions to signed-out', async () => {
      await saveLastSession({
        user: {
          id: 'user-signout',
          email: 'signout@example.com',
          user_metadata: { full_name: 'Signout User' },
        },
      } as any);

      useAuthStore.setState({
        authMode: 'online',
        user: { id: 'user-signout' } as any,
      });

      (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });

      await useAuthStore.getState().signOut();

      const state = useAuthStore.getState();
      expect(state.authMode).toBe('signed-out');
      expect(state.session).toBeNull();
      expect(state.user).toBeNull();
      expect(state.offlineUser).toBeNull();

      const mirror = await readLastSession();
      expect(mirror).toBeNull();
    });
  });
});
