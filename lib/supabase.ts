/**
 * Supabase client singleton.
 *
 * Design rules:
 *  - Never crash the app if env vars are missing. `supabase` is a real client
 *    pointed at an invalid URL when unconfigured — but `isSupabaseConfigured`
 *    is `false`, so screens should check it before showing cloud features.
 *  - Use AsyncStorage as the auth session store on native; default cookie
 *    storage on web.
 *  - `react-native-url-polyfill/auto` MUST be imported before the supabase
 *    client to give RN a working `URL` global (required by the SDK).
 *
 * Usage:
 *   import { supabase, isSupabaseConfigured } from '@/lib/supabase';
 *   if (!isSupabaseConfigured) return <CloudUnconfiguredPlaceholder />;
 *   const { data } = await supabase.from('projects').select('*');
 */

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { env } from '../constants/env';
import type { Database } from '../types/db';

export const isSupabaseConfigured = env.supabase.isConfigured;

// When env vars are missing we still construct a client (with a placeholder
// URL) so type-safe callers don't need to handle a `null`. They should branch
// on `isSupabaseConfigured` before invoking any method. This keeps the type
// of the export non-nullable, which is much nicer for downstream code.
const url = env.supabase.url || 'https://placeholder.supabase.co';
const anonKey = env.supabase.anonKey || 'placeholder-anon-key';

export const supabase: SupabaseClient<Database> = createClient<Database>(
    url,
    anonKey,
    {
        auth: {
            // On web, leave storage undefined so the SDK uses cookies/localStorage.
            // On native, persist the session in AsyncStorage.
            storage: Platform.OS === 'web' ? undefined : AsyncStorage,
            autoRefreshToken: true,
            persistSession: true,
            // Required for native: don't try to detect the session from a URL,
            // because there's no `window.location` and the SDK warns about it.
            detectSessionInUrl: Platform.OS === 'web',
        },
    }
);
