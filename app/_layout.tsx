import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useEffect } from 'react';
import Purchases from 'react-native-purchases';
import { Platform } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';

export const unstable_settings = {
  anchor: '(tabs)',
};

// RevenueCat API Keys (Replace with your actual keys from RevenueCat Dashboard)
const API_KEY_APPLE = "appl_placeholder_key_here";
const API_KEY_GOOGLE = "goog_placeholder_key_here";

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    const initRevenueCat = async () => {
      try {
        Purchases.setLogLevel(Purchases.LOG_LEVEL.DEBUG);
        if (Platform.OS === 'ios') {
          Purchases.configure({ apiKey: API_KEY_APPLE });
        } else if (Platform.OS === 'android') {
          Purchases.configure({ apiKey: API_KEY_GOOGLE });
        }
      } catch (e) {
        console.error("Error initializing RevenueCat:", e);
      }
    };
    initRevenueCat();
  }, []);

  return (
    <ThemeProvider value={DarkTheme}>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
        </Stack>
        <StatusBar style="light" />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
