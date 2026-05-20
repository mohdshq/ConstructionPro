/**
 * Telemetry: a thin wrapper around Sentry that no-ops when the SDK is not
 * configured (no DSN in env). This keeps the rest of the codebase clean — we
 * always call `telemetry.captureException(err)` without checking whether the
 * SDK is installed/configured.
 *
 * Why a wrapper instead of importing Sentry directly?
 *  - Lets us swap providers (Bugsnag, Crashlytics) without touching call sites.
 *  - Guarantees no telemetry is sent in development unless explicitly opted in.
 *  - Centralizes default tags (release, environment) and PII scrubbing.
 *
 * Initialize once, as early as possible, from the root `_layout.tsx`.
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';
import { env } from '../constants/env';

let initialized = false;

export const telemetry = {
    /**
     * Initialize Sentry. Safe to call multiple times — only the first call
     * actually configures the SDK. No-ops when DSN is missing.
     */
    init() {
        if (initialized) return;
        initialized = true;

        if (!env.sentry.isConfigured) {
            if (__DEV__) {
                 
                console.log('[telemetry] Sentry DSN not set — running in no-op mode.');
            }
            return;
        }

        Sentry.init({
            dsn: env.sentry.dsn,
            // Send fewer events in development.
            tracesSampleRate: __DEV__ ? 0 : 0.2,
            // Profile only a sample of traced transactions in production.
            profilesSampleRate: __DEV__ ? 0 : 0.1,
            // Filter PII at source — we do not need user IPs / cookies.
            sendDefaultPii: false,
            environment: __DEV__ ? 'development' : 'production',
            release:
                (Constants?.expoConfig?.version ?? '0.0.0') +
                '+' +
                (Constants?.expoConfig?.ios?.buildNumber ??
                    Constants?.expoConfig?.android?.versionCode ??
                    'dev'),
            // Scrub user-controlled free text in case it ever sneaks into breadcrumbs.
            beforeBreadcrumb(breadcrumb) {
                if (breadcrumb.category === 'console' && __DEV__) return null;
                return breadcrumb;
            },
        });
    },

    /** Identify the current user (call after login). Pass `null` to clear. */
    setUser(user: { id: string; email?: string } | null) {
        if (!initialized || !env.sentry.isConfigured) return;
        Sentry.setUser(user);
    },

    /** Log a handled exception (always prefer this over silent `try/catch`). */
    captureException(error: unknown, context?: Record<string, unknown>) {
        if (__DEV__) {
             
            console.error('[telemetry]', error, context);
        }
        if (!initialized || !env.sentry.isConfigured) return;
        if (context) {
            Sentry.withScope((scope) => {
                scope.setContext('extra', context);
                Sentry.captureException(error);
            });
        } else {
            Sentry.captureException(error);
        }
    },

    /** Log a structured message (for unexpected-but-non-throwing states). */
    captureMessage(
        message: string,
        level: 'info' | 'warning' | 'error' = 'info'
    ) {
        if (__DEV__) {
             
            console.log(`[telemetry:${level}]`, message);
        }
        if (!initialized || !env.sentry.isConfigured) return;
        Sentry.captureMessage(message, level);
    },

    /** Add a non-PII breadcrumb to the next event. */
    addBreadcrumb(breadcrumb: {
        category: string;
        message: string;
        data?: Record<string, unknown>;
        level?: 'info' | 'warning' | 'error';
    }) {
        if (!initialized || !env.sentry.isConfigured) return;
        Sentry.addBreadcrumb({
            category: breadcrumb.category,
            message: breadcrumb.message,
            data: breadcrumb.data,
            level: breadcrumb.level ?? 'info',
        });
    },
};
