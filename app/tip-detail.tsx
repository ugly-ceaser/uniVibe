import { Redirect, useLocalSearchParams } from 'expo-router';

export default function LegacyGuideRedirect() {
  const { tipId } = useLocalSearchParams<{ tipId?: string | string[] }>();
  const id = Array.isArray(tipId) ? tipId[0] : tipId;

  return id ? (
    <Redirect href={{ pathname: '/guide/[id]', params: { id } }} />
  ) : (
    <Redirect href='/(tabs)' />
  );
}
