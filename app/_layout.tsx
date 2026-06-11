import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, View, ActivityIndicator } from 'react-native';
import Purchases from 'react-native-purchases';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useStore } from '@/store/useStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProjectsStore } from '@/store/projectsStore';
import { useRealtimeSync } from '@/lib/useRealtimeSync';
import { usePushNotifications } from '@/lib/usePushNotifications';
import * as Sentry from '@sentry/react-native';
import { PostHogProvider } from 'posthog-react-native';
import { OfflineBanner } from '@/components/OfflineBanner';
import { PowerSyncContext } from '@powersync/react';
import { setupPowerSync, teardownPowerSync, powersync } from '@/lib/powersync/system';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_FORCE_ENABLE === 'true',
  tracesSampleRate: 1.0,
  sendDefaultPii: false
});

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayout() {
  const colorScheme = useColorScheme();
  const { setIsPremium } = useStore();
  
  const { isInitialized, session, initialize } = useAuthStore();
  const { initialSync } = useProjectsStore();
  const segments = useSegments();
  const router = useRouter();

  // Subscribe to Realtime changes when authenticated
  useRealtimeSync();

  // Register for push notifications
  usePushNotifications();

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      // Redirect to the login page
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      // Redirect away from the login page
      router.replace('/(tabs)');
    }

    // Sync data from Supabase when user is authenticated
    if (session && isInitialized) {
      initialSync();
      setupPowerSync().catch((e) =>
        console.warn('[PowerSync] connect failed:', e?.message)
      );
    }
    if (!session && isInitialized) {
      teardownPowerSync().catch((e) =>
        console.warn('[PowerSync] teardown failed:', e?.message)
      );
    }
  }, [session, isInitialized, segments]);

  useEffect(() => {
    const initRevenueCat = async () => {
      // Developer override for premium paywall
      if (__DEV__ && process.env.EXPO_PUBLIC_DEV_FORCE_PREMIUM === 'true') {
        console.warn("[DEV] Premium paywall bypassed via EXPO_PUBLIC_DEV_FORCE_PREMIUM=true");
        setIsPremium(true);
        return; // Skip actual RevenueCat initialization
      }

      // NOTE: isPremium is now persisted via Zustand — no need to force false.
      // RevenueCat listener will update it when entitlement status changes.
      try {
        const apiKey = Platform.OS === 'ios'
          ? process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS
          : process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID;

        if (!apiKey) {
          console.warn("[RevenueCat] Missing API key for iOS/Android — premium features will be unavailable");
          return;
        }

        Purchases.configure({ apiKey });
        
        // Initial check — updates persisted value if entitlement changed
        const customerInfo = await Purchases.getCustomerInfo();
        setIsPremium(typeof customerInfo.entitlements.active['premium'] !== "undefined");
        
        // Listen for future updates (purchase, expiry, restore)
        Purchases.addCustomerInfoUpdateListener((info) => {
            setIsPremium(typeof info.entitlements.active['premium'] !== "undefined");
        });
      } catch (e) {
        console.error("Error initializing RevenueCat:", e);
        // On error, keep the persisted isPremium value — don't reset to false
      }
    };
    initRevenueCat();
  }, []);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const analyticsEnabled = !__DEV__ || process.env.EXPO_PUBLIC_POSTHOG_FORCE_ENABLE === 'true';
  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  const appContent = (
    <PowerSyncContext.Provider value={powersync}>
      <ThemeProvider value={DarkTheme}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
            <Stack.Screen name="ai-wizard" options={{ presentation: 'fullScreenModal', headerShown: false }} />
          </Stack>
          <OfflineBanner />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </ThemeProvider>
    </PowerSyncContext.Provider>
  );

  return (analyticsEnabled && posthogKey) ? (
    <PostHogProvider 
      apiKey={posthogKey}
      options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST }}
    >
      {appContent}
    </PostHogProvider>
  ) : appContent;
}

export default Sentry.wrap(RootLayout);
