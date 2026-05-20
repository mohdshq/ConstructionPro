/**
 * Centralized, typed access to environment configuration.
 *
 * Why this module exists:
 *  - All `process.env.EXPO_PUBLIC_*` lookups happen here so the rest of the
 *    codebase imports a typed `env` object instead of scattering string
 *    literals.
 *  - Each value has an explicit fallback and an `isConfigured` flag so the
 *    app degrades gracefully when a key is missing (e.g. local dev without
 *    a Sentry DSN should not crash; the SDK simply becomes a no-op).
 *  - Anything sensitive (Gemini key, OpenWeather, Resend, etc.) MUST live
 *    server-side in Supabase Edge Functions and NEVER be added here.
 *
 * To configure, copy `.env.example` to `.env` and fill in the values.
 */

const read = (key: string): string =>
    (process.env[key] as string | undefined)?.trim() ?? '';

export const env = {
    supabase: {
        url: read('EXPO_PUBLIC_SUPABASE_URL'),
        anonKey: read('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
        get isConfigured() {
            return Boolean(this.url) && Boolean(this.anonKey);
        },
    },
    revenueCat: {
        iosKey: read('EXPO_PUBLIC_REVENUECAT_IOS_KEY'),
        androidKey: read('EXPO_PUBLIC_REVENUECAT_ANDROID_KEY'),
        isConfigured(platform: 'ios' | 'android' | 'web') {
            if (platform === 'ios') return Boolean(this.iosKey);
            if (platform === 'android') return Boolean(this.androidKey);
            return false;
        },
    },
    sentry: {
        dsn: read('EXPO_PUBLIC_SENTRY_DSN'),
        get isConfigured() {
            return Boolean(this.dsn);
        },
    },
    ai: {
        /**
         * Master switch for AI features. When `false`, the AI tab shows a
         * "coming soon" state and no network requests are made.
         * Defaults to `true` so production builds get AI by default; flip
         * to `false` in `.env` to disable locally.
         */
        enabled: read('EXPO_PUBLIC_AI_ENABLED') !== 'false',
    },
} as const;

export type Env = typeof env;
