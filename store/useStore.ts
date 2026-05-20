import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeType = 'light' | 'dark' | 'system';
export type UnitSystem = 'metric' | 'imperial';

interface AppState {
    theme: ThemeType;
    units: UnitSystem;
    userName: string;
    userPhoto: string | null;
    /**
     * @deprecated Kept only for backwards compatibility with v0 builds.
     * AI now goes through the backend proxy (no client-side key). Will be
     * removed once all installs are on >= v1.1.
     */
    aiApiKey: string;
    /**
     * Whether the user currently has a Premium entitlement (RevenueCat).
     * Source of truth is RevenueCat; we mirror it locally so the paywall
     * shows correctly on cold start before the network check completes.
     */
    isPremium: boolean;
    /** Timestamp (ms) of the last RevenueCat sync, used to decide if the
     *  mirrored value is fresh enough to trust at app launch. */
    isPremiumCheckedAt: number;

    setTheme: (theme: ThemeType) => void;
    setUnits: (units: UnitSystem) => void;
    setUserName: (name: string) => void;
    setUserPhoto: (photo: string | null) => void;
    setAiApiKey: (key: string) => void;
    setIsPremium: (isPremium: boolean) => void;
}

/**
 * Global app store (preferences + entitlement mirror).
 *
 * Note on `isPremium` (FIXED in v1.0.1):
 *   Previously the store forced `isPremium: false` on every rehydrate, which
 *   meant paying users briefly lost premium access on app launch — a bad
 *   UX (and brief feature flicker). We now persist the value and trust the
 *   last cached value until RevenueCat confirms the up-to-date entitlement.
 *   RevenueCat's `addCustomerInfoUpdateListener` in `app/_layout.tsx` is the
 *   ultimate source of truth and will correct it within seconds of launch.
 */
export const useStore = create<AppState>()(
    persist(
        (set) => ({
            theme: 'system',
            units: 'metric',
            userName: '',
            userPhoto: null,
            aiApiKey: '',
            isPremium: false,
            isPremiumCheckedAt: 0,

            setTheme: (theme) => set({ theme }),
            setUnits: (units) => set({ units }),
            setUserName: (userName) => set({ userName }),
            setUserPhoto: (userPhoto) => set({ userPhoto }),
            setAiApiKey: (aiApiKey) => set({ aiApiKey }),
            setIsPremium: (isPremium) =>
                set({ isPremium, isPremiumCheckedAt: Date.now() }),
        }),
        {
            name: 'app-storage',
            storage: createJSONStorage(() => AsyncStorage),
            version: 1,
            // Persist UI preferences AND the entitlement mirror (with timestamp).
            partialize: (state) => ({
                theme: state.theme,
                units: state.units,
                userName: state.userName,
                userPhoto: state.userPhoto,
                aiApiKey: state.aiApiKey,
                isPremium: state.isPremium,
                isPremiumCheckedAt: state.isPremiumCheckedAt,
            }),
            // Migrate from v0 (pre-v5 zustand) by simply trusting the saved
            // value and adding the new timestamp field if missing.
            migrate: (persistedState: any, version) => {
                if (!persistedState) return persistedState;
                if (version === 0) {
                    return {
                        ...persistedState,
                        // v0 had no timestamp; treat as stale (will refresh from RevenueCat).
                        isPremiumCheckedAt: 0,
                    };
                }
                return persistedState;
            },
        }
    )
);
