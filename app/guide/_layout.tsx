import { Stack } from 'expo-router';

export default function GuideLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, // ✅ Hide header for all guide pages
      }}
    />
  );
}