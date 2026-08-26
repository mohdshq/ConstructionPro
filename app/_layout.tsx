import NetInfo from '@react-native-community/netinfo';
import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Purchases from 'react-native-purchases';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { OfflineBanner } from '@/components/OfflineBanner';
import { OfflineGraceBanner } from '@/components/OfflineGraceBanner';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEnrichmentWorker } from '@/lib/ai/useEnrichmentWorker';
import { handleAppStateAuthRefresh } from '@/lib/auth/appStateAutoRefresh';
import { isAuthServerRejection, saveLastSession } from '@/lib/auth/offlineSession';
import { clearPowerSyncForNewUser, setupPowerSync, teardownPowerSync } from '@/lib/powersync/lifecycle';
import { powersync } from '@/lib/powersync/system';
import { supabase } from '@/lib/supabase';
import { usePushNotifications } from '@/lib/usePushNotifications';
import { useAuthStore } from '@/store/useAuthStore';
import { useStore } from '@/store/useStore';
import { PowerSyncContext } from '@powersync/react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Sentry from '@sentry/react-native';
import { PostHogProvider } from 'posthog-react-native';

Sentry.init({
  dsn: process.env.EXPO_PUBLIC_SENTRY_DSN,
  environment: __DEV__ ? 'development' : 'production',
  enabled: !__DEV__ || process.env.EXPO_PUBLIC_SENTRY_FORCE_ENABLE === 'true',
  tracesSampleRate: 1.0,
  sendDefaultPii: false
});

