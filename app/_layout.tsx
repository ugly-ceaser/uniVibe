import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider } from '@/contexts/AuthContext';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

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

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AuthProvider>
      <Stack>
        <Stack.Screen name='(tabs)' options={{ headerShown: false }} />
        <Stack.Screen name='login' options={{ headerShown: false }} />
        <Stack.Screen name='register' options={{ headerShown: false }} />
        <Stack.Screen name='onboarding' options={{ headerShown: false }} />
        <Stack.Screen name='course-detail' options={{ headerShown: false }} />
        <Stack.Screen name='post-detail' options={{ headerShown: false }} />
        <Stack.Screen name='tip-detail' options={{ headerShown: false }} />
        <Stack.Screen name='profile' options={{ headerShown: false }} />
        <Stack.Screen name='+not-found' options={{ title: 'Oops!' }} />
      </Stack>
      <StatusBar style='auto' />
    </AuthProvider>
  );
}
