/**
 * app/profile.tsx — Legacy backward-compatibility redirect.
 *
 * Old deep links / push notifications that point to /profile are forwarded
 * to /(tabs)/profile, preserving the optional `?edit=true` query param.
 *
 * Uses router.replace() inside useEffect so the redirect param is never
 * dropped by Expo Router's <Redirect> component on older SDK versions.
 */
import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';

export default function LegacyProfileRedirect() {
  const router = useRouter();
  const { edit } = useLocalSearchParams<{ edit?: string }>();

  useEffect(() => {
    if (edit === 'true') {
      router.replace({ pathname: '/(tabs)/profile', params: { edit: 'true' } });
    } else {
      router.replace('/(tabs)/profile');
    }
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
