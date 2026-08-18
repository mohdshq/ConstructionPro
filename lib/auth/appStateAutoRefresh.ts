import { AppStateStatus } from 'react-native';

export interface AutoRefreshClient {
  startAutoRefresh: () => void;
  stopAutoRefresh: () => void;
}

/**
 * Manages Supabase Auth auto-refresh based on React Native AppState changes.
 *
 * Rules:
 * - Next state === 'active':
 *   - If authenticated ('online' | 'offline-grace'): starts auto-refresh.
 *   - If unauthenticated ('signed-out'): stops auto-refresh (guarantees any lingering ticker from a previous session is halted).
 * - Next state !== 'active' (background, inactive, unknown): stops auto-refresh.
 */
export function handleAppStateAuthRefresh(
  nextAppState: AppStateStatus,
  currentAuthMode: 'online' | 'offline-grace' | 'signed-out',
  authClient: AutoRefreshClient
): void {
  if (nextAppState === 'active') {
    if (currentAuthMode !== 'signed-out') {
      authClient.startAutoRefresh();
    } else {
      authClient.stopAutoRefresh();
    }
  } else {
    authClient.stopAutoRefresh();
  }
}
