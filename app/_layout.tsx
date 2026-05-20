import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useStore } from '@/store/useStore';
import { telemetry } from '@/lib/telemetry';
import { purchases } from '@/lib/purchases';

export const unstable_settings = {
    anchor: '(tabs)',
};

export default function RootLayout() {
    const setIsPremium = useStore((s) => s.setIsPremium);

    // Initialize telemetry as early as possible so we capture init-time crashes.
    // Safe to call repeatedly (the wrapper is idempotent).
    useEffect(() => {
        telemetry.init();
    }, []);

    // Configure RevenueCat and subscribe to entitlement changes.
    //
    // IMPORTANT (bugfix v1.0.1): previously we did `setIsPremium(false)` on
    // every mount, which made paying users briefly lose Premium until the
    // network call resolved. We now trust the persisted value from the store
    // (the source of truth at cold start) and only update it when RevenueCat
    // gives us a new authoritative answer.
    useEffect(() => {
        const ok = purchases.configure();
        if (!ok) return; // web / no key configured — keep cached value

        const unsubscribe = purchases.subscribeEntitlement((isPremium) => {
            setIsPremium(isPremium);
        });
        return unsubscribe;
    }, [setIsPremium]);

    return (
        <ThemeProvider value={DarkTheme}>
            <SafeAreaProvider>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                    <Stack.Screen
                        name="modal"
                        options={{ presentation: 'modal', title: 'Modal' }}
                    />
                </Stack>
                <StatusBar style="light" />
            </SafeAreaProvider>
        </ThemeProvider>
    );
}
