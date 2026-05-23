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

export const unstable_settings = {
  anchor: '(tabs)',
};

// RevenueCat API Keys
// TODO: Move to .env via expo-constants for production
const REVENUECAT_API_KEY_APPLE = "appl_XPTkcAVgIUmYxQnXXZAVuuYpGfX";
const REVENUECAT_API_KEY_GOOGLE = "goog_placeholder_key_here"; // TODO: Replace with actual Play Store key

export default function RootLayout() {
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
    }
  }, [session, isInitialized, segments]);

  useEffect(() => {
    const initRevenueCat = async () => {
      // NOTE: isPremium is now persisted via Zustand — no need to force false.
      // RevenueCat listener will update it when entitlement status changes.
      try {
        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: REVENUECAT_API_KEY_APPLE });
        } else if (Platform.OS === 'android') {
          Purchases.configure({ apiKey: REVENUECAT_API_KEY_GOOGLE });
        }
        
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

  return (
    <ThemeProvider value={DarkTheme}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          <Stack.Screen name="ai-wizard" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
