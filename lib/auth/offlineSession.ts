import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';

export const OFFLINE_SESSION_KEY = 'cp.auth.lastSession';
export const OFFLINE_PROFILE_KEY = 'cp.auth.lastProfile';
export const OFFLINE_GRACE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface OfflineSessionRecord {
  userId: string;
  email: string | null;
  fullName: string | null;
  savedAt: string; // ISO string
}

export interface OfflineProfileRecord {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  company: string | null;
  role: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export async function saveLastSession(session: Session | null): Promise<void> {
  if (!session?.user) return;
  const record: OfflineSessionRecord = {
    userId: session.user.id,
    email: session.user.email ?? null,
    fullName: session.user.user_metadata?.full_name ?? null,
    savedAt: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(record));
  } catch (e) {
    console.warn('[OfflineSession] Failed to save last session:', e);
  }
}

export async function readLastSession(): Promise<OfflineSessionRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineSessionRecord;
  } catch (e) {
    console.warn('[OfflineSession] Failed to read last session:', e);
    return null;
  }
}

export async function clearLastSession(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([OFFLINE_SESSION_KEY, OFFLINE_PROFILE_KEY]);
  } catch (e) {
    console.warn('[OfflineSession] Failed to clear last session:', e);
  }
}

export function isWithinGrace(
  record: OfflineSessionRecord | null | undefined,
  now: number = Date.now()
): boolean {
  if (!record?.savedAt) return false;
  const savedTime = new Date(record.savedAt).getTime();
  if (isNaN(savedTime)) return false;
  const elapsed = now - savedTime;
  return elapsed >= 0 && elapsed <= OFFLINE_GRACE_MS;
}

export async function saveLastProfile(profile: OfflineProfileRecord | null): Promise<void> {
  if (!profile) return;
  try {
    await AsyncStorage.setItem(OFFLINE_PROFILE_KEY, JSON.stringify(profile));
  } catch (e) {
    console.warn('[OfflineSession] Failed to save last profile:', e);
  }
}

export async function readLastProfile(): Promise<OfflineProfileRecord | null> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_PROFILE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OfflineProfileRecord;
  } catch (e) {
    console.warn('[OfflineSession] Failed to read last profile:', e);
    return null;
  }
}

export function isAuthServerRejection(error: any): boolean {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();

  // If it's a network error, it is NOT an auth server rejection
  if (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('fetcherror') ||
    message.includes('timeout') ||
    error.name === 'AuthRetryableFetchError'
  ) {
    return false;
  }

  // HTTP status from Supabase Auth
  if (error.status === 400 || error.status === 401 || error.status === 403) {
    return true;
  }

  // Explicit token invalidation messages
  if (
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    message.includes('refresh_token_not_found') ||
    message.includes('invalid_grant') ||
    message.includes('user not found') ||
    message.includes('token is expired') ||
    message.includes('session from session_id claim in jwt does not exist')
  ) {
    return true;
  }

  return false;
}
