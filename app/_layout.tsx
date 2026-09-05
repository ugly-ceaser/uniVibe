import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import FlashMessage from 'react-native-flash-message';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Keep the splash screen visible while we fetch resources
void SplashScreen.preventAutoHideAsync().catch(() => {});

function RootNavigator() {
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

  if (loading) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name='index' />

      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name='onboarding' />
        <Stack.Screen name='login' />
        <Stack.Screen name='register' />
        <Stack.Screen name='forgot-password' />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='course-detail' />
        <Stack.Screen name='create-post' />
        <Stack.Screen name='guide' />
        <Stack.Screen name='post-detail' />
        <Stack.Screen name='post/[id]' />
        <Stack.Screen name='profile' />
        <Stack.Screen name='request-courses' />
        <Stack.Screen name='submit-course' />
        <Stack.Screen name='tip-detail' />
      </Stack.Protected>

      <Stack.Screen name='+not-found' />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    'Inter-Medium': require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    'Inter-SemiBold': require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    'Inter-Bold': require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
    'Poppins-Regular': require('@expo-google-fonts/poppins/400Regular/Poppins_400Regular.ttf'),
    'Poppins-Medium': require('@expo-google-fonts/poppins/500Medium/Poppins_500Medium.ttf'),
    'Poppins-SemiBold': require('@expo-google-fonts/poppins/600SemiBold/Poppins_600SemiBold.ttf'),
    'Poppins-Bold': require('@expo-google-fonts/poppins/700Bold/Poppins_700Bold.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style='auto' />
        <FlashMessage position='bottom' />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