function RootLayout() {
  const colorScheme = useColorScheme();
  const { setIsPremium } = useStore();

  const { isInitialized, session, offlineUser, authMode, initialize } = useAuthStore();

  // Track hydration of persisted Zustand stores
  const [isStoreHydrated, setIsStoreHydrated] = useState(() => {
    return useStore.persist.hasHydrated();
  });

  const syncedUserIdRef = useRef<string | null>(null);

  // Register for push notifications
  usePushNotifications();

  // Background AI enrichment worker for pending snags
  useEnrichmentWorker();

  // 1. Initialize Supabase Auth on mount
  useEffect(() => {
    initialize();
  }, []);

  // 2. Subscribe to Zustand store hydration completion
  useEffect(() => {
    const checkHydration = () => {
      if (useStore.persist.hasHydrated()) {
        setIsStoreHydrated(true);
      }
    };

    if (useStore.persist.hasHydrated()) {
      setIsStoreHydrated(true);
      return;
    }

    const unsubStore = useStore.persist.onFinishHydration(checkHydration);

    checkHydration();

    return () => {
      unsubStore();
    };
  }, []);

  // 4. NetInfo listener for offline-grace session refresh upon reconnect
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(async (state) => {
      const isOnline = state.isConnected && state.isInternetReachable !== false;
      const currentAuthMode = useAuthStore.getState().authMode;

      if (isOnline && currentAuthMode === 'offline-grace') {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            if (isAuthServerRejection(error)) {
              console.warn('[Auth] Refresh token rejected by server, signing out:', error.message);
              await teardownPowerSync(powersync);
              await useAuthStore.getState().signOut();
            } else {
              console.warn('[Auth] Transient error refreshing session, staying in offline-grace:', error.message);
            }
          } else if (data?.session?.user) {
            useAuthStore.setState({
              session: data.session,
              user: data.session.user,
              offlineUser: null,
              authMode: 'online',
            });
            await saveLastSession(data.session);
            useAuthStore.getState().refreshProfile();
            setupPowerSync(powersync).catch((err) => {
              console.warn('[PowerSync] Reconnect failed:', err?.message);
            });
          }
        } catch (e: any) {
          if (isAuthServerRejection(e)) {
            await teardownPowerSync(powersync);
            await useAuthStore.getState().signOut();
          } else {
            console.warn('[Auth] Exception during session refresh:', e);
          }
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // 5. PowerSync lifecycle — runs per user session
  useEffect(() => {
    if (!isInitialized || !isStoreHydrated) return;

    const currentUserId = session?.user?.id ?? offlineUser?.id ?? null;

    if (currentUserId && authMode !== 'signed-out') {
      if (syncedUserIdRef.current === currentUserId) {
        if (authMode === 'online') {
          setupPowerSync(powersync).catch((error) => {
            console.warn('[PowerSync] Connection failed:', error?.message);
          });
        }
        return;
      }
      syncedUserIdRef.current = currentUserId;

      const initPowerSync = async () => {
        const lastUserId = await AsyncStorage.getItem('last_powersync_user');

        const proceedWithSetup = async () => {
          await AsyncStorage.setItem('last_powersync_user', currentUserId);
          if (authMode === 'online') {
            setupPowerSync(powersync).catch((error) => {
              Sentry.captureException(error, {
                tags: { layer: 'powersync', event: 'startup_connect' },
                extra: { userId: currentUserId, message: error?.message },
              });
              console.warn('[PowerSync] Startup connection failed, running in local-only mode:', error?.message);
            });
          }
        };

        if (lastUserId && lastUserId !== currentUserId) {
          await clearPowerSyncForNewUser(
            powersync,
            proceedWithSetup,
            () => {
              // User canceled, sign out to prevent mixing data
              useAuthStore.getState().signOut();
              syncedUserIdRef.current = null;
            }
          );
        } else {
          await proceedWithSetup();
        }
      };

      initPowerSync();
    } else if (authMode === 'signed-out') {
      // Unauthenticated / signed out
      if (syncedUserIdRef.current !== null) {
        syncedUserIdRef.current = null;
        teardownPowerSync(powersync).catch((error) => {
          console.warn('[PowerSync] Teardown failed:', error?.message);
        });
      }
    }
  }, [isInitialized, isStoreHydrated, session?.user?.id, offlineUser?.id, authMode]);

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

  // 7. Manage Supabase token auto-refresh on AppState changes (B10)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      const currentAuthMode = useAuthStore.getState().authMode;
      handleAppStateAuthRefresh(state, currentAuthMode, supabase.auth);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!isInitialized || !isStoreHydrated) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  const analyticsEnabled = !__DEV__ || process.env.EXPO_PUBLIC_POSTHOG_FORCE_ENABLE === 'true';
  const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  const isAuthenticated = authMode !== 'signed-out';

  const appContent = (
    <PowerSyncContext.Provider value={powersync as any}>
      <ThemeProvider value={DarkTheme}>
        <SafeAreaProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={!isAuthenticated}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
            <Stack.Protected guard={isAuthenticated}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              <Stack.Screen name="ai-wizard" options={{ presentation: 'fullScreenModal', headerShown: false }} />
              <Stack.Screen name="project/[id]" />
              <Stack.Screen name="project/create" />
              <Stack.Screen name="project/[id]/activity" />
              <Stack.Screen name="project/[id]/team" />
              <Stack.Screen name="project/[id]/drawings/index" />
              <Stack.Screen name="project/[id]/drawings/[drawingId]" />
              <Stack.Screen name="project/[id]/report/create" />
              <Stack.Screen name="project/[id]/report/[reportId]" />
              <Stack.Screen name="project/[id]/snags/index" />
              <Stack.Screen name="project/[id]/snags/create" />
              <Stack.Screen name="project/[id]/snags/report" />
              <Stack.Screen name="project/[id]/snags/[snagId]" />
              <Stack.Screen name="settings" />
              <Stack.Screen name="daily-report" />
              <Stack.Screen name="quick-log" />
              <Stack.Screen name="saved-calculations" />
              <Stack.Screen name="converter" />
              <Stack.Screen name="asphalt-calculator" />
              <Stack.Screen name="block-calculator" />
              <Stack.Screen name="concrete-calculator" />
              <Stack.Screen name="duct-calculator" />
              <Stack.Screen name="dynamic-calculator" />
              <Stack.Screen name="hvac-calculator" />
              <Stack.Screen name="labor-calculator" />
              <Stack.Screen name="ohms-calculator" />
              <Stack.Screen name="pipe-calculator" />
              <Stack.Screen name="pour-calculator" />
              <Stack.Screen name="rebar-calculator" />
              <Stack.Screen name="soil-calculator" />
              <Stack.Screen name="stair-calculator" />
              <Stack.Screen name="tile-calculator" />
              <Stack.Screen name="voltage-calculator" />
            </Stack.Protected>
          </Stack>
          <OfflineBanner />
          <OfflineGraceBanner />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </ThemeProvider>
    </PowerSyncContext.Provider>
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      {(analyticsEnabled && posthogKey) ? (
        <PostHogProvider
          apiKey={posthogKey}
          options={{ host: process.env.EXPO_PUBLIC_POSTHOG_HOST }}
        >
          {appContent}
        </PostHogProvider>
      ) : appContent}
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);
