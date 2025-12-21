/**
 * Root Layout
 * Wraps entire app with Clerk and other providers
 */

import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { ClerkProvider, ClerkLoaded } from '@clerk/clerk-expo';
import { WSProvider } from '../src/context/WSProvider';
import { useUserStore } from '../src/store/userStore';
import { CLERK_PUBLISHABLE_KEY, tokenCache } from '../src/config/clerk';

export default function RootLayout() {
  const hydrate = useUserStore((state) => state.hydrate);

  // Hydrate stores from storage on app start
  useEffect(() => {
    const initializeStore = async () => {
      await hydrate();
    };
    initializeStore();
  }, []);

  return (
    <ClerkProvider
      publishableKey={CLERK_PUBLISHABLE_KEY}
      tokenCache={tokenCache}
    >
      <ClerkLoaded>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <SafeAreaProvider>
            <WSProvider>
              <StatusBar style="dark" />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'slide_from_right',
                }}
              >
                <Stack.Screen name="index" />
                <Stack.Screen name="auth/phone-login" />
                <Stack.Screen name="customer/home" />
                <Stack.Screen name="customer/liveRide" />
                <Stack.Screen name="rider/home" />
                <Stack.Screen name="rider/liveRide" />
              </Stack>
            </WSProvider>
          </SafeAreaProvider>
        </GestureHandlerRootView>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
