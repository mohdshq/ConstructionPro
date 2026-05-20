/**
 * Thin RevenueCat wrapper.
 *
 * Responsibilities:
 *  - Configure RevenueCat lazily with the platform-appropriate key, but only
 *    when a key is actually available and we are not on web.
 *  - Provide a single `subscribe` helper that wires a callback to entitlement
 *    changes (initial fetch + live updates), with safe error handling.
 *
 * Why a wrapper?
 *  - RevenueCat's `Purchases` is a static singleton that throws if called on
 *    web or before configure(). Centralizing the platform/feature checks
 *    keeps screen code clean.
 *  - Lets us mock entitlements in dev / tests later without touching screens.
 */

import { Platform } from 'react-native';
import Purchases, { type CustomerInfo } from 'react-native-purchases';
import { env } from '../constants/env';
import { telemetry } from './telemetry';

const PREMIUM_ENTITLEMENT_ID = 'premium';

let configured = false;

function pickApiKey(): string | null {
    if (Platform.OS === 'ios') return env.revenueCat.iosKey || null;
    if (Platform.OS === 'android') return env.revenueCat.androidKey || null;
    return null; // web / unsupported
}

export const purchases = {
    /**
     * Idempotent configure. Returns `true` when RevenueCat is usable on this
     * device, `false` on web or when no key is set (caller should treat the
     * user as non-premium until a server-verified value is available).
     */
    configure(): boolean {
        if (configured) return true;
        const apiKey = pickApiKey();
        if (!apiKey) return false;

        try {
            Purchases.configure({ apiKey });
            configured = true;
            return true;
        } catch (err) {
            telemetry.captureException(err, { where: 'purchases.configure' });
            return false;
        }
    },

    /**
     * Subscribe to entitlement changes. Calls `onChange(isPremium)` once with
     * the initial value (after a network fetch) and again every time
     * RevenueCat reports a customer-info update.
     *
     * Returns an unsubscribe function — call it on component unmount.
     */
    subscribeEntitlement(onChange: (isPremium: boolean) => void): () => void {
        if (!configured) {
            // Tell the caller "not premium" so the UI is deterministic.
            onChange(false);
            return () => {};
        }

        const computeIsPremium = (info: CustomerInfo): boolean =>
            typeof info.entitlements.active[PREMIUM_ENTITLEMENT_ID] !==
            'undefined';

        // Initial fetch (network-backed; trustworthy answer).
        Purchases.getCustomerInfo()
            .then((info) => onChange(computeIsPremium(info)))
            .catch((err) => {
                telemetry.captureException(err, {
                    where: 'purchases.getCustomerInfo',
                });
                // Keep whatever the cached value was — don't downgrade users.
            });

        const listener = (info: CustomerInfo) =>
            onChange(computeIsPremium(info));
        Purchases.addCustomerInfoUpdateListener(listener);
        return () => Purchases.removeCustomerInfoUpdateListener(listener);
    },
};
