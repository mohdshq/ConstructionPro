(global as any).__DEV__ = true;

import React from 'react';
import { render, act } from '@testing-library/react-native';
import RootLayout from '../_layout';
import { useAuthStore } from '../../store/useAuthStore';
import { useRouter, useSegments } from 'expo-router';

const mockReplace = jest.fn();
let currentSegments: string[] = ['(tabs)', 'projects'];

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace, push: jest.fn() }),
  useSegments: () => currentSegments,
  Stack: Object.assign(({ children }: any) => children ?? null, {
    Screen: () => null,
  }),
}));

jest.mock('../../hooks/use-color-scheme', () => ({
  useColorScheme: () => 'dark',
}));

jest.mock('../../components/OfflineBanner', () => ({
  OfflineBanner: () => null,
}));

jest.mock('../../components/OfflineGraceBanner', () => ({
  OfflineGraceBanner: () => null,
}));

jest.mock('../../lib/usePushNotifications', () => ({
  usePushNotifications: jest.fn(),
}));

jest.mock('../../lib/ai/useEnrichmentWorker', () => ({
  useEnrichmentWorker: jest.fn(),
}));

jest.mock('../../lib/powersync/lifecycle', () => ({
  setupPowerSync: jest.fn().mockResolvedValue(undefined),
  teardownPowerSync: jest.fn().mockResolvedValue(undefined),
  clearPowerSyncForNewUser: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../lib/powersync/system', () => ({
  powersync: {},
}));

jest.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
        error: null,
      }),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
        error: null,
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    })),
  },
}));

describe('Auth Gate Navigation (_layout.tsx)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    currentSegments = ['(tabs)', 'projects'];
  });

  it('issues exactly one navigation to /(auth)/login for a signed-out transition across multiple intermediate segment updates', async () => {
    // 1. Initial State: Authenticated user in (tabs)
    useAuthStore.setState({
      isInitialized: true,
      authMode: 'online',
      user: { id: 'test-user' } as any,
    });
    currentSegments = ['(tabs)', 'projects'];

    const { rerender } = await render(<RootLayout />);
    expect(mockReplace).not.toHaveBeenCalled();

    // 2. Sign-out occurs: authMode becomes 'signed-out' while segments is still ['(tabs)', 'projects']
    await act(async () => {
      useAuthStore.setState({
        authMode: 'signed-out',
        user: null,
      });
    });

    // router.replace should have been called ONCE for the initial sign-out
    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith('/(auth)/login');

    // 3. Segment update 1: asynchronous intermediate segment update from expo-router (e.g. root tabs)
    currentSegments = ['(tabs)'];
    await act(async () => {
      await rerender(<RootLayout />);
    });

    // Guard prevents duplicate replacement
    expect(mockReplace).toHaveBeenCalledTimes(1);

    // 4. Segment update 2: another asynchronous intermediate event before final route settling
    currentSegments = ['(tabs)', 'index'];
    await act(async () => {
      await rerender(<RootLayout />);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);

    // 5. Final segment update: route reaches ['(auth)', 'login']
    currentSegments = ['(auth)', 'login'];
    await act(async () => {
      await rerender(<RootLayout />);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
