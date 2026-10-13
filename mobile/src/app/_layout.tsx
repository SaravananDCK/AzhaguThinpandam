import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useAuth } from '@/lib/auth-store';
import { queryClient } from '@/lib/query-client';
import { colors } from '@/lib/theme';

// Keep the splash up until the saved sign-in has been read, so the first
// screen never flashes "signed out" for a customer who is signed in.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const ready = useAuth((s) => s.ready);
  const restore = useAuth((s) => s.restore);

  useEffect(() => {
    restore();
  }, [restore]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerTintColor: colors.primary,
          headerTitleStyle: { color: colors.text },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="product/[slug]" options={{ title: '' }} />
        <Stack.Screen name="login" options={{ title: 'Sign in', presentation: 'modal' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
      </Stack>
    </QueryClientProvider>
  );
}
